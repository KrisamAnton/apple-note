const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');

const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, 'data');
const FILES_DIR = path.join(DATA_DIR, 'files');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
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

// Der Browser hält seinen eigenen state.json-Stand nur im Arbeitsspeicher und
// schickt ihn bei jeder Änderung komplett neu (kein laufender Abgleich mit
// dem Server). Setzt der Erinnerungs-Hintergrund-Check währenddessen
// unabhängig "sentAt" auf der Festplatte, würde ein Browser-Speichern kurz
// danach (z. B. weil der Nutzer währenddessen irgendwo anders etwas
// bearbeitet) diesen Stand mit seiner noch veralteten Kopie (sentAt fehlt
// noch) wieder überschreiben - die Erinnerung würde eine Minute später vom
// nächsten Check fälschlich für "noch offen" gehalten und ein zweites Mal
// verschickt. Deshalb: ein bereits auf der Festplatte gesetztes "sentAt"
// bleibt erhalten, wenn der eingehende Stand für dieselbe Erinnerung sonst
// unverändert ist (Datum/Titel/Text gleich) - nur eine echte Bearbeitung
// (siehe saveReminderPopover() im Frontend, das sentAt bewusst zurücksetzt)
// darf es wieder löschen.
function preserveReminderSentAt(incoming, existing) {
  if (!existing || !Array.isArray(existing.notes) || !Array.isArray(incoming.notes)) return;
  const existingNotesById = new Map(existing.notes.map((n) => [n.id, n]));
  for (const note of incoming.notes) {
    const existingNote = existingNotesById.get(note.id);
    if (!existingNote || !Array.isArray(existingNote.objects) || !Array.isArray(note.objects)) continue;
    const existingObjsById = new Map(existingNote.objects.map((o) => [o.id, o]));
    for (const obj of note.objects) {
      if (obj.type !== 'reminder' || obj.sentAt) continue;
      const existingObj = existingObjsById.get(obj.id);
      if (!existingObj || !existingObj.sentAt) continue;
      const unchanged =
        existingObj.remindAt === obj.remindAt &&
        existingObj.title === obj.title &&
        existingObj.text === obj.text;
      if (unchanged) obj.sentAt = existingObj.sentAt;
    }
  }
}

function saveState(req, res) {
  fs.readFile(STATE_FILE, 'utf8', (readErr, raw) => {
    if (!readErr) {
      try {
        preserveReminderSentAt(req.body, JSON.parse(raw));
      } catch (e) {
        // Beschädigte/alte state.json - ohne Abgleich einfach normal weiterspeichern.
      }
    }
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
  });
}

app.put('/api/state', saveState);
// Zusätzlich als POST erreichbar, weil navigator.sendBeacon() (fürs zuverlässige
// Speichern beim Schließen der Seite) ausschließlich POST-Requests senden kann.
app.post('/api/state', saveState);

// ---------- Einstellungen (Papierkorb-Sichtbarkeit lebt nur im Frontend;
// hier nur, was dauerhaft gespeichert werden muss: E-Mail-Erinnerungen) ----------

const DEFAULT_SETTINGS = {
  reminderEmail: '',
  smtpHost: '',
  smtpPort: null,
  smtpSecure: 'starttls',
  smtpUser: '',
  smtpFromName: '',
  smtpPassword: '',
};

