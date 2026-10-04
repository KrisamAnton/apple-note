const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openStore } = require('./db');
const { makeServer } = require('./server');

const JPEG = 'data:image/jpeg;base64,' + Buffer.from('fakejpegdata').toString('base64');

test('Lagerplätze: Nummern, Verschachtelung, Regeln', () => {
  const s = openStore(':memory:');
  const lager = s.createPlace({ code: 'ELW', name: 'Elektrowerkstatt' });
  // Freie Nummer mit Leerzeichen (Regal / Ebene / Fach), Mehrfach-Leerzeichen werden zusammengefasst
  const fach = s.createPlace({ code: '  100   01  03 ', parent_id: lager.id });
  assert.strictEqual(fach.code, '100 01 03');
  assert.strictEqual(fach.payload, 'P:100 01 03');
  // Automatisch fortlaufend, getrennt für Plätze und Boxen
  const a1 = s.createPlace({ parent_id: lager.id });
  const a2 = s.createPlace({ parent_id: lager.id });
  assert.deepStrictEqual([a1.code, a2.code], ['LP-0001', 'LP-0002']);
  const box = s.createPlace({ kind: 'box', name: 'Kiste blau', parent_id: fach.id });
  assert.strictEqual(box.code, 'BOX-0001');
  // Eindeutigkeit (ohne Beachtung von Groß/Klein und Leerzeichen-Menge)
  assert.throws(() => s.createPlace({ code: '100 01 03' }), /schon vergeben/);
  assert.throws(() => s.createPlace({ code: 'elw' }), /schon vergeben/);
  assert.throws(() => s.createPlace({ code: '100  01 03' }), /schon vergeben/);
  assert.throws(() => s.createPlace({ code: 'Ä1' }), /nur Buchstaben/);
  // Automatische Nummer überspringt bereits von Hand vergebene
  s.createPlace({ code: 'LP-0003' });
  assert.strictEqual(s.createPlace({}).code, 'LP-0004');
  // Regel: fester Platz nie in einer Box; Box darf in Box und auf oberste Ebene
  assert.throws(() => s.createPlace({ parent_id: box.id }), /nicht in einer Box/);
  const inner = s.createPlace({ kind: 'box', parent_id: box.id });
  assert.strictEqual(s.updatePlace(box.id, { parent_id: null }).path.length, 0);
  assert.deepStrictEqual(s.getPlace(inner.id).path.map((p) => p.code), ['BOX-0001']);
  // Zyklus
  assert.throws(() => s.updatePlace(box.id, { parent_id: inner.id }), /nicht in sich selbst/);
  assert.throws(() => s.updatePlace(lager.id, { parent_id: lager.id }), /nicht in sich selbst/);
  // Platz mit festen Unterplätzen kann keine Box werden
  assert.throws(() => s.updatePlace(lager.id, { kind: 'box' }), /feste Lagerplätze/);
  // Bearbeiten: leere Nummer = unverändert, eigene Nummer ist kein Duplikat
  assert.strictEqual(s.updatePlace(fach.id, { code: '', name: 'Taster' }).code, '100 01 03');
  assert.strictEqual(s.updatePlace(fach.id, { code: '100 01 03' }).name, 'Taster');
  assert.strictEqual(s.updatePlace(fach.id, { code: '100 01 04' }).code, '100 01 04');
});

