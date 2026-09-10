# KrisNote

Eine Notizen-App als Progressive Web App (PWA). Die drei Spalten
(Ordner / Notizliste / Editor) sind an Apple Notes angelehnt, der
Editor selbst ist bewusst eine **freie Zeichenfläche** (ähnlich Apples
"Freeform"-App statt des linearen Notes-Textflusses): Text-, Skizzen-
und Bild-Objekte lassen sich frei auf der Fläche platzieren, verschieben,
in der Größe ändern und aneinander anheften.

**Status:** Laufende Weiterentwicklung. Weitere Anpassungen und
Features werden Schritt für Schritt besprochen und umgesetzt.

## Funktionen

- Notizen erstellen, bearbeiten und löschen
- Ordner anlegen, umbenennen (Doppelklick) und löschen
- Notizen zwischen Ordnern verschieben
- Volltextsuche über alle Notizen
- **Freie Zeichenfläche pro Notiz** mit beliebig vielen Objekten:
  - **Text**: per Doppelklick bearbeiten, frei positionieren und skalieren.
    Beim Hinzufügen wählbar zwischen **Textfeld** (mit Rahmen/Hintergrund)
    und **Freier Text** (ohne sichtbaren Rahmen, liegt direkt auf der
    Fläche – z. B. zum Beschriften auf linierten Seiten)
  - **Bild**: aus der Fotomediathek/Dateien einfügen
  - **PDF**: einfügen als Vorschaubild der ersten Seite (mit Datei-
    /Seitenzahl-Badge); wird wie ein Bild-Objekt behandelt
  - Text lässt sich auf ein Bild oder ein PDF ziehen, um ihn dort als
    Beschriftung anzuheften – er bewegt und skaliert sich dann mit dem
    Objekt mit, bleibt aber jederzeit per Doppelklick editierbar
- **Zeichnen-Modus** (Stift-Symbol) für die ganze Fläche: mit Finger
  (Touch) oder Stift (z. B. Apple Pencil, inkl. Druckstärke) direkt auf
  der Fläche zeichnen – auch über Bildern/PDFs. Farbwahl, Radiergummi,
  Rückgängig, Alles löschen. Bleibt als Vektor-Strichdaten nachträglich
  korrigierbar, kein begrenztes Zeichenfeld
  - **Striche direkt anklicken**: auch außerhalb des Zeichnen-Modus –
    einfach auf eine Zeichnung klicken, um sie zu verschieben, in der
    Größe zu ändern oder zu löschen, ohne extra den Stift zu aktivieren
  - **Lasso-Auswahl** (zweites Werkzeug im Zeichnen-Modus): mehrere
    Striche umkreisen, um nur diese zu verschieben, in der Größe zu
    ändern oder zu löschen – wie in einem Zeichenprogramm. Der
    „Löschen"-Button in der Werkzeugleiste löscht dann nur die
    Auswahl statt aller Zeichnungen
  - Eine Auswahl lässt sich an ein Bild/PDF **anheften**: bewegt und
    skaliert sich danach mit dem Objekt mit (z. B. eine Markierung
    direkt auf einem Foto), bleibt aber jederzeit über „Lösen" wieder
    frei verschiebbar
- **Hintergrund umstellen** (Raster-Symbol): Punkte, Linien oder leer
  (Whiteboard) – pro Notiz einstellbar
- Helles und dunkles Erscheinungsbild (folgt den Systemeinstellungen)
- Responsive: Split-View auf iPad/Desktop, Einzelspalten-Navigation auf
  kleinen Bildschirmen
- Als PWA installierbar ("Zum Home-Bildschirm hinzufügen" in Safari)
- Funktioniert offline (App-Shell wird per Service Worker gecacht)

**Bekannte Einschränkung:** Von einem PDF wird aktuell nur die erste
Seite als Bild dargestellt (kein Blättern durch mehrseitige PDFs).

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
index.html       Grundgerüst (3-Spalten-Layout)
css/styles.css    Styling im Apple-Notes-Look (hell/dunkel)
js/app.js         App-Logik (State, Rendering, freie Zeichenfläche, localStorage)
js/vendor/        Lokal eingebundene pdf.js-Bibliothek (Apache-2.0, für PDF-Vorschau)
manifest.json     PWA-Manifest
sw.js             Service Worker (Offline-Cache der App-Shell)
icons/            App-Icons für Home-Bildschirm / Manifest
```

Die einzige externe Abhängigkeit ist [pdf.js](https://mozilla.github.io/pdf.js/)
(Mozilla, Apache-2.0-Lizenz) zum Rendern von PDF-Seiten – lokal im
Repository mitgeliefert (kein CDN, funktioniert auch offline) und wird
nur bei Bedarf nachgeladen, wenn tatsächlich eine PDF eingefügt wird.

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
