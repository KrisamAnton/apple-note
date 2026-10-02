const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  makeUserStore,
  verifyPassword,
  timingSafeEqualString,
  createSession,
  getSession,
  destroySession,
  parseCookies,
} = require('./auth');
const { makeAttemptLimiter } = require('./rate-limit');

// Einzige Quelle der Versionsnummer ist package.json (siehe CHANGELOG.md für
// die Änderungen pro Version) - nirgends sonst noch einmal hart hinterlegt,
// damit z. B. /api/version nie von der tatsächlich installierten Version
// abweichen kann.
const APP_VERSION = require('./package.json').version;

const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, 'data');
// Alter, gemeinsamer Datenbestand aus der Zeit vor getrennten Benutzer-Konten
// (Phase 1/2) - wird beim Start einmalig in den privaten Bereich des jeweiligen
// Benutzers kopiert (siehe migrateLegacySharedData()), bleibt selbst aber
// unangetastet als automatisches Backup liegen.
const LEGACY_FILES_DIR = path.join(DATA_DIR, 'files');
const LEGACY_STATE_FILE = path.join(DATA_DIR, 'state.json');
const LEGACY_SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
// Jeder Benutzer bekommt einen eigenen, privaten Bereich für seine Notizen,
// hochgeladenen Dateien und Einstellungen (Erinnerungs-Mail/SMTP) - komplett
// getrennt von allen anderen Benutzern.
const USERS_DATA_DIR = path.join(DATA_DIR, 'users');
const PORT = process.env.PORT || 3000;

const userStore = makeUserStore(USERS_FILE);

function userDir(username) {
  return path.join(USERS_DATA_DIR, username);
}
function userStateFile(username) {
  return path.join(userDir(username), 'state.json');
}
function userFilesDir(username) {
  return path.join(userDir(username), 'files');
}
function userSettingsFile(username) {
  return path.join(userDir(username), 'settings.json');
}

// Einmalige, sichere Migration: bestehende Benutzer (aus der Zeit vor
// getrennten Konten) bekommen beim ersten Start nach dem Update eine Kopie
// des bisherigen gemeinsamen Datenbestands als ihren privaten Bereich - die
// Originaldateien werden dabei nur gelesen, nie verschoben oder gelöscht.
function migrateLegacySharedData() {
  for (const user of userStore.readUsers()) {
    if (fs.existsSync(LEGACY_STATE_FILE) && !fs.existsSync(userStateFile(user.username))) {
      fs.mkdirSync(userDir(user.username), { recursive: true });
      fs.copyFileSync(LEGACY_STATE_FILE, userStateFile(user.username));
      if (fs.existsSync(LEGACY_FILES_DIR)) {
        fs.mkdirSync(userFilesDir(user.username), { recursive: true });
        for (const name of fs.readdirSync(LEGACY_FILES_DIR)) {
          const src = path.join(LEGACY_FILES_DIR, name);
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, path.join(userFilesDir(user.username), name));
          }
        }
      }
      console.log(`Bisherige gemeinsame Notizen als privater Bereich für "${user.username}" übernommen.`);
    }
    // Die bisherige, serverweite Erinnerungs-Mail-Konfiguration (Phase 1-3)
    // ging bisher an EINE fest hinterlegte Adresse, unabhängig davon, wer
    // gerade angemeldet war - jeder Benutzer bekommt sie jetzt als eigenen,
    // unabhängigen Startpunkt (kann sie selbst ändern/löschen, ohne andere
    // Benutzer zu beeinflussen).
    if (fs.existsSync(LEGACY_SETTINGS_FILE) && !fs.existsSync(userSettingsFile(user.username))) {
      fs.mkdirSync(userDir(user.username), { recursive: true });
      fs.copyFileSync(LEGACY_SETTINGS_FILE, userSettingsFile(user.username));
      console.log(`Bisherige gemeinsame Erinnerungs-Mail-Einstellungen für "${user.username}" übernommen.`);
    }
  }
}
migrateLegacySharedData();