test('Artikel und Bestand: einlagern, umlagern, ausbuchen, Protokoll', () => {
  const s = openStore(':memory:');
  const regal = s.createPlace({ code: '100 01 03' });
  const box = s.createPlace({ kind: 'box', code: 'BX 7' });
  const art = s.createArticle({ name: 'Taster', unit: '' });
  assert.strictEqual(art.code, 'ART-0001');
  assert.strictEqual(art.unit, 'Stk');
  assert.strictEqual(s.createArticle({ name: 'Haken', code: 'H1' }).code, 'H1');
  assert.throws(() => s.createArticle({ name: 'x', code: 'h1' }), /schon vergeben/);

  s.put({ article_id: art.id, place_id: regal.id, quantity: 10 });
  s.put({ article_id: art.id, place_id: regal.id, quantity: 2 });
  let a = s.getArticle(art.id);
  assert.strictEqual(a.total, 12);
  assert.strictEqual(a.stock.length, 1);
  assert.strictEqual(a.stock[0].quantity, 12);

  // Teilmenge umlagern: der gleiche Artikel liegt dann an zwei Orten
  s.move({ article_id: art.id, from_place_id: regal.id, to_place_id: box.id, quantity: 5 });
  a = s.getArticle(art.id);
  assert.deepStrictEqual(a.stock.map((x) => [x.code, x.quantity]), [['100 01 03', 7], ['BX 7', 5]]);
  // Alles umlagern lässt keine leere Zeile zurück
  s.move({ article_id: art.id, from_place_id: regal.id, to_place_id: box.id, quantity: 7 });
  assert.deepStrictEqual(s.getArticle(art.id).stock.map((x) => [x.code, x.quantity]), [['BX 7', 12]]);

  assert.throws(() => s.move({ article_id: art.id, from_place_id: regal.id, to_place_id: box.id, quantity: 1 }), /nur 0/);
  assert.throws(() => s.move({ article_id: art.id, from_place_id: box.id, to_place_id: box.id, quantity: 1 }), /derselbe/);
  assert.throws(() => s.put({ article_id: art.id, place_id: box.id, quantity: 0 }), /Menge/);
  assert.throws(() => s.remove({ article_id: art.id, place_id: box.id, quantity: 13 }), /nur 12/);
  s.remove({ article_id: art.id, place_id: box.id, quantity: 2, note: 'verbraucht' });
  a = s.getArticle(art.id);
  assert.strictEqual(a.total, 10);
  assert.deepStrictEqual(a.history.map((h) => h.type), ['remove', 'move', 'move', 'put', 'put']);
  assert.strictEqual(a.history[0].note, 'verbraucht');
  assert.strictEqual(a.history[1].from_place, '100 01 03');

  // Box umlagern: Inhalt bleibt in der Box, der Pfad ändert sich automatisch
  s.updatePlace(box.id, { parent_id: regal.id });
  assert.deepStrictEqual(s.getArticle(art.id).stock[0].path.map((p) => p.code), ['100 01 03', 'BX 7']);
});

test('Löschen von Plätzen und Artikeln', () => {
  const s = openStore(':memory:');
  const lager = s.createPlace({ code: 'L' });
  const box = s.createPlace({ kind: 'box', code: 'B', parent_id: lager.id });
  const art = s.createArticle({ name: 'Schalter' });
  s.put({ article_id: art.id, place_id: box.id, quantity: 3 });
  s.setPhoto('place', box.id, { full: JPEG, thumb: JPEG });
  s.setPhoto('article', art.id, { full: JPEG, thumb: JPEG });
  const res = s.removePlace(lager.id);
  assert.deepStrictEqual(res, { deleted_places: 2, deleted_stock_lines: 1 });
  // Artikel bleibt (ohne Bestand), Foto des Platzes ist weg, Protokoll vermerkt das Löschen
  const a = s.getArticle(art.id);
  assert.strictEqual(a.total, 0);
  assert.strictEqual(a.has_photo, true);
  assert.strictEqual(a.history[0].note, 'Lagerplatz gelöscht');
  assert.strictEqual(s.db.prepare("SELECT COUNT(*) AS n FROM photos WHERE entity='place'").get().n, 0);
  s.removeArticle(art.id);
  assert.strictEqual(s.db.prepare('SELECT COUNT(*) AS n FROM photos').get().n, 0);
  assert.strictEqual(s.db.prepare('SELECT COUNT(*) AS n FROM movements WHERE article_id IS NULL').get().n, 2);
});

