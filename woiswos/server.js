// Woiswos - Server. Keine externen Abhängigkeiten, nur Node >= 22.13.
const http = require('http');
const path = require('path');
const fs = require('fs');
const { openStore, HttpError } = require('./db');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function readJson(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'Anfrage zu groß'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (data === null || typeof data !== 'object' || Array.isArray(data)) throw new Error();
        resolve(data);
      } catch {
        reject(new HttpError(400, 'Ungültiges JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function sendImage(res, buf) {
  res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' });
  res.end(buf);
}

function parseId(s) {
  const id = Number(s);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Ungültige ID');
  return id;
}

function makeServer(store) {
  // Routen: [Methode, Pfad-Muster, Handler]. ":id" steht für eine Zahl.
  const PHOTO_LIMIT = 4 * 1024 * 1024;
  const routes = [];
  const route = (method, pattern, handler, limit) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
    routes.push({ method, re, keys, handler, limit });
  };

  // Lagerplätze
  route('GET', '/api/places', ({ query }) => {
    const p = query.get('parent');
    return store.listPlace(p == null || p === '' ? null : parseId(p));
  });
  route('POST', '/api/places', ({ body }) => [201, store.createPlace(body)]);
  route('GET', '/api/places/by-code', ({ query }) => store.placeByCode(query.get('code')));
  route('GET', '/api/places/:id', ({ params }) => store.getPlace(parseId(params.id)));
  route('PATCH', '/api/places/:id', ({ params, body }) => store.updatePlace(parseId(params.id), body));
  route('DELETE', '/api/places/:id', ({ params }) => store.removePlace(parseId(params.id)));
  // Artikel
  route('GET', '/api/articles', ({ query }) => store.listArticles(query.get('q'), query.get('category')));
  route('POST', '/api/articles', ({ body }) => [201, store.createArticle(body)]);
  route('GET', '/api/articles/by-code', ({ query }) => store.articleByCode(query.get('code')));
  route('GET', '/api/articles/:id', ({ params }) => store.getArticle(parseId(params.id)));
  route('PATCH', '/api/articles/:id', ({ params, body }) => store.updateArticle(parseId(params.id), body));
  route('DELETE', '/api/articles/:id', ({ params }) => store.removeArticle(parseId(params.id)));
  // Artikelgruppen
  route('GET', '/api/categories', () => store.listCategories());
  route('POST', '/api/categories', ({ body }) => [201, store.createCategory(body)]);
  route('PATCH', '/api/categories/:id', ({ params, body }) => store.updateCategory(parseId(params.id), body));
  route('DELETE', '/api/categories/:id', ({ params }) => store.removeCategory(parseId(params.id)));
  // Bestand
  route('POST', '/api/stock/put', ({ body }) => store.put(body));
  route('POST', '/api/stock/move', ({ body }) => store.move(body));
  route('POST', '/api/stock/remove', ({ body }) => store.remove(body));
  // Suche und Etiketten
  route('GET', '/api/search', ({ query }) => store.search(query.get('q')));
  route('GET', '/api/labels', ({ query }) => {
    if (query.get('all')) return store.allPlaceLabels();
    if (query.get('article')) return store.articleLabel(parseId(query.get('article')));
    return store.placeLabels(parseId(query.get('place')), query.get('deep') === '1');
  });
  // Fotos (entity = places | articles)
  for (const [seg, entity] of [['places', 'place'], ['articles', 'article']]) {
    route('GET', `/api/${seg}/:id/photo`, ({ params, query, res }) =>
      sendImage(res, store.getPhoto(entity, parseId(params.id), query.get('size'))));
    route('PUT', `/api/${seg}/:id/photo`, ({ params, body }) => store.setPhoto(entity, parseId(params.id), body), PHOTO_LIMIT);
    route('DELETE', `/api/${seg}/:id/photo`, ({ params }) => store.removePhoto(entity, parseId(params.id)));
  }

  async function handleApi(req, res, url) {
    let pathMatched = false;
    for (const r of routes) {
      const m = r.re.exec(url.pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== req.method) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      const needsBody = r.method === 'POST' || r.method === 'PATCH' || r.method === 'PUT';
      const body = needsBody ? await readJson(req, typeof r.limit === 'number' ? r.limit : undefined) : {};
      const out = await r.handler({ params, query: url.searchParams, body, res });
      if (res.writableEnded) return;
      if (Array.isArray(out) && typeof out[0] === 'number') return send(res, out[0], out[1]);
      return send(res, 200, out);
    }
    throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Methode nicht erlaubt' : 'Unbekannte API');
  }

  function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    const rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nicht gefunden');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
      else serveStatic(req, res, url);
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      send(res, 500, { error: 'Interner Fehler' });
    }
  });
}

if (require.main === module) {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
  const port = Number(process.env.PORT) || 3000;
  const store = openStore(path.join(dataDir, 'woiswos.db'));
  makeServer(store).listen(port, () => {
    console.log(`Woiswos läuft auf http://localhost:${port} (Daten: ${dataDir})`);
  });
}

module.exports = { makeServer };
