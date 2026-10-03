# Woiswos

Private Lagerverwaltung ("Wo is was?") für Werkzeug, Bastelmaterial und alles
andere, was man zu Hause aufbewahrt. Läuft als kleine Web-App, die man am
Handy im Browser bedient. Aufgebaut nach dem Prinzip klassischer
Lagerverwaltungen (z. B. Microsoft Dynamics AX): Lagerplätze mit Nummern,
Artikelstamm, Bestand pro Lagerplatz und ein Buchungsprotokoll.

**Status:** Laufende Weiterentwicklung. Weitere Funktionen werden Schritt für
Schritt besprochen und umgesetzt.

## Grundprinzip

- **Lagerplatz** - hat eine **Nummer** (frei wählbar, auch mit Leerzeichen, z. B.
  `100 01 03` = Regal 100, Ebene 01, Fach 03) oder eine automatisch
  fortlaufende (`LP-0001`, bei Boxen `BOX-0001`). Zwei Arten:
  - 🗄️ **Fester Lagerplatz**: Raum, Regal, Schublade, Fach … - bleibt, wo er ist
  - 📦 **Variabler Lagerplatz (Box)**: Box, Kiste, Schachtel … - lässt sich umlagern, mit
    allem, was darin liegt
- **Artikel** - Stammdaten (Artikelnummer, Name, Einheit, Foto, Notiz), **einmal** pro
  Artikel. Nummer frei wählbar oder automatisch (`ART-0001`).
- **Bestand** - wie viel von einem Artikel auf welchem Lagerplatz liegt. Derselbe
  Artikel kann an mehreren Plätzen liegen (12 Stk im Fach, 5 Stk in der Kiste).
- **Buchungen** - Einlagern, Umlagern (auch Teilmengen), Ausbuchen. Jede Buchung
  steht im Verlauf des Artikels.

Lagerplätze verschachteln sich beliebig tief:

    Elektrowerkstatt › 100 01 03 › Kiste blau › (Taster rot, 5 Stk)

Regel: Ein fester Lagerplatz liegt nie in einer Box. Eine Box darf in einer Box liegen.

## Funktionen

- Lagerplätze und Artikel anlegen, bearbeiten, verschieben, löschen
- Nummern frei vergeben oder automatisch fortlaufend; Nummern sind eindeutig
  (Groß-/Kleinschreibung und mehrfache Leerzeichen werden ignoriert)
- Bestand einlagern / umlagern / ausbuchen, mit Notiz und Verlauf
- Fotos für Lagerplätze und Artikel (am Handy direkt mit der Kamera), Miniaturen in
  Listen, Suche und Lagerplatz-Auswahl
- Suche über Nummer, Name und Notiz bei Lagerplätzen und Artikeln; zeigt den Pfad
- **QR-Etiketten drucken** für Lagerplätze (einzeln, mit allen Unterplätzen oder alle)
  und Artikel: Formate 62 × 29 mm, 50 × 30 mm, 100 × 50 mm (Etikettendrucker) und
  A4-Bögen (70 × 37 mm, 105 × 57 mm). Der QR-Code enthält `P:<Nummer>` (Lagerplatz)
  bzw. `A:<Nummer>` (Artikel); die Nummer steht zusätzlich als Klartext auf dem Etikett.

**Noch nicht enthalten** (kommt in späteren Schritten): Scannen mit der Handykamera,
Verleih-Verwaltung, Login/Passwort.
Bis es einen Login gibt, die App **nur im Heimnetz** betreiben und nicht ins
Internet freigeben.

## Update von einer älteren Version

Beim ersten Start mit dieser Version wird eine bestehende Datenbank automatisch
umgewandelt: bisherige Lagerplätze und Boxen bekommen automatische Nummern, jeder
bisherige Artikel wird ein Artikel mit Bestand an seinem bisherigen Platz, Fotos
bleiben erhalten. Die alten Tabellen bleiben unverändert als `legacy_*` in der
Datenbank (zusätzliches Backup). Vorher trotzdem den Ordner `data/` kopieren.

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

## Drittanbieter

QR-Codes erzeugt [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)
von Kazuhiko Arase (MIT-Lizenz), eingebunden als `public/vendor/qrcode.js`.