test('Liste, Suche und Etiketten', () => {
  const s = openStore(':memory:');
  const lager = s.createPlace({ code: 'ELW', name: 'Elektrowerkstatt' });
  const fach = s.createPlace({ code: '100 01 03', parent_id: lager.id });
  const art = s.createArticle({ name: 'Taster rot' });
  s.put({ article_id: art.id, place_id: fach.id, quantity: 4 });

  const root = s.listPlace(null);
  assert.deepStrictEqual(root.children.map((c) => c.code), ['ELW']);
  assert.strictEqual(root.children[0].child_count, 1);
  const inner = s.listPlace(fach.id);
  assert.strictEqual(inner.stock[0].name, 'Taster rot');
  assert.deepStrictEqual(inner.path.map((p) => p.code), ['ELW', '100 01 03']);

  const r = s.search('100 01');
  assert.strictEqual(r.places.length, 1);
  const r2 = s.search('taster');
  assert.strictEqual(r2.articles[0].where[0].path.map((p) => p.name || p.code).join('|'), 'Elektrowerkstatt|100 01 03');
  assert.deepStrictEqual(s.search('%'), { places: [], articles: [] }); // % ist kein Platzhalter

  assert.strictEqual(s.listArticles('')[0].total, 4);
  assert.strictEqual(s.listArticles('rot').length, 1);
  assert.strictEqual(s.listArticles('xyz').length, 0);

  const one = s.placeLabels(fach.id, false);
  assert.deepStrictEqual(one.map((l) => l.payload), ['P:100 01 03']);
  assert.strictEqual(one[0].path, 'Elektrowerkstatt');
  assert.deepStrictEqual(s.placeLabels(lager.id, true).map((l) => l.code), ['100 01 03', 'ELW']);
  assert.strictEqual(s.allPlaceLabels().length, 2);
  assert.strictEqual(s.articleLabel(art.id)[0].payload, 'A:ART-0001');
  assert.strictEqual(s.placeByCode('100  01 03').id, fach.id);
  assert.strictEqual(s.articleByCode('art-0001').id, art.id);
  assert.throws(() => s.placeByCode('nope'), /Kein Lagerplatz/);
});

test('Artikelgruppen', () => {
  const s = openStore(':memory:');
  const cats = s.listCategories();
  const names = cats.map((c) => c.name);
  assert.ok(['Kleinteile', 'Handwerkzeug', 'Druckluftwerkzeug', 'Maschinen', 'Lötzubehör'].every((n) => names.includes(n)));
  const kleinteile = cats.find((c) => c.name === 'Kleinteile');
  // Gruppe ist optional (Kann-Feld)
  const ohne = s.createArticle({ name: 'Ohne' });
  assert.strictEqual(ohne.category_id, null);
  assert.strictEqual(ohne.category, null);
  const mit = s.createArticle({ name: 'Taster', category_id: kleinteile.id });
  assert.strictEqual(mit.category, 'Kleinteile');
  assert.throws(() => s.createArticle({ name: 'x', category_id: 9999 }), /existiert nicht/);
  // Filter in der Artikelliste
  assert.deepStrictEqual(s.listArticles('', String(kleinteile.id)).map((a) => a.name), ['Taster']);
  assert.deepStrictEqual(s.listArticles('', 'none').map((a) => a.name), ['Ohne']);
  assert.strictEqual(s.listArticles('', '').length, 2);
  assert.strictEqual(s.listArticles('tast', String(kleinteile.id)).length, 1);
  assert.strictEqual(s.listArticles('ohne', String(kleinteile.id)).length, 0);
  // Gruppe ändern / entfernen beim Bearbeiten (Feld weglassen = unverändert)
  assert.strictEqual(s.updateArticle(mit.id, { name: 'Taster rot' }).category, 'Kleinteile');
  assert.strictEqual(s.updateArticle(mit.id, { category_id: null }).category, null);
  s.updateArticle(mit.id, { category_id: kleinteile.id });
  // Eigene Gruppen verwalten
  const neu = s.createCategory({ name: '  Pressluft   Zubehör ' });
  assert.strictEqual(neu.name, 'Pressluft Zubehör');
  assert.throws(() => s.createCategory({ name: 'pressluft zubehör' }), /gibt es schon/);
  assert.throws(() => s.createCategory({ name: ' ' }), /nicht leer/);
  assert.strictEqual(s.updateCategory(neu.id, { name: 'Druckluft-Zubehör' }).name, 'Druckluft-Zubehör');
  assert.throws(() => s.updateCategory(neu.id, { name: 'Maschinen' }), /gibt es schon/);
  assert.strictEqual(s.updateCategory(neu.id, { name: 'DRUCKLUFT-ZUBEHÖR' }).name, 'DRUCKLUFT-ZUBEHÖR'); // eigener Name
  // Löschen: Artikel bleiben, stehen danach ohne Gruppe
  assert.deepStrictEqual(s.removeCategory(kleinteile.id), { unassigned_articles: 1 });
  assert.strictEqual(s.getArticle(mit.id).category_id, null);
  assert.throws(() => s.removeCategory(kleinteile.id), /nicht gefunden/);
});

