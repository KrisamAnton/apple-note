// Datenbank-Schicht für Woiswos. Nutzt das in Node 22 eingebaute SQLite
// (node:sqlite) - dadurch keine externen Abhängigkeiten nötig.
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Grundprinzip: Es gibt nur EINE Tabelle. Lagerplätze (Raum, Regal, Fach,
// Schachtel, Box) und Artikel (Schalter, Schaukelhaken) sind alle "Einträge".
// kind = 'place' (fester Lagerplatz: Raum, Regal, Schublade),
//        'box'   (variabler Lagerplatz: Box, Kiste, Schachtel - lässt sich umlagern) oder
//        'item'  (Artikel). Plätze und Boxen können etwas enthalten.
// Jeder Eintrag liegt über parent_id in einem Lagerplatz oder einer Box.
// Regel: Ein fester Lagerplatz liegt nie in einer Box.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id  INTEGER REFERENCES items(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  kind       TEXT    NOT NULL DEFAULT 'item',
  quantity   INTEGER NOT NULL DEFAULT 1,
  notes      TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent_id);
CREATE INDEX IF NOT EXISTS idx_items_name   ON items(name COLLATE NOCASE);
-- Foto pro Eintrag: verkleinertes Vollbild + Miniatur (beides JPEG)
CREATE TABLE IF NOT EXISTS photos (
  item_id INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  full    BLOB    NOT NULL,
  thumb   BLOB    NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
`;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Fester Code für spätere Etiketten/QR-Codes, z. B. W-000042.
function codeFor(id) {
  return 'W-' + String(id).padStart(6, '0');
}

function openStore(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  // Migration: Datenbanken aus Schritt 1 kennen "kind" noch nicht. Alles, was
  // bereits etwas enthält, wird dabei zum Lagerplatz, der Rest zum Artikel.
  if (!db.prepare('PRAGMA table_info(items)').all().some((c) => c.name === 'kind')) {
    db.exec(`ALTER TABLE items ADD COLUMN kind TEXT NOT NULL DEFAULT 'item';
      UPDATE items SET kind = 'place'
        WHERE id IN (SELECT DISTINCT parent_id FROM items WHERE parent_id IS NOT NULL);`);
  }

  const q = {
    get: db.prepare('SELECT * FROM items WHERE id = ?'),
    children: db.prepare(`
      SELECT i.*, (SELECT COUNT(*) FROM items c WHERE c.parent_id = i.id) AS child_count
      FROM items i WHERE i.parent_id IS ?
      ORDER BY (i.kind = 'item'), (i.kind = 'box'), i.name COLLATE NOCASE`),
    path: db.prepare(`
      WITH RECURSIVE up(id, parent_id, name, kind, depth) AS (
        SELECT id, parent_id, name, kind, 0 FROM items WHERE id = ?
        UNION ALL
        SELECT i.id, i.parent_id, i.name, i.kind, up.depth + 1
        FROM items i JOIN up ON i.id = up.parent_id
      )
      SELECT id, name, kind FROM up ORDER BY depth DESC`),
    photoInfo: db.prepare('SELECT version FROM photos WHERE item_id = ?'),
    photoGet: db.prepare('SELECT full, thumb, version FROM photos WHERE item_id = ?'),
    photoSet: db.prepare(`
      INSERT INTO photos (item_id, full, thumb) VALUES (?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET full = excluded.full, thumb = excluded.thumb,
        version = version + 1`),
    photoDel: db.prepare('DELETE FROM photos WHERE item_id = ?'),
    placeChildren: db.prepare("SELECT COUNT(*) AS n FROM items WHERE parent_id = ? AND kind = 'place'"),
    descendantCount: db.prepare(`
      WITH RECURSIVE down(id) AS (
        SELECT id FROM items WHERE parent_id = ?
        UNION ALL
        SELECT i.id FROM items i JOIN down ON i.parent_id = down.id
      )
      SELECT COUNT(*) AS n FROM down`),
    search: db.prepare(`
      SELECT id, parent_id, name, kind, quantity, notes FROM items
      WHERE name LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\'
      ORDER BY name COLLATE NOCASE LIMIT 100`),
    insert: db.prepare(
      'INSERT INTO items (parent_id, name, kind, quantity, notes) VALUES (?, ?, ?, ?, ?)'),
    update: db.prepare(`
      UPDATE items SET parent_id = ?, name = ?, kind = ?, quantity = ?, notes = ?,
        updated_at = datetime('now') WHERE id = ?`),
    remove: db.prepare('DELETE FROM items WHERE id = ?'),
  };

  const decorate = (row) => {
    if (!row) return row;
    const ph = q.photoInfo.get(row.id);
    return { ...row, code: codeFor(row.id), has_photo: !!ph, photo_v: ph ? ph.version : 0 };
  };
  const pathOf = (id) => (id == null ? [] : q.path.all(id));

  function cleanName(v) {
    const name = typeof v === 'string' ? v.trim() : '';
    if (!name) throw new HttpError(400, 'Name darf nicht leer sein');
    if (name.length > 200) throw new HttpError(400, 'Name ist zu lang (max. 200 Zeichen)');
    return name;
  }
  function cleanKind(v) {
    if (v !== 'place' && v !== 'box' && v !== 'item') {
      throw new HttpError(400, 'Typ muss "place" (fester Lagerplatz), "box" (variabler Lagerplatz) oder "item" (Artikel) sein');
    }
    return v;
  }
  // Liefert die Zeile des Zielortes (oder null für die oberste Ebene).
  function cleanParent(v) {
    if (v == null || v === '') return null;
    const id = Number(v);
    const row = Number.isInteger(id) ? q.get.get(id) : null;
    if (!row) throw new HttpError(400, 'Zielort existiert nicht');
    if (row.kind === 'item') throw new HttpError(400, 'Das Ziel ist ein Artikel, kein Lagerplatz');
    return row;
  }
  function checkPlacement(kind, parentRow) {
    if (kind === 'place' && parentRow && parentRow.kind !== 'place') {
      throw new HttpError(400, 'Ein fester Lagerplatz kann nicht in einer Box liegen');
    }
  }
  function parseJpeg(dataUrl, maxBytes, what) {
    const m = typeof dataUrl === 'string' && dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new HttpError(400, what + ' muss ein JPEG-Bild sein');
    const buf = Buffer.from(m[1], 'base64');
    if (!buf.length || buf.length > maxBytes) throw new HttpError(400, what + ' ist zu groß');
    return buf;
  }
  function cleanQuantity(v) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 1000000) {
      throw new HttpError(400, 'Menge muss eine ganze Zahl von 0 bis 1000000 sein');
    }
    return n;
  }
  function cleanNotes(v) {
    const notes = typeof v === 'string' ? v : '';
    if (notes.length > 5000) throw new HttpError(400, 'Notiz ist zu lang (max. 5000 Zeichen)');
    return notes;
  }
  return {
    db,

    // Inhalt eines Ortes (parentId = null -> oberste Ebene) samt Pfad.
    list(parentId) {
      if (parentId != null && !q.get.get(parentId)) throw new HttpError(404, 'Eintrag nicht gefunden');
      return {
        item: parentId == null ? null : decorate(q.get.get(parentId)),
        path: pathOf(parentId),
        children: q.children.all(parentId ?? null).map(decorate),
      };
    },

    get(id) {
      const row = q.get.get(id);
      if (!row) throw new HttpError(404, 'Eintrag nicht gefunden');
      return {
        ...decorate(row),
        path: pathOf(row.parent_id),
        descendant_count: q.descendantCount.get(id).n,
      };
    },

    create(data) {
      const parent = cleanParent(data.parent_id);
      const kind = data.kind === undefined ? 'item' : cleanKind(data.kind);
      checkPlacement(kind, parent);
      const res = q.insert.run(
        parent ? parent.id : null,
        cleanName(data.name),
        kind,
        data.quantity === undefined ? 1 : cleanQuantity(data.quantity),
        cleanNotes(data.notes));
      return this.get(Number(res.lastInsertRowid));
    },

    update(id, data) {
      const cur = q.get.get(id);
      if (!cur) throw new HttpError(404, 'Eintrag nicht gefunden');
      const parent = 'parent_id' in data ? cleanParent(data.parent_id) : (cur.parent_id == null ? null : q.get.get(cur.parent_id));
      // Zyklus verhindern: ein Eintrag darf nicht in sich selbst oder in
      // einem seiner eigenen Unterelemente landen.
      if (parent != null && pathOf(parent.id).some((p) => p.id === id)) {
        throw new HttpError(400, 'Ein Eintrag kann nicht in sich selbst oder seinen Inhalt verschoben werden');
      }
      const kind = 'kind' in data ? cleanKind(data.kind) : cur.kind;
      if (kind === 'item' && cur.kind !== 'item' && q.descendantCount.get(id).n > 0) {
        throw new HttpError(400, 'Dieser Lagerplatz enthält noch etwas und kann kein Artikel werden');
      }
      if (kind === 'box' && cur.kind === 'place' && q.placeChildren.get(id).n > 0) {
        throw new HttpError(400, 'Dieser Lagerplatz enthält feste Lagerplätze und kann keine Box werden');
      }
      checkPlacement(kind, parent);
      q.update.run(
        parent ? parent.id : null,
        'name' in data ? cleanName(data.name) : cur.name,
        kind,
        'quantity' in data ? cleanQuantity(data.quantity) : cur.quantity,
        'notes' in data ? cleanNotes(data.notes) : cur.notes,
        id);
      return this.get(id);
    },

    // ---- Fotos ----
    setPhoto(id, data) {
      if (!q.get.get(id)) throw new HttpError(404, 'Eintrag nicht gefunden');
      const full = parseJpeg(data.full, 2 * 1024 * 1024, 'Foto');
      const thumb = parseJpeg(data.thumb, 100 * 1024, 'Miniatur');
      q.photoSet.run(id, full, thumb);
      return this.get(id);
    },
    getPhoto(id, size) {
      const row = q.photoGet.get(id);
      if (!row) throw new HttpError(404, 'Kein Foto vorhanden');
      return size === 'thumb' ? row.thumb : row.full;
    },
    removePhoto(id) {
      if (!q.get.get(id)) throw new HttpError(404, 'Eintrag nicht gefunden');
      q.photoDel.run(id);
      return this.get(id);
    },

    remove(id) {
      const info = this.get(id);
      q.remove.run(id); // Inhalt wird per ON DELETE CASCADE mitgelöscht
      return { deleted: 1 + info.descendant_count };
    },

    search(text) {
      const term = String(text || '').trim();
      if (!term) return [];
      const like = '%' + term.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
      return q.search.all(like, like).map((row) => ({
        ...decorate(row),
        path: pathOf(row.parent_id),
      }));
    },
  };
}

module.exports = { openStore, HttpError, codeFor };
