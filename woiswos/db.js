// Datenbank-Schicht für Woiswos. Nutzt das in Node 22 eingebaute SQLite
// (node:sqlite) - dadurch keine externen Abhängigkeiten nötig.
//
// Aufbau (angelehnt an klassische Lagerverwaltung, z. B. Dynamics AX):
//   places    Lagerplätze mit eigener Nummer ("100 01 03"). Zwei Arten:
//               'place' = fester Lagerplatz (Raum, Regal, Fach, Schublade)
//               'box'   = variabler Lagerplatz (Box, Kiste - lässt sich umlagern)
//             Plätze verschachteln sich über parent_id. Regel: ein fester
//             Lagerplatz liegt nie in einer Box.
//   articles  Artikelstamm (Nummer, Name, Einheit) - EINMAL pro Artikel.
//   stock     Bestand: wie viel von welchem Artikel liegt auf welchem Lagerplatz.
//   movements Lagerbuchungen (Einlagern / Umlagern / Ausbuchen) als Protokoll.
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS places (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name       TEXT    NOT NULL DEFAULT '',
  kind       TEXT    NOT NULL DEFAULT 'place',
  parent_id  INTEGER REFERENCES places(id) ON DELETE CASCADE,
  notes      TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_places_parent ON places(parent_id);

CREATE TABLE IF NOT EXISTS articles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name       TEXT    NOT NULL,
  unit       TEXT    NOT NULL DEFAULT 'Stk',
  notes      TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_articles_name ON articles(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS stock (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  place_id   INTEGER NOT NULL REFERENCES places(id)   ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (article_id, place_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_place ON stock(place_id);

-- Foto pro Lagerplatz ('place') oder Artikel ('article'): verkleinertes Vollbild + Miniatur (JPEG)
CREATE TABLE IF NOT EXISTS photos (
  entity    TEXT    NOT NULL,
  entity_id INTEGER NOT NULL,
  full      BLOB    NOT NULL,
  thumb     BLOB    NOT NULL,
  version   INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (entity, entity_id)
);
CREATE TRIGGER IF NOT EXISTS trg_places_photo_del AFTER DELETE ON places
  BEGIN DELETE FROM photos WHERE entity = 'place' AND entity_id = OLD.id; END;
CREATE TRIGGER IF NOT EXISTS trg_articles_photo_del AFTER DELETE ON articles
  BEGIN DELETE FROM photos WHERE entity = 'article' AND entity_id = OLD.id; END;

-- Protokoll aller Bestandsbewegungen. Namen werden als Text mitgespeichert,
-- damit der Verlauf auch nach dem Löschen eines Artikels/Platzes lesbar bleibt.
CREATE TABLE IF NOT EXISTS movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT    NOT NULL DEFAULT (datetime('now')),
  type       TEXT    NOT NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  article    TEXT    NOT NULL,
  from_place TEXT,
  to_place   TEXT,
  quantity   INTEGER NOT NULL,
  note       TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_movements_article ON movements(article_id);

-- Zähler für automatisch vergebene Nummern
CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  next INTEGER NOT NULL
);
`;

const PREFIX = { place: 'LP-', box: 'BOX-', article: 'ART-' };

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Inhalt des QR-Codes. Das Präfix macht eindeutig, ob ein Lagerplatz (P) oder
// ein Artikel (A) gemeint ist, auch wenn beide dieselbe Nummer tragen.
function qrPayload(type, code) {
  return (type === 'article' ? 'A:' : 'P:') + code;
}

function pad(n) {
  return String(n).padStart(4, '0');
}

// Alte Datenbank (Schritt 1/2: eine Tabelle "items") in das neue Modell überführen.
// Die alten Tabellen bleiben als legacy_* erhalten (automatisches Backup).
function migrateFromItems(db) {
  const exists = (n) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(n);
  if (!exists('items') || exists('legacy_items_v2')) return;
  const hasKind = db.prepare('PRAGMA table_info(items)').all().some((c) => c.name === 'kind');
  const oldPhotos = exists('photos') &&
    db.prepare('PRAGMA table_info(photos)').all().some((c) => c.name === 'item_id');

  db.exec('BEGIN');
  try {
    db.exec('ALTER TABLE items RENAME TO legacy_items_v2');
    if (oldPhotos) db.exec('ALTER TABLE photos RENAME TO legacy_photos_v2');
    db.exec(SCHEMA);

    const rows = db.prepare('SELECT * FROM legacy_items_v2 ORDER BY id').all();
    const kindOf = (r) => (hasKind ? r.kind : 'item');
    const containerIds = new Set(rows.filter((r) => kindOf(r) !== 'item').map((r) => r.id));
    // Frühere Version ohne "kind": alles, was etwas enthält, war ein Lagerplatz.
    if (!hasKind) rows.forEach((r) => { if (rows.some((c) => c.parent_id === r.id)) containerIds.add(r.id); });

    const nums = { place: 1, box: 1, article: 1 };
    const insPlace = db.prepare(
      'INSERT INTO places (id, code, name, kind, parent_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insArticle = db.prepare(
      'INSERT INTO articles (code, name, unit, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    const insStock = db.prepare('INSERT INTO stock (article_id, place_id, quantity) VALUES (?, ?, ?)');
    const insPhoto = db.prepare(
      'INSERT INTO photos (entity, entity_id, full, thumb, version) VALUES (?, ?, ?, ?, ?)');
    const oldPhoto = oldPhotos ? db.prepare('SELECT * FROM legacy_photos_v2 WHERE item_id = ?') : null;

    // Lagerplätze mit gleicher ID übernehmen, damit die Verschachtelung erhalten bleibt.
    for (const r of rows.filter((x) => containerIds.has(x.id))) {
      const kind = hasKind && r.kind === 'box' ? 'box' : 'place';
      const code = PREFIX[kind] + pad(nums[kind]++);
      insPlace.run(r.id, code, r.name, kind, r.parent_id, r.notes, r.created_at, r.updated_at);
      const ph = oldPhoto && oldPhoto.get(r.id);
      if (ph) insPhoto.run('place', r.id, ph.full, ph.thumb, ph.version);
    }
    // Artikel: jeder alte Artikel-Eintrag wird ein eigener Artikel mit Bestand an seinem Platz.
    for (const r of rows.filter((x) => !containerIds.has(x.id))) {
      const res = insArticle.run(PREFIX.article + pad(nums.article++), r.name, 'Stk', r.notes, r.created_at, r.updated_at);
      const aid = Number(res.lastInsertRowid);
      if (r.parent_id != null && r.quantity > 0) insStock.run(aid, r.parent_id, r.quantity);
      const ph = oldPhoto && oldPhoto.get(r.id);
      if (ph) insPhoto.run('article', aid, ph.full, ph.thumb, ph.version);
    }
    const setCounter = db.prepare('INSERT OR REPLACE INTO counters (name, next) VALUES (?, ?)');
    for (const k of Object.keys(nums)) setCounter.run(k, nums[k]);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function openStore(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  migrateFromItems(db);
  db.exec(SCHEMA);

  const q = {
    place: db.prepare('SELECT * FROM places WHERE id = ?'),
    placeByCode: db.prepare('SELECT * FROM places WHERE code = ?'),
    article: db.prepare('SELECT * FROM articles WHERE id = ?'),
    articleByCode: db.prepare('SELECT * FROM articles WHERE code = ?'),
    childPlaces: db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM places c WHERE c.parent_id = p.id) AS child_count,
        (SELECT COUNT(*) FROM stock s WHERE s.place_id = p.id)   AS stock_count
      FROM places p WHERE p.parent_id IS ?
      ORDER BY (p.kind = 'box'), p.code COLLATE NOCASE`),
    placePath: db.prepare(`
      WITH RECURSIVE up(id, parent_id, code, name, kind, depth) AS (
        SELECT id, parent_id, code, name, kind, 0 FROM places WHERE id = ?
        UNION ALL
        SELECT p.id, p.parent_id, p.code, p.name, p.kind, up.depth + 1
        FROM places p JOIN up ON p.id = up.parent_id
      )
      SELECT id, code, name, kind FROM up ORDER BY depth DESC`),
    subtree: db.prepare(`
      WITH RECURSIVE down(id) AS (
        SELECT id FROM places WHERE id = ?
        UNION ALL
        SELECT p.id FROM places p JOIN down ON p.parent_id = down.id
      )
      SELECT p.* FROM places p JOIN down ON p.id = down.id ORDER BY p.code COLLATE NOCASE`),
    stockOfPlace: db.prepare(`
      SELECT s.article_id, s.quantity, a.code, a.name, a.unit
      FROM stock s JOIN articles a ON a.id = s.article_id
      WHERE s.place_id = ? ORDER BY a.name COLLATE NOCASE`),
    stockOfArticle: db.prepare(`
      SELECT s.place_id, s.quantity FROM stock s
      JOIN places p ON p.id = s.place_id
      WHERE s.article_id = ? ORDER BY p.code COLLATE NOCASE`),
    stockLine: db.prepare('SELECT quantity FROM stock WHERE article_id = ? AND place_id = ?'),
    stockAdd: db.prepare(`
      INSERT INTO stock (article_id, place_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(article_id, place_id) DO UPDATE SET quantity = quantity + excluded.quantity`),
    stockSub: db.prepare('UPDATE stock SET quantity = quantity - ? WHERE article_id = ? AND place_id = ?'),
    stockDel: db.prepare('DELETE FROM stock WHERE article_id = ? AND place_id = ?'),
    stockTotal: db.prepare('SELECT COALESCE(SUM(quantity), 0) AS n, COUNT(*) AS lines FROM stock WHERE article_id = ?'),
    stockInSubtree: db.prepare(`
      WITH RECURSIVE down(id) AS (
        SELECT id FROM places WHERE id = ?
        UNION ALL
        SELECT p.id FROM places p JOIN down ON p.parent_id = down.id
      )
      SELECT s.article_id, s.place_id, s.quantity, a.name AS article, p.code AS place_code
      FROM stock s JOIN down d ON d.id = s.place_id
      JOIN articles a ON a.id = s.article_id JOIN places p ON p.id = s.place_id`),
    subtreeCount: db.prepare(`
      WITH RECURSIVE down(id) AS (
        SELECT id FROM places WHERE parent_id = ?
        UNION ALL
        SELECT p.id FROM places p JOIN down ON p.parent_id = down.id
      )
      SELECT COUNT(*) AS n FROM down`),
    placeKidsFixed: db.prepare("SELECT COUNT(*) AS n FROM places WHERE parent_id = ? AND kind = 'place'"),
    insPlace: db.prepare('INSERT INTO places (code, name, kind, parent_id, notes) VALUES (?, ?, ?, ?, ?)'),
    updPlace: db.prepare(`UPDATE places SET code = ?, name = ?, kind = ?, parent_id = ?, notes = ?,
      updated_at = datetime('now') WHERE id = ?`),
    delPlace: db.prepare('DELETE FROM places WHERE id = ?'),
    insArticle: db.prepare('INSERT INTO articles (code, name, unit, notes) VALUES (?, ?, ?, ?)'),
    updArticle: db.prepare(`UPDATE articles SET code = ?, name = ?, unit = ?, notes = ?,
      updated_at = datetime('now') WHERE id = ?`),
    delArticle: db.prepare('DELETE FROM articles WHERE id = ?'),
    listArticles: db.prepare(`
      SELECT a.*, COALESCE((SELECT SUM(quantity) FROM stock WHERE article_id = a.id), 0) AS total,
        (SELECT COUNT(*) FROM stock WHERE article_id = a.id) AS lines
      FROM articles a
      WHERE (? = '' OR a.name LIKE ? ESCAPE '\\' OR a.code LIKE ? ESCAPE '\\' OR a.notes LIKE ? ESCAPE '\\')
      ORDER BY a.name COLLATE NOCASE LIMIT 500`),
    searchPlaces: db.prepare(`
      SELECT * FROM places
      WHERE code LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\'
      ORDER BY code COLLATE NOCASE LIMIT 100`),
    photoInfo: db.prepare('SELECT version FROM photos WHERE entity = ? AND entity_id = ?'),
    photoGet: db.prepare('SELECT full, thumb FROM photos WHERE entity = ? AND entity_id = ?'),
    photoSet: db.prepare(`
      INSERT INTO photos (entity, entity_id, full, thumb) VALUES (?, ?, ?, ?)
      ON CONFLICT(entity, entity_id) DO UPDATE SET full = excluded.full, thumb = excluded.thumb,
        version = version + 1`),
    photoDel: db.prepare('DELETE FROM photos WHERE entity = ? AND entity_id = ?'),
    insMove: db.prepare(`INSERT INTO movements (type, article_id, article, from_place, to_place, quantity, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)`),
    history: db.prepare('SELECT * FROM movements WHERE article_id = ? ORDER BY id DESC LIMIT 30'),
    counterGet: db.prepare('SELECT next FROM counters WHERE name = ?'),
    counterSet: db.prepare('INSERT OR REPLACE INTO counters (name, next) VALUES (?, ?)'),
  };

  function tx(fn) {
    db.exec('BEGIN');
    try {
      const r = fn();
      db.exec('COMMIT');
      return r;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }

  // Menge abbuchen; eine auf 0 gesunkene Bestandszeile wird entfernt (CHECK quantity > 0).
  function stockTake(articleId, placeId, qty, have) {
    if (have === qty) q.stockDel.run(articleId, placeId);
    else q.stockSub.run(qty, articleId, placeId);
  }
  const pathOf = (id) => (id == null ? [] : q.placePath.all(id));
  const pathLabel = (id) => pathOf(id).map((p) => p.name || p.code).join(' › ');

  function photoFields(entity, id) {
    const ph = q.photoInfo.get(entity, id);
    return { has_photo: !!ph, photo_v: ph ? ph.version : 0 };
  }
  const decoratePlace = (row) => (row ? { ...row, ...photoFields('place', row.id), payload: qrPayload('place', row.code) } : row);
  const decorateArticle = (row) => (row ? { ...row, ...photoFields('article', row.id), payload: qrPayload('article', row.code) } : row);

  // ---- Eingaben prüfen ----
  function cleanCode(v) {
    const c = String(v ?? '').trim().replace(/\s+/g, ' ');
    if (c.length > 40) throw new HttpError(400, 'Nummer ist zu lang (max. 40 Zeichen)');
    if (!/^[A-Za-z0-9][A-Za-z0-9 _./-]*$/.test(c)) {
      throw new HttpError(400, 'Nummer darf nur Buchstaben (ohne Umlaute), Ziffern, Leerzeichen und - _ . / enthalten');
    }
    return c;
  }
  function nextCode(type) {
    const taken = (c) => (type === 'article' ? q.articleByCode.get(c) : q.placeByCode.get(c));
    let n = (q.counterGet.get(type) || { next: 1 }).next;
    let code;
    do { code = PREFIX[type] + pad(n++); } while (taken(code));
    q.counterSet.run(type, n);
    return code;
  }
  // Leere Nummer = automatisch fortlaufend. Boxen und Plätze teilen sich den Zähler-Namen je Art.
  function resolveCode(type, given, selfId) {
    if (given == null || String(given).trim() === '') return nextCode(type);
    const code = cleanCode(given);
    const hit = type === 'article' ? q.articleByCode.get(code) : q.placeByCode.get(code);
    if (hit && hit.id !== selfId) {
      throw new HttpError(409, `Die Nummer „${code}“ ist schon vergeben (${hit.name || hit.code}).`);
    }
    return code;
  }
  // Beim Bearbeiten bedeutet eine leere Nummer "unverändert lassen" (nicht "neu vergeben").
  const hasCode = (data) => 'code' in data && String(data.code ?? '').trim() !== '';
  function cleanName(v, required) {
    const name = typeof v === 'string' ? v.trim() : '';
    if (!name && required) throw new HttpError(400, 'Name darf nicht leer sein');
    if (name.length > 200) throw new HttpError(400, 'Name ist zu lang (max. 200 Zeichen)');
    return name;
  }
  function cleanNotes(v) {
    const notes = typeof v === 'string' ? v : '';
    if (notes.length > 5000) throw new HttpError(400, 'Notiz ist zu lang (max. 5000 Zeichen)');
    return notes;
  }
  function cleanUnit(v) {
    const u = typeof v === 'string' ? v.trim() : '';
    if (!u) return 'Stk';
    if (u.length > 12) throw new HttpError(400, 'Einheit ist zu lang (max. 12 Zeichen)');
    return u;
  }
  function cleanQty(v) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 1000000) {
      throw new HttpError(400, 'Menge muss eine ganze Zahl von 1 bis 1000000 sein');
    }
    return n;
  }
  function cleanKind(v) {
    if (v !== 'place' && v !== 'box') {
      throw new HttpError(400, 'Typ muss "place" (fester Lagerplatz) oder "box" (variabler Lagerplatz) sein');
    }
    return v;
  }
  function parentRow(v) {
    if (v == null || v === '') return null;
    const row = Number.isInteger(Number(v)) ? q.place.get(Number(v)) : null;
    if (!row) throw new HttpError(400, 'Zielort existiert nicht');
    return row;
  }
  function checkPlacement(kind, parent) {
    if (kind === 'place' && parent && parent.kind !== 'place') {
      throw new HttpError(400, 'Ein fester Lagerplatz kann nicht in einer Box liegen');
    }
  }
  function mustPlace(id) {
    const row = q.place.get(id);
    if (!row) throw new HttpError(404, 'Lagerplatz nicht gefunden');
    return row;
  }
  function mustArticle(id) {
    const row = q.article.get(id);
    if (!row) throw new HttpError(404, 'Artikel nicht gefunden');
    return row;
  }
  function parseJpeg(dataUrl, maxBytes, what) {
    const m = typeof dataUrl === 'string' && dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new HttpError(400, what + ' muss ein JPEG-Bild sein');
    const buf = Buffer.from(m[1], 'base64');
    if (!buf.length || buf.length > maxBytes) throw new HttpError(400, what + ' ist zu groß');
    return buf;
  }

  const store = {
    db,

    // ================= Lagerplätze =================
    // Inhalt eines Platzes (id = null -> oberste Ebene): Unterplätze + Bestand + Pfad.
    listPlace(id) {
      const place = id == null ? null : mustPlace(id);
      return {
        place: decoratePlace(place),
        path: pathOf(id),
        children: q.childPlaces.all(id ?? null).map(decoratePlace),
        stock: id == null ? [] : q.stockOfPlace.all(id).map((s) => ({
          ...s, ...photoFields('article', s.article_id),
        })),
      };
    },

    getPlace(id) {
      const row = mustPlace(id);
      return {
        ...decoratePlace(row),
        path: pathOf(row.parent_id),
        descendant_count: q.subtreeCount.get(id).n,
        stock_count: q.stockInSubtree.all(id).length,
      };
    },

    placeByCode(code) {
      const row = q.placeByCode.get(String(code || '').trim().replace(/\s+/g, ' '));
      if (!row) throw new HttpError(404, 'Kein Lagerplatz mit dieser Nummer');
      return this.getPlace(row.id);
    },

    createPlace(data) {
      const kind = data.kind === undefined ? 'place' : cleanKind(data.kind);
      const parent = parentRow(data.parent_id);
      checkPlacement(kind, parent);
      const name = cleanName(data.name, false);
      const notes = cleanNotes(data.notes);
      return tx(() => {
        const code = resolveCode(kind, data.code, null);
        const res = q.insPlace.run(code, name, kind, parent ? parent.id : null, notes);
        return this.getPlace(Number(res.lastInsertRowid));
      });
    },

    updatePlace(id, data) {
      const cur = mustPlace(id);
      const parent = 'parent_id' in data ? parentRow(data.parent_id) : (cur.parent_id == null ? null : q.place.get(cur.parent_id));
      // Zyklus verhindern: nicht in sich selbst oder den eigenen Inhalt verschieben.
      if (parent && pathOf(parent.id).some((p) => p.id === id)) {
        throw new HttpError(400, 'Ein Lagerplatz kann nicht in sich selbst oder seinen Inhalt verschoben werden');
      }
      const kind = 'kind' in data ? cleanKind(data.kind) : cur.kind;
      if (kind === 'box' && cur.kind === 'place' && q.placeKidsFixed.get(id).n > 0) {
        throw new HttpError(400, 'Dieser Lagerplatz enthält feste Lagerplätze und kann keine Box werden');
      }
      checkPlacement(kind, parent);
      const code = hasCode(data) ? resolveCode(kind, data.code, id) : cur.code;
      q.updPlace.run(
        code,
        'name' in data ? cleanName(data.name, false) : cur.name,
        kind,
        parent ? parent.id : null,
        'notes' in data ? cleanNotes(data.notes) : cur.notes,
        id);
      return this.getPlace(id);
    },

    // Löscht den Platz samt Unterplätzen und deren Bestand (wird im Protokoll vermerkt).
    removePlace(id) {
      const info = this.getPlace(id);
      return tx(() => {
        for (const s of q.stockInSubtree.all(id)) {
          q.insMove.run('remove', s.article_id, s.article, s.place_code, null, s.quantity, 'Lagerplatz gelöscht');
        }
        q.delPlace.run(id);
        return { deleted_places: 1 + info.descendant_count, deleted_stock_lines: info.stock_count };
      });
    },

    // Daten für Etiketten: ein Platz, optional samt allen Unterplätzen.
    placeLabels(id, deep) {
      const root = mustPlace(id);
      const rows = deep ? q.subtree.all(id) : [root];
      return rows.map((p) => ({
        type: 'place', id: p.id, code: p.code, name: p.name, kind: p.kind,
        payload: qrPayload('place', p.code), path: pathLabel(p.parent_id),
      }));
    },
    allPlaceLabels() {
      return db.prepare('SELECT * FROM places ORDER BY code COLLATE NOCASE').all().map((p) => ({
        type: 'place', id: p.id, code: p.code, name: p.name, kind: p.kind,
        payload: qrPayload('place', p.code), path: pathLabel(p.parent_id),
      }));
    },
    articleLabel(id) {
      const a = mustArticle(id);
      return [{ type: 'article', id: a.id, code: a.code, name: a.name, kind: 'article', payload: qrPayload('article', a.code), path: '' }];
    },

    // ================= Artikel =================
    listArticles(text) {
      const term = String(text || '').trim();
      const like = '%' + term.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
      return q.listArticles.all(term, like, like, like).map(decorateArticle);
    },

    getArticle(id) {
      const a = mustArticle(id);
      const tot = q.stockTotal.get(id);
      return {
        ...decorateArticle(a),
        total: tot.n,
        stock: q.stockOfArticle.all(id).map((s) => {
          const place = q.place.get(s.place_id);
          return { ...s, code: place.code, name: place.name, kind: place.kind, path: pathOf(s.place_id) };
        }),
        history: q.history.all(id),
      };
    },

    articleByCode(code) {
      const row = q.articleByCode.get(String(code || '').trim().replace(/\s+/g, ' '));
      if (!row) throw new HttpError(404, 'Kein Artikel mit dieser Nummer');
      return this.getArticle(row.id);
    },

    createArticle(data) {
      const name = cleanName(data.name, true);
      const unit = cleanUnit(data.unit);
      const notes = cleanNotes(data.notes);
      return tx(() => {
        const code = resolveCode('article', data.code, null);
        const res = q.insArticle.run(code, name, unit, notes);
        return this.getArticle(Number(res.lastInsertRowid));
      });
    },

    updateArticle(id, data) {
      const cur = mustArticle(id);
      const code = hasCode(data) ? resolveCode('article', data.code, id) : cur.code;
      q.updArticle.run(
        code,
        'name' in data ? cleanName(data.name, true) : cur.name,
        'unit' in data ? cleanUnit(data.unit) : cur.unit,
        'notes' in data ? cleanNotes(data.notes) : cur.notes,
        id);
      return this.getArticle(id);
    },

    removeArticle(id) {
      const info = this.getArticle(id);
      q.delArticle.run(id);
      return { deleted_stock_lines: info.stock.length };
    },

    // ================= Bestand / Buchungen =================
    // Einlagern: Menge eines Artikels auf einen Lagerplatz buchen.
    put({ article_id, place_id, quantity, note }) {
      const a = mustArticle(Number(article_id));
      const p = mustPlace(Number(place_id));
      const qty = cleanQty(quantity);
      tx(() => {
        q.stockAdd.run(a.id, p.id, qty);
        q.insMove.run('put', a.id, a.name, null, p.code, qty, cleanNotes(note));
      });
      return this.getArticle(a.id);
    },

    // Umlagern: Menge von einem Lagerplatz auf einen anderen.
    move({ article_id, from_place_id, to_place_id, quantity, note }) {
      const a = mustArticle(Number(article_id));
      const from = mustPlace(Number(from_place_id));
      const to = mustPlace(Number(to_place_id));
      const qty = cleanQty(quantity);
      if (from.id === to.id) throw new HttpError(400, 'Quelle und Ziel sind derselbe Lagerplatz');
      const line = q.stockLine.get(a.id, from.id);
      if (!line || line.quantity < qty) {
        throw new HttpError(400, `Auf „${from.code}“ liegen nur ${line ? line.quantity : 0} ${a.unit}`);
      }
      tx(() => {
        stockTake(a.id, from.id, qty, line.quantity);
        q.stockAdd.run(a.id, to.id, qty);
        q.insMove.run('move', a.id, a.name, from.code, to.code, qty, cleanNotes(note));
      });
      return this.getArticle(a.id);
    },

    // Ausbuchen: Menge ist verbraucht, verschenkt, verloren ...
    remove({ article_id, place_id, quantity, note }) {
      const a = mustArticle(Number(article_id));
      const p = mustPlace(Number(place_id));
      const qty = cleanQty(quantity);
      const line = q.stockLine.get(a.id, p.id);
      if (!line || line.quantity < qty) {
        throw new HttpError(400, `Auf „${p.code}“ liegen nur ${line ? line.quantity : 0} ${a.unit}`);
      }
      tx(() => {
        stockTake(a.id, p.id, qty, line.quantity);
        q.insMove.run('remove', a.id, a.name, p.code, null, qty, cleanNotes(note));
      });
      return this.getArticle(a.id);
    },

    // ================= Suche =================
    search(text) {
      const term = String(text || '').trim();
      if (!term) return { places: [], articles: [] };
      const like = '%' + term.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
      return {
        places: q.searchPlaces.all(like, like, like).map((p) => ({
          ...decoratePlace(p), path: pathOf(p.parent_id),
        })),
        articles: this.listArticles(term).slice(0, 100).map((a) => ({
          ...a,
          where: q.stockOfArticle.all(a.id).slice(0, 3).map((s) => {
            const place = q.place.get(s.place_id);
            return { place_id: place.id, quantity: s.quantity, path: pathOf(place.id) };
          }),
        })),
      };
    },

    // ================= Fotos =================
    setPhoto(entity, id, data) {
      if (entity === 'place') mustPlace(id); else mustArticle(id);
      const full = parseJpeg(data.full, 2 * 1024 * 1024, 'Foto');
      const thumb = parseJpeg(data.thumb, 100 * 1024, 'Miniatur');
      q.photoSet.run(entity, id, full, thumb);
      return entity === 'place' ? this.getPlace(id) : this.getArticle(id);
    },
    getPhoto(entity, id, size) {
      const row = q.photoGet.get(entity, id);
      if (!row) throw new HttpError(404, 'Kein Foto vorhanden');
      return size === 'thumb' ? row.thumb : row.full;
    },
    removePhoto(entity, id) {
      if (entity === 'place') mustPlace(id); else mustArticle(id);
      q.photoDel.run(entity, id);
      return entity === 'place' ? this.getPlace(id) : this.getArticle(id);
    },
  };
  return store;
}

module.exports = { openStore, HttpError, qrPayload };
