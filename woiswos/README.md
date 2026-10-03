# Woiswos

Private Lagerverwaltung ("Wo is was?") für Werkzeug, Bastelmaterial und alles
andere, was man zu Hause aufbewahrt. Läuft als kleine Web-App, die man am
Handy im Browser bedient.

**Status:** Schritt 1 von mehreren. Weitere Funktionen werden Schritt für
Schritt besprochen und umgesetzt.

## Grundprinzip

Es gibt nur **Einträge** in einer Tabelle, in drei Typen:

- **🗄️ Fester Lagerplatz**: Raum, Regal, Schublade, Fach … - bleibt, wo er ist
- **📦 Variabler Lagerplatz (Box)**: Box, Kiste, Schachtel, Beutel … - lässt sich umlagern
- **🔹 Artikel**: der eigentliche Gegenstand mit Menge

Plätze und Boxen können etwas enthalten und sich beliebig tief verschachteln:

    Schrankraum › Regal 1 › Schachtel A › Box blau › Schalter (3×)

Regel: Ein fester Lagerplatz liegt nie in einer Box. Jeder Eintrag kann ein
**Foto** bekommen (am Handy direkt mit der Kamera), das als Miniatur in den
Listen und bei der Lagerplatz-Auswahl erscheint.

- Die Suche zeigt zu jedem Treffer den kompletten Pfad.
- Wird eine Box verschoben, wandert ihr Inhalt automatisch mit.
- Löschen entfernt den Eintrag samt Inhalt (mit Rückfrage und Anzahl).
- Ein Eintrag kann nicht in sich selbst oder in seinen Inhalt verschoben werden; in einen Artikel kann nichts gelegt werden.
- Jeder Eintrag hat einen festen Code (`W-000042`), der später für QR-Etiketten genutzt wird.

## Funktionen in Schritt 1

- Lagerplätze und Artikel anlegen (zwei getrennte Knöpfe), bearbeiten (Typ, Name, Menge, Notiz, Foto), verschieben („Ort ändern…“), löschen
- Fotos: Aufnahme oder Auswahl, automatische Verkleinerung, Miniatur in Listen und Ortsauswahl
- Beliebig tiefe Verschachtelung mit Pfad-Navigation
- Suche über Name und Notiz
- Handyfreundliche Oberfläche, Hell/Dunkel automatisch

**Noch nicht enthalten** (kommt in späteren Schritten): Verleih-Verwaltung,
QR-/Barcode-Etiketten und Scannen, Login/Passwort.
Bis es einen Login gibt, die App **nur im Heimnetz** betreiben und nicht
ins Internet freigeben.

## Starten

Voraussetzung: Node.js ab Version 22.13 (keine weiteren Pakete nötig).

    cd woiswos
    npm start

Dann `http://localhost:3000` öffnen. Die Daten liegen in `woiswos/data/woiswos.db`
(anderer Ort per Umgebungsvariable `DATA_DIR`, anderer Port per `PORT`).

### Mit Docker (z. B. auf dem Proxmox-Server)

    cd woiswos
    docker compose up -d --build

Die Datenbank liegt dann in `woiswos/data/` und bleibt bei Updates erhalten.
**Backup** = diesen Ordner kopieren.

## Tests

    npm test
