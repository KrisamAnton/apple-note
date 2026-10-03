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

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 100 * 1024) {
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
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(json);
}

function parseId(s) {
  const id = Number(s);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Ungültige ID');
  return id;
}

function makeServer(store) {
  async function handleApi(req, res, url) {
    const parts = url.pathname.split('/').filter(Boolean).slice(1); // ohne "api"
    const method = req.method;

    if (parts[0] === 'search' && method === 'GET') {
      return send(res, 200, store.search(url.searchParams.get('q')));
    }
    if (parts[0] !== 'items') throw new HttpError(404, 'Unbekannte API');

    if (parts.length === 1) {
      if (method === 'GET') {
        const p = url.searchParams.get('parent');
        return send(res, 200, store.list(p == null || p === '' ? null : parseId(p)));
      }
      if (method === 'POST') return send(res, 201, store.create(await readJson(req)));
    } else if (parts.length === 2) {
      const id = parseId(parts[1]);
      if (method === 'GET') return send(res, 200, store.get(id));
      if (method === 'PATCH') return send(res, 200, store.update(id, await readJson(req)));
      if (method === 'DELETE') return send(res, 200, store.remove(id));
    }
    throw new HttpError(405, 'Methode nicht erlaubt');
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