test('Migration: Datenbank ohne Artikelgruppen (Schritt 3)', () => {
  const { DatabaseSync } = require('node:sqlite');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woiswos-'));
  const file = path.join(dir, 'v3.db');
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE places (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'place', parent_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
      notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE articles (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'Stk', notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO articles (code, name) VALUES ('ART-0001', 'Altbestand');`);
  old.close();
  let s = openStore(file);
  assert.strictEqual(s.listCategories().length, 13);
  assert.strictEqual(s.getArticle(1).category_id, null);
  const maschinen = s.listCategories().find((c) => c.name === 'Maschinen');
  assert.strictEqual(s.updateArticle(1, { category_id: maschinen.id }).category, 'Maschinen');
  // Gelöschte Standardgruppen kommen beim nächsten Start nicht zurück
  s.removeCategory(maschinen.id);
  s.db.close();
  s = openStore(file);
  assert.strictEqual(s.listCategories().length, 12);
  assert.strictEqual(s.getArticle(1).category_id, null);
  s.db.close();
  fs.rmSync(dir, { recursive: true });
});

test('Fotos', () => {
  const s = openStore(':memory:');
  const box = s.createPlace({ kind: 'box' });
  const art = s.createArticle({ name: 'A' });
  assert.strictEqual(box.has_photo, false);
  assert.strictEqual(s.setPhoto('place', box.id, { full: JPEG, thumb: JPEG }).photo_v, 1);
  assert.strictEqual(s.setPhoto('place', box.id, { full: JPEG, thumb: JPEG }).photo_v, 2);
  assert.strictEqual(s.getArticle(art.id).has_photo, false); // gleiche ID, anderer Typ
  assert.strictEqual(Buffer.from(s.getPhoto('place', box.id, 'thumb')).toString(), 'fakejpegdata');
  assert.throws(() => s.setPhoto('place', box.id, { full: 'data:image/png;base64,AAAA', thumb: JPEG }), /JPEG/);
  assert.throws(() => s.setPhoto('article', 9999, { full: JPEG, thumb: JPEG }), /nicht gefunden/);
  assert.strictEqual(s.removePhoto('place', box.id).has_photo, false);
  assert.throws(() => s.getPhoto('place', box.id), /Kein Foto/);
});

test('Migration einer Datenbank aus Schritt 2 (items-Tabelle)', () => {
  const { DatabaseSync } = require('node:sqlite');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woiswos-'));
  const file = path.join(dir, 'alt.db');
  const old = new DatabaseSync(file);
  old.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER REFERENCES items(id) ON DELETE CASCADE, name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'item', quantity INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE photos (item_id INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
      full BLOB NOT NULL, thumb BLOB NOT NULL, version INTEGER NOT NULL DEFAULT 1);
    INSERT INTO items (id, name, kind, parent_id) VALUES (1, 'Schrankraum', 'place', NULL);
    INSERT INTO items (id, name, kind, parent_id) VALUES (2, 'Regal 1', 'place', 1);
    INSERT INTO items (id, name, kind, parent_id) VALUES (3, 'Box blau', 'box', 2);
    INSERT INTO items (id, name, kind, parent_id, quantity, notes) VALUES (4, 'Schalter', 'item', 3, 3, 'weiß');
    INSERT INTO items (id, name, kind, parent_id, quantity) VALUES (5, 'Haken', 'item', 2, 20);
    INSERT INTO items (id, name, kind, parent_id, quantity) VALUES (6, 'Lose Sache', 'item', NULL, 1);
    INSERT INTO photos (item_id, full, thumb) VALUES (3, x'01', x'02');
    INSERT INTO photos (item_id, full, thumb) VALUES (4, x'03', x'04');`);
  old.close();

  let s = openStore(file);
  const root = s.listPlace(null);
  assert.deepStrictEqual(root.children.map((c) => [c.id, c.code, c.name]), [[1, 'LP-0001', 'Schrankraum']]);
  const box = s.getPlace(3);
  assert.strictEqual(box.kind, 'box');
  assert.strictEqual(box.code, 'BOX-0001');
  assert.strictEqual(box.has_photo, true);
  assert.deepStrictEqual(box.path.map((p) => p.name), ['Schrankraum', 'Regal 1']);
  const list = s.listArticles('');
  assert.deepStrictEqual(list.map((a) => [a.name, a.total]), [['Haken', 20], ['Lose Sache', 0], ['Schalter', 3]]);
  const schalter = s.getArticle(list.find((a) => a.name === 'Schalter').id);
  assert.strictEqual(schalter.notes, 'weiß');
  assert.strictEqual(schalter.has_photo, true);
  assert.strictEqual(schalter.stock[0].code, 'BOX-0001');
  // Neue automatische Nummern machen dort weiter
  assert.strictEqual(s.createPlace({}).code, 'LP-0003');
  assert.strictEqual(s.createArticle({ name: 'neu' }).code, 'ART-0004');
  // Alte Daten bleiben als Backup, zweites Öffnen migriert nicht erneut
  assert.strictEqual(s.db.prepare('SELECT COUNT(*) AS n FROM legacy_items_v2').get().n, 6);
  s.db.close();
  s = openStore(file);
  assert.strictEqual(s.listArticles('').length, 4);
  s.db.close();
  fs.rmSync(dir, { recursive: true });
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
    const lp = await call('POST', '/api/places', { code: '100 01 03', name: 'Fach' });
    assert.strictEqual(lp.status, 201);
    assert.strictEqual((await call('POST', '/api/places', { code: '100 01 03' })).status, 409);
    const art = await call('POST', '/api/articles', { name: 'Taster' });
    assert.strictEqual(art.status, 201);
    const put = await call('POST', '/api/stock/put', { article_id: art.body.id, place_id: lp.body.id, quantity: 5 });
    assert.strictEqual(put.body.total, 5);
    assert.strictEqual((await call('POST', '/api/stock/remove', { article_id: art.body.id, place_id: lp.body.id, quantity: 9 })).status, 400);
    assert.strictEqual((await call('GET', '/api/places?parent=' + lp.body.id)).body.stock[0].quantity, 5);
    assert.strictEqual((await call('GET', '/api/places/by-code?code=100%2001%2003')).body.id, lp.body.id);
    assert.strictEqual((await call('GET', '/api/search?q=taster')).body.articles[0].where[0].quantity, 5);
    assert.strictEqual((await call('GET', '/api/labels?place=' + lp.body.id)).body[0].payload, 'P:100 01 03');
    assert.strictEqual((await call('GET', '/api/labels?article=' + art.body.id)).body[0].payload, 'A:ART-0001');
    assert.strictEqual((await call('PATCH', '/api/articles/' + art.body.id, { name: 'Taster rot' })).body.name, 'Taster rot');
    // Artikelgruppen
    const cats = (await call('GET', '/api/categories')).body;
    assert.ok(cats.length >= 10);
    const newCat = await call('POST', '/api/categories', { name: 'Testgruppe' });
    assert.strictEqual(newCat.status, 201);
    assert.strictEqual((await call('POST', '/api/categories', { name: 'testgruppe' })).status, 409);
    await call('PATCH', '/api/articles/' + art.body.id, { category_id: newCat.body.id });
    assert.strictEqual((await call('GET', '/api/articles?category=' + newCat.body.id)).body.length, 1);
    assert.strictEqual((await call('PATCH', '/api/categories/' + newCat.body.id, { name: 'Neu' })).body.article_count, 1);
    assert.strictEqual((await call('DELETE', '/api/categories/' + newCat.body.id)).body.unassigned_articles, 1);
    // Foto hoch- und runterladen
    const up = await call('PUT', `/api/articles/${art.body.id}/photo`, { full: JPEG, thumb: JPEG });
    assert.strictEqual(up.body.has_photo, true);
    const img = await fetch(`${base}/api/articles/${art.body.id}/photo?size=thumb`);
    assert.strictEqual(img.headers.get('content-type'), 'image/jpeg');
    assert.strictEqual(Buffer.from(await img.arrayBuffer()).toString(), 'fakejpegdata');
    assert.strictEqual((await call('DELETE', `/api/articles/${art.body.id}/photo`)).body.has_photo, false);
    assert.strictEqual((await call('DELETE', '/api/places/' + lp.body.id)).body.deleted_stock_lines, 1);
    assert.strictEqual((await call('GET', '/api/places/abc')).status, 400);
    assert.strictEqual((await call('GET', '/api/places/9999')).status, 404);
    assert.strictEqual((await call('GET', '/api/nope')).status, 404);
    assert.strictEqual((await call('PUT', '/api/places')).status, 405);
    assert.strictEqual((await fetch(base + '/')).status, 200);
    assert.strictEqual((await fetch(base + '/..%2fserver.js')).status, 403);
  } finally {
    server.close();
  }
});
