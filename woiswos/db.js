// Datenbank-Schicht für Woiswos. Nutzt das in Node 22 eingebaute SQLite
// (node:sqlite) - dadurch keine externen Abhängigkeiten nötig.
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Grundprinzip: Es gibt nur EINE Tabelle. Lagerplätze (Raum, Regal, Fach,
// Schachtel, Box) und Artikel (Schalter, Schaukelhaken) sind alle "Einträge".
// kind = 'place' (Lagerplatz, kann etwas enthalten) oder 'item' (Artikel).
// Jeder Eintrag liegt über parent_id in einem Lagerplatz.
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
      ORDER BY (i.kind = 'place') DESC, i.name COLLATE NOCASE`),
    path: db.prepare(`
      WITH RECURSIVE up(id, parent_id, name, depth) AS (
        SELECT id, parent_id, name, 0 FROM items WHERE id = ?
        UNION ALL
        SELECT i.id, i.parent_id, i.name, up.depth + 1
        FROM items i JOIN up ON i.id = up.parent_id
      )
      SELECT id, name FROM up ORDER BY depth DESC`),
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

  const decorate = (row) => (row ? { ...row, code: codeFor(row.id) } : row);
  const pathOf = (id) => (id == null ? [] : q.path.all(id));

  function cleanName(v) {
    const name = typeof v === 'string' ? v.trim() : '';
    if (!name) throw new HttpError(400, 'Name darf nicht leer sein');
    if (name.length > 200) throw new HttpError(400, 'Name ist zu lang (max. 200 Zeichen)');
    return name;
  }
  function cleanKind(v) {
    if (v !== 'place' && v !== 'item') throw new HttpError(400, 'Typ muss "place" (Lagerplatz) oder "item" (Artikel) sein');
    return v;
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
  function cleanParent(v) {
    if (v == null || v === '') return null;
    const id = Number(v);
    const row = Number.isInteger(id) ? q.get.get(id) : null;
    if (!row) throw new HttpError(400, 'Zielort existiert nicht');
    if (row.kind !== 'place') throw new HttpError(400, 'Das Ziel ist ein Artikel, kein Lagerplatz');
    return id;
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
      const res = q.insert.run(
        parent,
        cleanName(data.name),
        data.kind === undefined ? 'item' : cleanKind(data.kind),
        data.quantity === undefined ? 1 : cleanQuantity(data.quantity),
        cleanNotes(data.notes));
      return this.get(Number(res.lastInsertRowid));
    },

    update(id, data) {
      const cur = q.get.get(id);
      if (!cur) throw new HttpError(404, 'Eintrag nicht gefunden');
      const parent = 'parent_id' in data ? cleanParent(data.parent_id) : cur.parent_id;
      // Zyklus verhindern: ein Eintrag darf nicht in sich selbst oder in
      // einem seiner eigenen Unterelemente landen.
      if (parent != null && pathOf(parent).some((p) => p.id === id)) {
        throw new HttpError(400, 'Ein Eintrag kann nicht in sich selbst oder seinen Inhalt verschoben werden');
      }
      const kind = 'kind' in data ? cleanKind(data.kind) : cur.kind;
      if (kind === 'item' && cur.kind === 'place' && q.descendantCount.get(id).n > 0) {
        throw new HttpError(400, 'Dieser Lagerplatz enthält noch etwas und kann kein Artikel werden');
      }
      q.update.run(
        parent,
        'name' in data ? cleanName(data.name) : cur.name,
        kind,
        'quantity' in data ? cleanQuantity(data.quantity) : cur.quantity,
        'notes' in data ? cleanNotes(data.notes) : cur.notes,
        id);
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
