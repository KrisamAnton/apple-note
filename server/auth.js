const fs = require('fs');
const crypto = require('crypto');

// ---------- Passwörter (scrypt statt bcrypt, da bereits Teil von Node selbst -
// keine zusätzliche Abhängigkeit nötig) ----------

const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

// ---------- Benutzer (users.json im Daten-Verzeichnis, wie state.json/
// settings.json nie im Repo/über den statischen Datei-Server erreichbar) ----------

function makeUserStore(usersFile) {
  function readUsers() {
    try {
      const raw = fs.readFileSync(usersFile, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.users) ? parsed.users : [];
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }
  function writeUsers(users) {
    const json = JSON.stringify({ users }, null, 2);
    const tmpFile = `${usersFile}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, json);
    fs.renameSync(tmpFile, usersFile);
  }
  function findUser(username) {
    const normalized = String(username || '').trim().toLowerCase();
    if (!normalized) return null;
    return readUsers().find((u) => u.username.toLowerCase() === normalized) || null;
  }
  function upsertUser({ username, password, displayName }) {
    const users = readUsers();
    const normalized = String(username || '').trim();
    const { salt, hash } = hashPassword(password);
    const idx = users.findIndex((u) => u.username.toLowerCase() === normalized.toLowerCase());
    const record = {
      id: idx >= 0 ? users[idx].id : crypto.randomUUID(),
      username: normalized,
      displayName: (displayName && displayName.trim()) || normalized,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: idx >= 0 ? users[idx].createdAt : Date.now(),
    };
    if (idx >= 0) users[idx] = record;
    else users.push(record);
    writeUsers(users);
    return record;
  }
  function updatePassword(username, newPassword) {
    const users = readUsers();
    const normalized = String(username || '').trim().toLowerCase();
    const idx = users.findIndex((u) => u.username.toLowerCase() === normalized);
    if (idx === -1) return null;
    const { salt, hash } = hashPassword(newPassword);
    users[idx] = { ...users[idx], passwordSalt: salt, passwordHash: hash };
    writeUsers(users);
    return users[idx];
  }
  return { readUsers, findUser, upsertUser, updatePassword };
}

// ---------- Sitzungen ----------
//
// Nur im Arbeitsspeicher: ein Neustart des Servers meldet alle wieder ab.
// Für eine kleine, private App bewusst so einfach gehalten, statt dafür eine
// eigene dauerhafte Sitzungs-Ablage zu bauen.

const SESSION_COOKIE_NAME = 'krisnote_sid';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

const sessions = new Map(); // sid -> { username, expiresAt }

function createSession(username) {
  const sid = crypto.randomBytes(32).toString('hex');
  sessions.set(sid, { username, expiresAt: Date.now() + SESSION_MAX_AGE_MS });
  return sid;
}

function getSession(sid) {
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(sid);
    return null;
  }
  return session;
}

function destroySession(sid) {
  sessions.delete(sid);
}

// Kein cookie-parser nötig - res.cookie()/res.clearCookie() sind bereits Teil
// von Express selbst, nur das Lesen eingehender Cookies übernehmen wir hier
// von Hand (ein einzelnes Sitzungs-Cookie zu parsen ist trivial).
function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  makeUserStore,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  parseCookies,
};
