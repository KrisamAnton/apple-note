const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openStore } = require('./db');
const { makeServer } = require('./server');

test('Verschachtelung, Pfad, Verschieben, Löschen', () => {
  const s = openStore(':memory:');
  const regal = s.create({ name: 'Regal 1', kind: 'place' });
  const schachtel = s.create({ name: 'Schachtel A', kind: 'place', parent_id: regal.id });
  const box = s.create({ name: 'Box blau', kind: 'place', parent_id: schachtel.id });
  const schalter = s.create({ name: 'Schalter', parent_id: box.id, quantity: 3 });

  const got = s.get(schalter.id);
  assert.deepStrictEqual(got.path.map((p) => p.name), ['Regal 1', 'Schachtel A', 'Box blau']);
  assert.strictEqual(got.quantity, 3);
  assert.strictEqual(got.code, 'W-' + String(schalter.id).padStart(6, '0'));
  assert.strictEqual(s.get(regal.id).descendant_count, 3);

  // Box umlagern nimmt den Inhalt mit
  const regal2 = s.create({ name: 'Regal 2', kind: 'place' });
  s.update(box.id, { parent_id: regal2.id });
  assert.deepStrictEqual(s.get(schalter.id).path.map((p) => p.name), ['Regal 2', 'Box blau']);

  // Zyklen verboten
  assert.throws(() => s.update(regal2.id, { parent_id: box.id }), /nicht in sich selbst/);
  assert.throws(() => s.update(regal2.id, { parent_id: regal2.id }), /nicht in sich selbst/);

  // Suche zeigt den ganzen Pfad
  const hit = s.search('schalt');
  assert.strictEqual(hit.length, 1);
  assert.deepStrictEqual(hit[0].path.map((p) => p.name), ['Regal 2', 'Box blau']);
  assert.strictEqual(s.search('%').length, 0);

  // Löschen kaskadiert
  assert.strictEqual(s.remove(regal2.id).deleted, 3);
  assert.throws(() => s.get(schalter.id), /nicht gefunden/);
  assert.strictEqual(s.list(null).children.length, 1);
});

test('Lagerplatz und Artikel', () => {
  const s = openStore(':memory:');
  const regal = s.create({ name: 'Regal', kind: 'place' });
  const haken = s.create({ name: 'Haken', parent_id: regal.id });
  assert.strictEqual(haken.kind, 'item'); // Standard ist Artikel
  // In einen Artikel kann nichts gelegt werden
  assert.throws(() => s.create({ name: 'x', parent_id: haken.id }), /kein Lagerplatz/);
  assert.throws(() => s.update(regal.id, { parent_id: haken.id }), /kein Lagerplatz/);
  // Lagerplätze stehen in der Liste vor Artikeln
  s.create({ name: 'Aaa Artikel', parent_id: regal.id });
  s.create({ name: 'Zzz Fach', kind: 'place', parent_id: regal.id });
  assert.deepStrictEqual(s.list(regal.id).children.map((c) => c.name), ['Zzz Fach', 'Aaa Artikel', 'Haken']);
  // Gefüllter Lagerplatz kann kein Artikel werden
  assert.throws(() => s.update(regal.id, { kind: 'item' }), /enthält noch etwas/);
  assert.strictEqual(s.update(haken.id, { kind: 'place' }).kind, 'place');
  assert.throws(() => s.create({ name: 'x', kind: 'foo' }), /Typ/);
});

test('Feste Lagerplätze und variable Boxen', () => {
  const s = openStore(':memory:');
  const regal = s.create({ name: 'Regal', kind: 'place' });
  const fach = s.create({ name: 'Fach 1', kind: 'place', parent_id: regal.id });
  const box = s.create({ name: 'Kiste', kind: 'box', parent_id: fach.id });
  const inner = s.create({ name: 'Beutel', kind: 'box', parent_id: box.id });
  s.create({ name: 'Schalter', parent_id: inner.id });
  // Box darf in Box, fester Platz aber nicht in eine Box
  assert.throws(() => s.create({ name: 'Fach X', kind: 'place', parent_id: box.id }), /nicht in einer Box/);
  const regal2 = s.create({ name: 'Regal 2', kind: 'place' });
  assert.throws(() => s.update(regal2.id, { parent_id: inner.id }), /nicht in einer Box/);
  // Box darf auf oberster Ebene liegen und umgelagert werden
  const moved = s.update(box.id, { parent_id: null });
  assert.strictEqual(moved.path.length, 0);
  assert.deepStrictEqual(s.search('Schalter')[0].path.map((p) => p.name), ['Kiste', 'Beutel']);
  assert.deepStrictEqual(s.search('Schalter')[0].path.map((p) => p.kind), ['box', 'box']);
  // Feste Plätze zuerst, dann Boxen, dann Artikel
  s.create({ name: 'AAA Ding', parent_id: fach.id });
  s.create({ name: 'ZZZ Box', kind: 'box', parent_id: fach.id });
  s.create({ name: 'MMM Platz', kind: 'place', parent_id: fach.id });
  assert.deepStrictEqual(s.list(fach.id).children.map((c) => c.name), ['MMM Platz', 'ZZZ Box', 'AAA Ding']);
  // Platz mit festen Unterplätzen kann keine Box werden
  assert.throws(() => s.update(fach.id, { kind: 'box' }), /feste Lagerplätze/);
});

