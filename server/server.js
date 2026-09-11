const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, 'data');
const FILES_DIR = path.join(DATA_DIR, 'files');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PORT = process.env.PORT || 3000;

fs.mkdirSync(FILES_DIR, { recursive: true });

const app = express();

// Quellcode und Rohdaten dürfen nie über den statischen Datei-Server erreichbar
// sein (sonst wäre state.json mit allen Notizen öffentlich abrufbar).
app.use((req, res, next) => {
  if (req.path.startsWith('/server') || req.path.startsWith('/data')) {
    return res.status(404).end();
  }
  next();
});

app.use('/files', express.static(FILES_DIR, { maxAge: '1y', immutable: true }));

app.use(express.json({ limit: '25mb' }));

app.get('/api/state', (req, res) => {
  fs.readFile(STATE_FILE, 'utf8', (err, raw) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json(null);
      console.error('Konnte state.json nicht lesen:', err);
      return res.status(500).json({ error: 'Lesen fehlgeschlagen' });
    }
    try {
      res.type('application/json').send(raw);
    } catch (e) {
      res.status(500).json({ error: 'state.json ist beschädigt' });
    }
  });
});

function saveState(req, res) {
  const json = JSON.stringify(req.body);
  const tmpFile = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFile(tmpFile, json, (err) => {
    if (err) {
      console.error('Konnte Notizen nicht speichern:', err);
      return res.status(500).json({ error: 'Speichern fehlgeschlagen' });
    }
    // Atomares Umbenennen: verhindert eine kaputte/halb geschriebene state.json,
    // falls der Server genau während des Schreibens abstürzt oder neu startet.
    fs.rename(tmpFile, STATE_FILE, (renameErr) => {
      if (renameErr) {
        console.error('Konnte Notizen nicht speichern:', renameErr);
        return res.status(500).json({ error: 'Speichern fehlgeschlagen' });
      }
      res.json({ ok: true });
    });
  });
}

app.put('/api/state', saveState);
// Zusätzlich als POST erreichbar, weil navigator.sendBeacon() (fürs zuverlässige
// Speichern beim Schließen der Seite) ausschließlich POST-Requests senden kann.
app.post('/api/state', saveState);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, FILES_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 20);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB pro Datei
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei erhalten' });
  res.json({ url: `/files/${req.file.filename}` });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    console.error('Upload-Fehler:', err.message);
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.use(express.static(PROJECT_ROOT));

app.listen(PORT, () => {
  console.log(`KrisNote-Server läuft auf Port ${PORT}`);
  console.log(`Daten-Verzeichnis: ${DATA_DIR}`);
});