// ---------- Ersteinrichtung (Einrichtungsmodus, wenn noch kein einziger
// Benutzer existiert) ----------
//
// isSetupMode() wird bewusst bei jeder Anfrage neu ausgewertet (nicht einmalig
// beim Start gemerkt): sobald POST /api/setup den ersten Benutzer angelegt
// hat, ist der Einrichtungsweg noch in derselben laufenden Server-Instanz
// sofort und dauerhaft gesperrt - kein Neustart nötig.
function isSetupMode() {
  return userStore.readUsers().length === 0;
}

// Schützt die Ersteinrichtung davor, dass jemand anderes im Netz sie zuerst
// aufruft und sich selbst den ersten (und einzigen bevorrechtigten) Zugang
// verschafft. Per Umgebungsvariable SETUP_CODE fest vorgebbar (z. B. für
// automatisierte Ersteinrichtung), sonst zufällig erzeugt und laut im
// Server-Log ausgegeben - das Log ist der einzige Ort, an dem der Code
// jemals im Klartext auftaucht.
let setupCode = null;
if (isSetupMode()) {
  setupCode = process.env.SETUP_CODE || crypto.randomBytes(6).toString('hex');
  console.log('');
  console.log('========================================================');
  console.log('  KrisNote: Noch kein Benutzer vorhanden - Ersteinrichtung');
  console.log('  Im Browser öffnen: /setup.html');
  console.log(`  Einrichtungscode:  ${setupCode}`);
  console.log('========================================================');
  console.log('');
}

// Gegen Erraten des Einrichtungscodes bzw. Brute-Force bei Login/Registrierung -
// siehe rate-limit.js. Absichtlich dieselben, großzügigen aber wirksamen
// Grenzwerte für alle drei (5 Fehlversuche, danach 15 Minuten Sperre).
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_LOCKOUT_MS = 15 * 60 * 1000;
const setupAttemptLimiter = makeAttemptLimiter({ maxAttempts: RATE_LIMIT_MAX_ATTEMPTS, lockoutMs: RATE_LIMIT_LOCKOUT_MS });
const loginAttemptLimiter = makeAttemptLimiter({ maxAttempts: RATE_LIMIT_MAX_ATTEMPTS, lockoutMs: RATE_LIMIT_LOCKOUT_MS });
const registerAttemptLimiter = makeAttemptLimiter({ maxAttempts: RATE_LIMIT_MAX_ATTEMPTS, lockoutMs: RATE_LIMIT_LOCKOUT_MS });

function rateLimitMessage(retryAfterMs) {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `Zu viele Fehlversuche. Bitte in ${minutes} Minute${minutes === 1 ? '' : 'n'} erneut versuchen.`;
}

const app = express();

// Quellcode und Rohdaten dürfen nie über den statischen Datei-Server erreichbar
// sein (sonst wäre state.json mit allen Notizen öffentlich abrufbar).
app.use((req, res, next) => {
  if (req.path.startsWith('/server') || req.path.startsWith('/data')) {
    return res.status(404).end();
  }
  next();
});

app.use(express.json({ limit: '25mb' }));

// ---------- Anmeldung ----------
//
// login.html, der Login-Endpunkt selbst und das Hintergrundbild der
// Anmeldeseite müssen ohne Anmeldung erreichbar bleiben (sonst könnte sich
// niemand mehr anmelden bzw. die Seite bliebe optisch leer) - alles andere
// (Fläche, API, hochgeladene Dateien) verlangt ab hier eine gültige Sitzung.
const PUBLIC_PATHS = new Set([
  '/login.html',
  '/api/login',
  '/api/version',
  '/api/change-password-public',
  '/api/register',
  '/icons/login-background.webp',
  // Enthält keine privaten Daten (nur Name/Icons/Farben der App) - der
  // Browser fragt sie aber teils schon vor dem Anmelden ab (z. B. für den
  // "Zum Startbildschirm hinzufügen"-Hinweis auf der Login-Seite). Bisher
  // kam dabei statt echtem JSON die Anmelde-Weiterleitung zurück ("Manifest:
  // Line 1, column 1, Syntax error" in der Konsole).
  '/manifest.json',
  // Ersteinrichtung: die Seite selbst wird zwar auch hier als "öffentlich"
  // gelistet, ist aber durch die eigene Weiterleitungs-Route direkt darunter
  // tatsächlich nur erreichbar, solange isSetupMode() zutrifft (danach leitet
  // diese Route jede Anfrage sofort zu /login.html um, bevor PUBLIC_PATHS
  // überhaupt geprüft wird). /api/setup und /api/auth-status prüfen den
  // Einrichtungsmodus stattdessen selbst in ihrem Handler (liefern sonst 403).
  '/setup.html',
  '/api/setup',
  '/api/auth-status',
]);