test('Fotos', () => {
  const s = openStore(':memory:');
  const box = s.create({ name: 'Kiste', kind: 'box' });
  assert.strictEqual(box.has_photo, false);
  const jpeg = 'data:image/jpeg;base64,' + Buffer.from('fakejpegdata').toString('base64');
  const withPhoto = s.setPhoto(box.id, { full: jpeg, thumb: jpeg });
  assert.strictEqual(withPhoto.has_photo, true);
  assert.strictEqual(withPhoto.photo_v, 1);
  assert.strictEqual(s.setPhoto(box.id, { full: jpeg, thumb: jpeg }).photo_v, 2);
  assert.strictEqual(Buffer.from(s.getPhoto(box.id, 'thumb')).toString(), 'fakejpegdata');
  assert.strictEqual(s.list(null).children[0].has_photo, true);
  assert.throws(() => s.setPhoto(box.id, { full: 'data:image/png;base64,AAAA', thumb: jpeg }), /JPEG/);
  assert.throws(() => s.setPhoto(9999, { full: jpeg, thumb: jpeg }), /nicht gefunden/);
  assert.strictEqual(s.removePhoto(box.id).has_photo, false);
  assert.throws(() => s.getPhoto(box.id), /Kein Foto/);
  // Foto verschwindet mit dem Eintrag
  s.setPhoto(box.id, { full: jpeg, thumb: jpeg });
  s.remove(box.id);
  assert.strictEqual(s.db.prepare('SELECT COUNT(*) AS n FROM photos').get().n, 0);
});

test('Migration einer Datenbank aus Schritt 1', () => {
  const { DatabaseSync } = require('node:sqlite');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woiswos-'));
  const file = path.join(dir, 'alt.db');
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER REFERENCES items(id) ON DELETE CASCADE, name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO items (name) VALUES ('Regal');
    INSERT INTO items (name, parent_id) VALUES ('Schalter', 1);`);
  old.close();
  const s = openStore(file);
  assert.strictEqual(s.get(1).kind, 'place'); // enthält etwas
  assert.strictEqual(s.get(2).kind, 'item');
  s.db.close();
  fs.rmSync(dir, { recursive: true });
});

test('Validierung', () => {
  const s = openStore(':memory:');
  assert.throws(() => s.create({ name: '  ' }), /Name/);
  assert.throws(() => s.create({ name: 'x', quantity: -1 }), /Menge/);
  assert.throws(() => s.create({ name: 'x', parent_id: 999 }), /Zielort/);
});

test('HTTP-API', async () => {
  const server = makeServer(openStore(':memory:'));
  await new Promise((r) => server.listen(0, r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const call = async (method, url, body) => {
    const r = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json() };
  };
  try {
    const a = await call('POST', '/api/items', { name: 'Keller', kind: 'place' });
    assert.strictEqual(a.status, 201);
    const b = await call('POST', '/api/items', { name: 'Kiste', kind: 'place', parent_id: a.body.id });
    const l = await call('GET', '/api/items?parent=' + a.body.id);
    assert.strictEqual(l.body.children[0].name, 'Kiste');
    assert.strictEqual((await call('GET', '/api/items')).body.children[0].child_count, 1);
    assert.strictEqual((await call('GET', '/api/search?q=kist')).body[0].path[0].name, 'Keller');
    assert.strictEqual((await call('PATCH', '/api/items/' + b.body.id, { parent_id: null })).body.path.length, 0);
    assert.strictEqual((await call('DELETE', '/api/items/' + a.body.id)).body.deleted, 1);
    assert.strictEqual((await call('GET', '/api/items/abc')).status, 400);
    assert.strictEqual((await call('GET', '/api/items/9999')).status, 404);
    const page = await fetch(base + '/');
    assert.strictEqual(page.status, 200);
    assert.strictEqual((await fetch(base + '/..%2fserver.js')).status, 403);
  } finally {
    server.close();
  }
});
