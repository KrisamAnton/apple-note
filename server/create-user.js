#!/usr/bin/env node
// Legt einen Benutzer an oder ändert dessen Passwort - per SSH auf dem Server
// auszuführen:
//   node server/create-user.js <benutzername> <passwort> [Anzeigename]

const path = require('path');
const fs = require('fs');
const { makeUserStore } = require('./auth');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const [, , username, password, ...rest] = process.argv;
const displayName = rest.join(' ').trim();

if (!username || !password) {
  console.error('Verwendung: node server/create-user.js <benutzername> <passwort> [Anzeigename]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Das Passwort sollte mindestens 8 Zeichen lang sein.');
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const store = makeUserStore(USERS_FILE);
const existed = !!store.findUser(username);
const user = store.upsertUser({ username, password, displayName });

console.log(
  `${existed ? 'Aktualisiert' : 'Angelegt'}: Benutzer "${user.username}"` +
    `${user.displayName !== user.username ? ` (${user.displayName})` : ''}.`
);