// Müssen vor dem allgemeinen Anmelde-Mittelsmann (PUBLIC_PATHS) laufen, weil
// sie je nach Einrichtungsmodus zwischen den beiden sonst rein statischen
// Seiten hin- und herleiten, bevor diese überhaupt ausgeliefert werden.
app.get('/login.html', (req, res, next) => {
  if (isSetupMode()) return res.redirect('/setup.html');
  next();
});
app.get('/setup.html', (req, res, next) => {
  if (!isSetupMode()) return res.redirect('/login.html');
  next();
});

app.use((req, res, next) => {
  if (PUBLIC_PATHS.has(req.path)) return next();
  const cookies = parseCookies(req);
  const session = getSession(cookies[SESSION_COOKIE_NAME]);
  if (session) {
    req.username = session.username;
    return next();
  }
  if (req.path.startsWith('/api/') || req.path.startsWith('/files/')) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  res.redirect('/login.html');
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  }
  // Schlüssel aus IP + Benutzername (nicht nur IP), damit ein falsch
  // getipptes Passwort für Benutzer A nicht auch Benutzer B hinter derselben
  // IP-Adresse (z. B. selbes Heimnetz) aussperrt.
  const limiterKey = `${req.ip}:${username.toLowerCase()}`;
  const limit = loginAttemptLimiter.check(limiterKey);
  if (!limit.allowed) {
    return res.status(429).json({ error: rateLimitMessage(limit.retryAfterMs) });
  }
  const user = userStore.findUser(username);
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    loginAttemptLimiter.recordFailure(limiterKey);
    return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
  }
  loginAttemptLimiter.recordSuccess(limiterKey);
  const sid = createSession(user.username);
  res.cookie(SESSION_COOKIE_NAME, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
  res.json({ ok: true, username: user.username, displayName: user.displayName });
});

// Öffentlicher Status für die Anmeldeseite (Registrieren-Button nur zeigen,
// wenn ALLOW_REGISTRATION tatsächlich an ist - keine privaten Daten enthalten).
app.get('/api/auth-status', (req, res) => {
  res.json({
    setupMode: isSetupMode(),
    registrationAllowed: process.env.ALLOW_REGISTRATION === 'true',
  });
});

app.get('/api/version', (req, res) => {
  res.json({ version: APP_VERSION });
});

// Änderungsverlauf (CHANGELOG.md) für die schreibgeschützte Ansicht unter
// Einstellungen - nur für angemeldete Benutzer (nicht in PUBLIC_PATHS).
app.get('/api/changelog', (req, res) => {
  fs.readFile(path.join(PROJECT_ROOT, 'CHANGELOG.md'), 'utf8', (err, text) => {
    if (err) return res.status(404).json({ error: 'Kein Änderungsverlauf vorhanden' });
    res.type('text/plain; charset=utf-8').send(text);
  });
});

app.post('/api/logout', (req, res) => {
  const cookies = parseCookies(req);
  destroySession(cookies[SESSION_COOKIE_NAME]);
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = userStore.findUser(req.username);
  res.json({ username: req.username, displayName: user ? user.displayName : req.username });
});

app.post('/api/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein' });
  }
  const user = userStore.findUser(req.username);
  if (!user || !verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
  }
  userStore.updatePassword(user.username, newPassword);
  res.json({ ok: true });
});

// Passwort-Änderung direkt von der Anmeldeseite aus (ohne bestehende Sitzung) -
// sicher, weil das aktuelle Passwort selbst den Nachweis der Identität
// erbringt (genau wie beim Login), nur eben ohne vorher eingeloggt zu sein.
app.post('/api/change-password-public', (req, res) => {
  const { username, currentPassword, newPassword } = req.body || {};
  if (
    typeof username !== 'string' || !username ||
    typeof currentPassword !== 'string' || !currentPassword ||
    typeof newPassword !== 'string' || !newPassword
  ) {
    return res.status(400).json({ error: 'Benutzername, aktuelles und neues Passwort erforderlich' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein' });
  }
  const user = userStore.findUser(username);
  if (!user || !verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ error: 'Benutzername oder aktuelles Passwort falsch' });
  }
  userStore.updatePassword(user.username, newPassword);
  res.json({ ok: true });
});