async function readSettingsFile() {
  try {
    const raw = await fs.promises.readFile(SETTINGS_FILE, 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    if (err.code === 'ENOENT') return { ...DEFAULT_SETTINGS };
    throw err;
  }
}

// Das SMTP-Passwort verlässt den Server nie Richtung Browser - sonst wäre es
// z. B. über die Netzwerk-Ansicht der Browser-Werkzeuge einsehbar. Das
// Frontend erfährt nur, ob überhaupt eines gespeichert ist (siehe
// fillSettingsForm() in app.js), damit das Eingabefeld leer bleiben und trotzdem
// "schon gesetzt" anzeigen kann.
function sanitizeSettingsForClient(settings) {
  const { smtpPassword, ...rest } = settings;
  return { ...rest, smtpPasswordSet: !!smtpPassword };
}

app.get('/api/settings', async (req, res) => {
  try {
    res.json(sanitizeSettingsForClient(await readSettingsFile()));
  } catch (err) {
    console.error('Konnte Einstellungen nicht lesen:', err);
    res.status(500).json({ error: 'Lesen fehlgeschlagen' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const current = await readSettingsFile();
    const body = req.body || {};
    const next = {
      ...current,
      reminderEmail: typeof body.reminderEmail === 'string' ? body.reminderEmail : current.reminderEmail,
      smtpHost: typeof body.smtpHost === 'string' ? body.smtpHost : current.smtpHost,
      smtpPort: typeof body.smtpPort === 'number' ? body.smtpPort : (body.smtpPort === null ? null : current.smtpPort),
      smtpSecure: typeof body.smtpSecure === 'string' ? body.smtpSecure : current.smtpSecure,
      smtpUser: typeof body.smtpUser === 'string' ? body.smtpUser : current.smtpUser,
      smtpFromName: typeof body.smtpFromName === 'string' ? body.smtpFromName : current.smtpFromName,
    };
    // Nur überschreiben, wenn tatsächlich ein neues Passwort mitgeschickt wurde
    // (siehe saveSettingsPopover() in app.js) - ein leeres Feld soll das
    // bestehende Passwort nicht löschen.
    if (typeof body.smtpPassword === 'string' && body.smtpPassword) {
      next.smtpPassword = body.smtpPassword;
    }
    const json = JSON.stringify(next, null, 2);
    const tmpFile = `${SETTINGS_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, json);
    await fs.promises.rename(tmpFile, SETTINGS_FILE);
    res.json(sanitizeSettingsForClient(next));
  } catch (err) {
    console.error('Konnte Einstellungen nicht speichern:', err);
    res.status(500).json({ error: 'Speichern fehlgeschlagen' });
  }
});

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

// ---------- Transkription (Sprachnotizen -> Text + Sprechererkennung) ----------
//
// Läuft als eigener Python-Prozess (transcribe.py, faster-whisper + optional
// pyannote.audio), da das die einzigen ausgereiften Werkzeuge dafür sind.
// Jobs laufen strikt nacheinander (nie parallel) und mit niedrigster
// Prozess-Priorität, damit eine lange Transkription den Rest des Servers
// (und andere Dienste auf demselben Host) nicht ausbremst.

const transcriptionJobs = new Map(); // jobId -> { status, result?, error? }
let transcriptionQueue = Promise.resolve();

app.post('/api/transcribe', (req, res) => {
  const { url } = req.body || {};
  if (typeof url !== 'string' || !url.startsWith('/files/')) {
    return res.status(400).json({ error: 'Ungültige Audio-URL' });
  }
  const filePath = path.join(FILES_DIR, path.basename(url));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audiodatei nicht gefunden' });
  }
  const jobId = crypto.randomUUID();
  transcriptionJobs.set(jobId, { status: 'queued' });
  transcriptionQueue = transcriptionQueue.then(() => runTranscriptionJob(jobId, filePath));
  res.json({ jobId });
});

app.get('/api/transcribe/:jobId', (req, res) => {
  const job = transcriptionJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Unbekannter Job' });
  res.json(job);
});

function runTranscriptionJob(jobId, filePath) {
  return new Promise((resolve) => {
    transcriptionJobs.set(jobId, { status: 'processing' });
    const scriptPath = path.join(__dirname, 'transcribe.py');
    // PYTHON_BIN erlaubt, auf ein eigenes venv zu zeigen (empfohlen, da Debian
    // ab Version 12 System-Python vor direkten pip-Installationen schützt).
    const pythonBin = process.env.PYTHON_BIN || 'python3';
    const child = spawn(pythonBin, [scriptPath, filePath], { env: process.env });
    try {
      os.setPriority(child.pid, 19); // niedrigste Priorität (siehe Kommentar oben)
    } catch (e) {
      // Manche Plattformen unterstützen das nicht - dann läuft der Job einfach
      // mit normaler Priorität weiter, kein Grund abzubrechen.
    }
    let stdout = '';
    let stderr = '';
    let stderrBuffer = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => {
      // "PROGRESS:0.42"-Zeilen sind Fortschrittsmeldungen fürs Frontend,
      // alles andere ist echtes Log/Fehlerausgabe (siehe stderr-Sammlung).
      stderrBuffer += d;
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop(); // letzte, evtl. unvollständige Zeile aufheben
      for (const line of lines) {
        const match = line.match(/^PROGRESS:([\d.]+)$/);
        if (match) {
          const current = transcriptionJobs.get(jobId) || {};
          transcriptionJobs.set(jobId, { ...current, status: 'processing', progress: parseFloat(match[1]) });
        } else {
          stderr += `${line}\n`;
        }
      }
    });
    child.on('error', (err) => {
      console.error('Transkription konnte nicht gestartet werden:', err.message);
      transcriptionJobs.set(jobId, { status: 'error', error: 'python3 konnte nicht gestartet werden' });
      resolve();
    });
    child.on('close', (code) => {
      if (code !== 0) {
        console.error('Transkription fehlgeschlagen:', stderr || `Exit-Code ${code}`);
        transcriptionJobs.set(jobId, { status: 'error', error: 'Transkription fehlgeschlagen (siehe Server-Log)' });
        return resolve();
      }
      try {
        const lastLine = stdout.trim().split('\n').pop();
        const result = JSON.parse(lastLine);
        if (result.error) {
          transcriptionJobs.set(jobId, { status: 'error', error: result.error });
        } else {
          transcriptionJobs.set(jobId, { status: 'done', result });
        }
      } catch (e) {
        console.error('Ungültige Antwort der Transkription:', stdout);
        transcriptionJobs.set(jobId, { status: 'error', error: 'Ungültige Antwort der Transkription' });
      }
      resolve();
    });
  });
}

// Ohne explizite Cache-Control-Angabe entscheidet jeder Browser selbst (und oft
// länger als gewünscht), wie lange er index.html/app.js/styles.css behält - nach
// einem Deploy sah man dadurch teils tagelang noch die alte Version, obwohl der
// Code auf dem Server längst aktuell war. "no-cache" erzwingt bei jedem Laden
// eine Rückfrage beim Server (per ETag/Last-Modified genügt meist ein schneller
// 304-Abgleich statt einer erneuten vollen Übertragung).
//
// Das allein reicht aber nicht: Cloudflare (oder ein anderer Proxy vor dem
// Server) kann diese Vorgabe für einzelne Dateitypen wie .js/.css trotzdem
// ignorieren und stundenlang eine alte Fassung ausliefern (beobachtet:
// "Cache-Control: max-age=14400" statt "no-cache" beim Abruf über die
// öffentliche Domain, obwohl der Server selbst korrekt "no-cache" sendet).
// Deshalb bekommen app.js und styles.css in der von hier ausgelieferten
// index.html zusätzlich einen Versions-Anhang ("?v=..."), der sich bei jeder
// inhaltlichen Änderung automatisch ändert (Änderungszeitpunkt der Datei) -
// das ist für jeden Cache dazwischen eine komplett neue, nie zuvor gesehene
// Adresse und kann daher nicht als "alt" ausgeliefert werden, unabhängig
// davon, welche Cache-Regeln ein Proxy für diesen Dateityp sonst anwendet.
function readVersionedIndexHtml() {
  let html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
  const versionOf = (relPath) => {
    try {
      return Math.round(fs.statSync(path.join(PROJECT_ROOT, relPath)).mtimeMs);
    } catch (e) {
      return Date.now();
    }
  };
  html = html.replace('href="css/styles.css"', `href="css/styles.css?v=${versionOf('css/styles.css')}"`);
  html = html.replace('src="js/app.js"', `src="js/app.js?v=${versionOf('js/app.js')}"`);
  return html;
}

app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(readVersionedIndexHtml());
});

app.use(
  express.static(PROJECT_ROOT, {
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  })
);

// ---------- E-Mail-Erinnerungen (fällige Erinnerungs-Objekte verschicken) ----------
//
// Läuft unabhängig von einer offenen Browser-Sitzung im Hintergrund, da eine
// Erinnerung oft Jahre in der Zukunft liegt und niemand die App bis dahin
// durchgehend offen lassen kann/soll.

function buildSmtpTransportOptions(settings) {
  const opts = {
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    auth: { user: settings.smtpUser, pass: settings.smtpPassword },
  };
  if (settings.smtpSecure === 'ssl') {
    opts.secure = true;
  } else if (settings.smtpSecure === 'starttls') {
    opts.secure = false;
    opts.requireTLS = true;
  } else {
    opts.secure = false;
  }
  return opts;
}

// Baut den aktuellen "Standort" der Notiz als Brotkrumen-Pfad (Ordner ->
// Hauptseite -> Unterseite(n)) - wird bei jedem Versand frisch aus dem
// aktuellen Stand berechnet (nicht beim Anlegen der Erinnerung gespeichert),
// damit ein späteres Umbenennen/Verschieben immer korrekt mitgeschickt wird.
function buildNoteBreadcrumb(state, note) {
  const notesById = new Map(state.notes.map((n) => [n.id, n]));
  const chain = [];
  let current = note;
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentNoteId ? notesById.get(current.parentNoteId) : null;
  }
  const rootNote = chain[0];
  const folder = rootNote && rootNote.folderId
    ? (state.folders || []).find((f) => f.id === rootNote.folderId)
    : null;
  const titles = chain.map((n) => n.title || 'Ohne Titel');
  return [folder ? folder.name : 'Alle Notizen', ...titles].join(' → ');
}

async function sendReminderEmail(settings, state, note, obj) {
  const transporter = nodemailer.createTransport(buildSmtpTransportOptions(settings));
  const fromName = settings.smtpFromName || 'KrisNote';
  const breadcrumb = buildNoteBreadcrumb(state, note);
  await transporter.sendMail({
    from: `"${fromName}" <${settings.smtpUser}>`,
    to: settings.reminderEmail,
    subject: `Erinnerung: ${obj.title || 'Ohne Titel'}`,
    text: `${obj.text || ''}\n\n---\nFundort in KrisNote: ${breadcrumb}`,
  });
}

let reminderCheckRunning = false;

// Kein Zusammenspiel mit /api/state über eine gemeinsame Warteschlange -
// bei einem theoretischen Zusammentreffen (Browser speichert im exakt selben
// Moment wie dieser Hintergrund-Check) könnte ein "sentAt" einmal verloren
// gehen und die Erinnerung beim nächsten Durchlauf ein zweites Mal verschickt
// werden. Für eine einzelne, meist nicht durchgehend geöffnete App ist dieses
// seltene Risiko bewusst in Kauf genommen worden, statt dafür eine eigene
// Sperr-/Warteschlangen-Logik zu bauen.
async function checkAndSendDueReminders() {
  if (reminderCheckRunning) return;
  reminderCheckRunning = true;
  try {
    const settings = await readSettingsFile();
    if (!settings.reminderEmail || !settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      return;
    }

    let state;
    try {
      state = JSON.parse(await fs.promises.readFile(STATE_FILE, 'utf8'));
    } catch (err) {
      return; // noch keine state.json (frisch installierter Server) - nichts zu tun
    }
    if (!state || !Array.isArray(state.notes)) return;

    const now = Date.now();
    const due = [];
    for (const note of state.notes) {
      for (const obj of note.objects || []) {
        if (obj.type === 'reminder' && obj.remindAt && !obj.sentAt && obj.remindAt <= now) {
          due.push({ note, obj });
        }
      }
    }
    if (due.length === 0) return;

    let anySent = false;
    for (const { note, obj } of due) {
      try {
        await sendReminderEmail(settings, state, note, obj);
        obj.sentAt = Date.now();
        anySent = true;
        console.log(`Erinnerung "${obj.title}" an ${settings.reminderEmail} verschickt.`);
      } catch (err) {
        console.error(`Erinnerung "${obj.title}" konnte nicht verschickt werden:`, err.message);
        // sentAt bleibt leer - der nächste Durchlauf versucht es automatisch erneut.
      }
    }

    if (anySent) {
      const json = JSON.stringify(state);
      const tmpFile = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
      await fs.promises.writeFile(tmpFile, json);
      await fs.promises.rename(tmpFile, STATE_FILE);
    }
  } catch (err) {
    console.error('Fehler bei der Erinnerungs-Prüfung:', err);
  } finally {
    reminderCheckRunning = false;
  }
}

const REMINDER_CHECK_INTERVAL_MS = 60 * 1000;
setInterval(checkAndSendDueReminders, REMINDER_CHECK_INTERVAL_MS);
checkAndSendDueReminders();

app.listen(PORT, () => {
  console.log(`KrisNote-Server läuft auf Port ${PORT}`);
  console.log(`Daten-Verzeichnis: ${DATA_DIR}`);
});
