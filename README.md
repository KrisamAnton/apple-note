# KrisNote (Apple Notes PWA)

Eine Notizen-App als Progressive Web App (PWA), die sich optisch und
strukturell an Apple Notes (iPad) anlehnt: linke Spalte mit Ordnern,
mittlere Spalte mit der Notizliste, rechte Spalte mit dem Editor
(Split-View).

**Status:** Schritt 1 – Grundgerüst mit den Kernfunktionen. Weitere
Anpassungen und Features folgen in späteren Schritten.

## Funktionen

- Notizen erstellen, bearbeiten und löschen
- Ordner anlegen, umbenennen (Doppelklick) und löschen
- Notizen zwischen Ordnern verschieben
- Volltextsuche über alle Notizen
- Helles und dunkles Erscheinungsbild (folgt den Systemeinstellungen)
- Responsive: Split-View auf iPad/Desktop, Einzelspalten-Navigation auf
  kleinen Bildschirmen
- Als PWA installierbar ("Zum Home-Bildschirm hinzufügen" in Safari)
- Funktioniert offline (App-Shell wird per Service Worker gecacht)

## Daten

Alle Notizen und Ordner werden aktuell ausschließlich lokal im Browser
gespeichert (`localStorage`). Es findet keine Synchronisierung zwischen
Geräten statt – das ist für einen späteren Schritt vorgesehen.

Es gibt noch **kein Login/Benutzerkonto**. Jedes Gerät bzw. jeder
Browser hat automatisch seinen eigenen, getrennten lokalen Speicher –
nutzen also z. B. zwei Personen jeweils ihr eigenes Gerät, sehen sie
nur ihre eigenen Notizen. Teilen sie sich dasselbe Gerät/denselben
Browser, sehen sie hingegen dieselben Notizen, da es (noch) keine
Trennung nach Benutzer auf einem gemeinsamen Gerät gibt.

## Technik

Bewusst ohne Build-Prozess und ohne Frameworks umgesetzt – reines
HTML/CSS/JavaScript:

```
index.html      Grundgerüst (3-Spalten-Layout)
css/styles.css   Styling im Apple-Notes-Look (hell/dunkel)
js/app.js        App-Logik (State, Rendering, localStorage)
manifest.json    PWA-Manifest
sw.js            Service Worker (Offline-Cache der App-Shell)
icons/           App-Icons für Home-Bildschirm / Manifest
```

## Lokal ausführen

Da die App aus statischen Dateien besteht, reicht ein einfacher
Webserver (Service Worker benötigen HTTP/HTTPS, `file://` funktioniert
nicht zuverlässig):

```bash
# z. B. mit Python
python3 -m http.server 8000

# oder mit Node
npx serve .
```

Danach im Browser `http://localhost:8000` öffnen.

## Auf dem iPad testen (GitHub Pages)

Die App wird über GitHub Pages bereitgestellt, sodass sie direkt in
Safari auf dem iPad geöffnet werden kann:

1. In den Repository-Einstellungen unter **Settings → Pages** als
   Quelle **„Deploy from a branch“** und den Branch `main`
   (Ordner `/root`) auswählen.
2. Nach dem Deployment ist die App unter
   `https://krisamanton.github.io/apple-note/` erreichbar.
3. Auf dem iPad in Safari öffnen, dann über das Teilen-Menü
   **„Zum Home-Bildschirm“** hinzufügen, um die App wie eine native
   App zu installieren.

## Nächste Schritte

Individuelle Anpassungen, Sync zwischen Geräten und weitere Features
werden in den nächsten Schritten besprochen und umgesetzt.