// ---------- Neuen Benutzer anlegen (öffentlich erreichbar - siehe login.html) ----------
//
// Jeder neue Benutzer bekommt einen eigenen, leeren Notizbereich - mit einer
// Ausnahme: die Seite/Unterseiten "Erklärung KrisNote" (bzw. der gleichnamige
// Ordner) werden vom ältesten bestehenden Benutzer, bei dem sie gefunden
// werden, als einmalige Kopie mitgegeben, inklusive der darin verwendeten
// Bilder/PDFs/Aufnahmen. Spätere Änderungen an der Erklärung wirken sich
// nicht rückwirkend auf schon registrierte Benutzer aus (echte, unabhängige
// Kopie, kein geteilter Inhalt).
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/;

function collectReferencedFilenames(notes) {
  const json = JSON.stringify(notes);
  const matches = json.match(/\/files\/[A-Za-z0-9_.-]+/g) || [];
  return [...new Set(matches.map((m) => path.basename(m)))];
}

function findErklaerungTemplate() {
  const users = [...userStore.readUsers()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  for (const user of users) {
    const stateFile = userStateFile(user.username);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch (err) {
      continue;
    }
    if (!parsed || !Array.isArray(parsed.notes)) continue;
    const folders = Array.isArray(parsed.folders) ? parsed.folders : [];

    // Fall A: eigener Ordner namens "Erklärung KrisNote".
    const folder = folders.find((f) => f.name === 'Erklärung KrisNote');
    if (folder) {
      const notes = parsed.notes.filter((n) => n.folderId === folder.id);
      if (notes.length) {
        return { sourceUsername: user.username, folder: { ...folder }, notes: notes.map((n) => ({ ...n })) };
      }
    }

    // Fall B: Hauptseite "Erklärung KrisNote" mit Unterseiten (parentNoteId-Kette).
    const rootNote = parsed.notes.find((n) => !n.parentNoteId && n.title === 'Erklärung KrisNote');
    if (rootNote) {
      const collected = [rootNote];
      let changed = true;
      while (changed) {
        changed = false;
        for (const n of parsed.notes) {
          if (collected.some((c) => c.id === n.id)) continue;
          if (n.parentNoteId && collected.some((c) => c.id === n.parentNoteId)) {
            collected.push(n);
            changed = true;
          }
        }
      }
      return { sourceUsername: user.username, folder: null, notes: collected.map((n) => ({ ...n })) };
    }
  }
  return null;
}

function seedNewUserState(username) {
  fs.mkdirSync(userDir(username), { recursive: true });
  fs.mkdirSync(userFilesDir(username), { recursive: true });

  const template = findErklaerungTemplate();
  let state;
  if (template) {
    state = { folders: template.folder ? [template.folder] : [], notes: template.notes };
    const sourceFilesDir = userFilesDir(template.sourceUsername);
    for (const filename of collectReferencedFilenames(template.notes)) {
      try {
        fs.copyFileSync(path.join(sourceFilesDir, filename), path.join(userFilesDir(username), filename));
      } catch (err) {
        console.warn(`Datei "${filename}" der Erklärung konnte nicht für "${username}" übernommen werden:`, err.message);
      }
    }
  } else {
    // Noch keine Erklärung gefunden (z. B. ganz frische Installation) -
    // normale Willkommens-Notiz als Rückfallebene.
    const now = Date.now();
    state = {
      folders: [],
      notes: [{
        id: crypto.randomUUID(),
        title: 'Willkommen bei KrisNote',
        objects: [],
        ink: { strokes: [] },
        background: 'dots',
        folderId: null,
        parentNoteId: null,
        order: 0,
        createdAt: now,
        updatedAt: now,
      }],
    };
  }
  fs.writeFileSync(userStateFile(username), JSON.stringify(state));
}

// ---------- Ersteinrichtung: allerersten Benutzer anlegen ----------
//
// Bewusst eine eigene Route statt einer Variante von /api/register: dadurch
// bleibt /api/register unabhängig davon, ob ALLOW_REGISTRATION gesetzt ist,
// immer nach demselben, festen Muster gesperrt (siehe dort), während dieser
// Weg unabhängig davon ausschließlich per Einrichtungscode funktioniert und
// sich nach dem ersten erfolgreichen Aufruf selbst dauerhaft abschaltet.
app.post('/api/setup', (req, res) => {
  if (!isSetupMode()) {
    return res.status(403).json({ error: 'Die Ersteinrichtung wurde bereits abgeschlossen.' });
  }
  const limit = setupAttemptLimiter.check(req.ip);
  if (!limit.allowed) {
    return res.status(429).json({ error: rateLimitMessage(limit.retryAfterMs) });
  }
  const { setupCode: submittedCode, username, password, displayName } = req.body || {};
  if (
    typeof submittedCode !== 'string' || !submittedCode ||
    !setupCode || !timingSafeEqualString(submittedCode, setupCode)
  ) {
    setupAttemptLimiter.recordFailure(req.ip);
    return res.status(401).json({ error: 'Einrichtungscode falsch.' });
  }
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
    return res.status(400).json({
      error: 'Benutzername muss 3-30 Zeichen lang sein (nur Buchstaben, Zahlen, "_", "-" und ".").',
    });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein' });
  }
  // Ab hier bis einschließlich upsertUser() läuft alles synchron (kein await,
  // keine I/O-Rückrufe dazwischen) - Node.js verarbeitet HTTP-Anfragen
  // einzeln nacheinander im selben Thread, ein zweites, praktisch
  // gleichzeitig eintreffendes POST /api/setup kann diese Funktion daher
  // frühestens NACH dem kompletten Durchlauf dieser Anfrage starten und
  // findet dann isSetupMode() bereits als false vor (Prüfung ganz oben).
  // Ein echtes Race zweier gleichzeitig erfolgreicher Ersteinrichtungen ist
  // damit ausgeschlossen.
  if (userStore.findUser(username)) {
    return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben' });
  }
  const user = userStore.upsertUser({ username, password, displayName });
  seedNewUserState(user.username);
  setupAttemptLimiter.recordSuccess(req.ip);

  const sid = createSession(user.username);
  res.cookie(SESSION_COOKIE_NAME, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
  res.json({ ok: true, username: user.username, displayName: user.displayName });
});

app.post('/api/register', (req, res) => {
  // Muss vor der ALLOW_REGISTRATION-Prüfung stehen: sonst ließe sich die
  // Ersteinrichtung (samt Einrichtungscode-Schutz) umgehen, indem man
  // stattdessen direkt hier registriert, während noch kein Benutzer existiert.
  if (isSetupMode()) {
    return res.status(403).json({ error: 'Noch keine Ersteinrichtung durchgeführt. Bitte /setup.html öffnen.' });
  }
  if (process.env.ALLOW_REGISTRATION !== 'true') {
    return res.status(403).json({ error: 'Die Registrierung neuer Benutzer ist auf diesem Server deaktiviert.' });
  }
  const limit = registerAttemptLimiter.check(req.ip);
  if (!limit.allowed) {
    return res.status(429).json({ error: rateLimitMessage(limit.retryAfterMs) });
  }
  const { username, password, displayName } = req.body || {};
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
    registerAttemptLimiter.recordFailure(req.ip);
    return res.status(400).json({
      error: 'Benutzername muss 3-30 Zeichen lang sein (nur Buchstaben, Zahlen, "_", "-" und ".").',
    });
  }
  if (typeof password !== 'string' || password.length < 8) {
    registerAttemptLimiter.recordFailure(req.ip);
    return res.status(400).json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein' });
  }
  if (userStore.findUser(username)) {
    registerAttemptLimiter.recordFailure(req.ip);
    return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben' });
  }
  const user = userStore.upsertUser({ username, password, displayName });
  seedNewUserState(user.username);
  registerAttemptLimiter.recordSuccess(req.ip);

  // Direkt anmelden, genau wie bei /api/login - nach dem Anlegen soll man
  // sofort in der frisch eingerichteten App landen.
  const sid = createSession(user.username);
  res.cookie(SESSION_COOKIE_NAME, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
  res.json({ ok: true, username: user.username, displayName: user.displayName });
});

// Kein gemeinsamer express.static() mehr (der würde allen Benutzern denselben
// Ordner zeigen) - jede Anfrage wird stattdessen aus dem privaten Dateiordner
// des gerade angemeldeten Benutzers bedient (req.username kommt vom
// Anmelde-Mittelsmann weiter oben, /files/* ist dort bewusst nicht öffentlich).
app.get('/files/:filename', (req, res) => {
  const filePath = path.join(userFilesDir(req.username), path.basename(req.params.filename));
  res.sendFile(filePath, { maxAge: '1y', immutable: true }, (err) => {
    if (err) res.status(404).end();
  });
});

app.get('/api/state', (req, res) => {
  fs.readFile(userStateFile(req.username), 'utf8', (err, raw) => {
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
  const stateFile = userStateFile(req.username);
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.readFile(stateFile, 'utf8', (readErr, raw) => {
    if (!readErr) {
      try {
        preserveReminderSentAt(req.body, JSON.parse(raw));
      } catch (e) {
        // Beschädigte/alte state.json - ohne Abgleich einfach normal weiterspeichern.
      }
    }
    const json = JSON.stringify(req.body);
    const tmpFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFile(tmpFile, json, (err) => {
      if (err) {
        console.error('Konnte Notizen nicht speichern:', err);
        return res.status(500).json({ error: 'Speichern fehlgeschlagen' });
      }
      // Atomares Umbenennen: verhindert eine kaputte/halb geschriebene state.json,
      // falls der Server genau während des Schreibens abstürzt oder neu startet.
      fs.rename(tmpFile, stateFile, (renameErr) => {
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

async function readUserSettingsFile(username) {
  try {
    const raw = await fs.promises.readFile(userSettingsFile(username), 'utf8');
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
    res.json(sanitizeSettingsForClient(await readUserSettingsFile(req.username)));
  } catch (err) {
    console.error('Konnte Einstellungen nicht lesen:', err);
    res.status(500).json({ error: 'Lesen fehlgeschlagen' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const current = await readUserSettingsFile(req.username);
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
    const settingsFile = userSettingsFile(req.username);
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    const json = JSON.stringify(next, null, 2);
    const tmpFile = `${settingsFile}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, json);
    await fs.promises.rename(tmpFile, settingsFile);
    res.json(sanitizeSettingsForClient(next));
  } catch (err) {
    console.error('Konnte Einstellungen nicht speichern:', err);
    res.status(500).json({ error: 'Speichern fehlgeschlagen' });
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = userFilesDir(req.username);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
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
  const filePath = path.join(userFilesDir(req.username), path.basename(url));
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
// Die Erinnerungs-E-Mail-Einstellungen sind (noch) global für den ganzen
// Server, nicht pro Benutzer - deshalb wird bei fälligen Erinnerungen über
// alle Benutzer-Konten hinweg geprüft, aber jeweils in deren eigener,
// privater state.json nachgeschaut und gespeichert.
async function checkAndSendDueRemindersForUser(username, settings) {
  const stateFile = userStateFile(username);
  let state;
  try {
    state = JSON.parse(await fs.promises.readFile(stateFile, 'utf8'));
  } catch (err) {
    return; // noch keine state.json für diesen Benutzer - nichts zu tun
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
      console.log(`Erinnerung "${obj.title}" (${username}) an ${settings.reminderEmail} verschickt.`);
    } catch (err) {
      console.error(`Erinnerung "${obj.title}" (${username}) konnte nicht verschickt werden:`, err.message);
      // sentAt bleibt leer - der nächste Durchlauf versucht es automatisch erneut.
    }
  }

  if (anySent) {
    const json = JSON.stringify(state);
    const tmpFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, json);
    await fs.promises.rename(tmpFile, stateFile);
  }
}

async function checkAndSendDueReminders() {
  if (reminderCheckRunning) return;
  reminderCheckRunning = true;
  try {
    for (const user of userStore.readUsers()) {
      const settings = await readUserSettingsFile(user.username);
      if (!settings.reminderEmail || !settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
        continue; // dieser Benutzer hat (noch) keine eigene Erinnerungs-Mail eingerichtet
      }
      await checkAndSendDueRemindersForUser(user.username, settings);
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
