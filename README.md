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
- **Unterseiten**: jede Notiz kann beliebig viele Unterseiten bekommen,
  und diese wiederum eigene Unterseiten (wie in OneNote) – über das
  „+"-Symbol, das beim Überfahren einer Notiz in der Liste erscheint.
  Die Notizliste zeigt das Ganze als ein- und ausklappbaren Baum;
  Löschen fragt nach und entfernt dann die gesamte Unterseiten-Kette,
  Verschieben in einen anderen Ordner nimmt den Unterbaum automatisch mit
- Ordner anlegen, umbenennen (Doppelklick), farblich kennzeichnen
  (Klick auf den Farbpunkt) und löschen
- Notizen (samt Unterseiten) zwischen Ordnern verschieben
- Volltextsuche über Titel **und** Inhalt aller Notizen – durchsucht
  bei aktiver Suche bewusst alle Ordner und Unterseiten, nicht nur den
  gerade geöffneten Ordner
- **Freie Zeichenfläche pro Notiz** mit beliebig vielen Objekten:
  - **Text**: per Doppelklick bearbeiten, frei positionieren und skalieren.
    Beim Hinzufügen wählbar zwischen **Textfeld** (mit Rahmen/Hintergrund)
    und **Freier Text** (ohne sichtbaren Rahmen, liegt direkt auf der
    Fläche – z. B. zum Beschriften auf linierten Seiten). Bei „Freier
    Text" auf linierten Notizen richtet sich die Schrift automatisch an
    den Linien aus, sodass es wie handschriftlich auf dem Papier wirkt
    - **Formatvorlagen**: eine Zeile als „Überschrift 1"/„Überschrift 2"
      auszeichnen (größer/fett) oder wieder auf „Normal" zurücksetzen –
      wie die Formatvorlagen in Word/OneNote. Wirkt auf die ganze Zeile,
      keine Textauswahl nötig
    - **Textformatierung** (Auswahl markieren, dann in der Werkzeugleiste
      wählen): **Fett**, *Kursiv*, **Unterstrichen**, **Durchgestrichen**,
      **Hoch-/Tiefgestellt**, **Schriftart** (5 Schriftfamilien), 
      **Textfarbe** (8 Farben) und **Schriftgröße** (Klein/Standard/Groß/
      Sehr groß) – wie in einer Textverarbeitung
    - **Aufzählungszeichen** und **Nummerierung**: wirken auf die aktuelle
      Zeile bzw. Auswahl, wie in Word/OneNote
    - **Textmarker**: einen Textabschnitt markieren und über das
      Marker-Symbol in der Werkzeugleiste hervorheben – 5 Farben in
      je 3 Stärken (Leicht/Mittel/Stark). Hervorhebungen, Farbe und
      Schriftgröße lassen sich über die jeweilige „Entfernen"/
      „Standard"-Option wieder aufheben
- **Werkzeugleiste im Ribbon-Stil** (an OneNote angelehnt): gruppierte
  Buttons mit Trennlinien (Formatvorlagen/Listen/Einfügen/Seite). Die
  Formatierungswerkzeuge (Überschrift, Schriftart, Fett, Kursiv,
  Unterstrichen, Durchgestrichen, Hoch-/Tiefgestellt, Textfarbe,
  Markieren, Schriftgröße, Aufzählung, Nummerierung) sitzen dauerhaft
  in der Leiste – aktivieren sich automatisch, sobald ein Text-Objekt
  bearbeitet wird, statt nur in einem Popup am ausgewählten Objekt zu
  erscheinen. Das Suchfeld über der Notizliste ist optisch in dieselbe
  Kopfleiste eingebunden (gleiche Höhe, Hintergrund und Trennlinie wie
  das Ribbon), sodass beides wie eine durchgehende Leiste wirkt
- **Direkt lostippen**: ein Klick auf eine leere Stelle der Fläche legt
  sofort ein freies Textobjekt an diesem Punkt an und aktiviert den
  Bearbeitungsmodus – wie in OneNote. Bleibt die Stelle leer, verschwindet
  das Textobjekt beim Verlassen automatisch wieder
- **Notiz-/Unterseiten-Zeile**: das Löschen einer Notiz oder Unterseite
  erfolgt ausschließlich über den roten Papierkorb-Button ganz rechts in
  der jeweiligen Zeile (nicht mehr über die Werkzeugleiste), damit eine
  komplexe Seite nicht versehentlich gelöscht wird. Der Auf-/Zuklapp-Pfeil
  bei Notizen mit Unterseiten ist bewusst groß und kräftig gehalten, damit
  auf den ersten Blick erkennbar ist, dass Unterseiten vorhanden sind
- **Spaltenbreiten manuell anpassbar**: die Trennlinien zwischen Ordnern,
  Notizliste und Editor lassen sich per Maus/Touch nach links oder rechts
  ziehen; die eingestellten Breiten bleiben über einen Neuladen hinweg
  erhalten
  - **Bild**: aus der Fotomediathek/Dateien einfügen
  - **PDF**: über den Werkzeugleisten-Button oder per Drag & Drop direkt
    aus dem Dateisystem auf die Fläche ziehen. Danach wird gefragt, ob
    nur die Datei als kompakte Ablage (Symbol mit Dateiname/Seitenzahl)
    abgelegt werden soll, oder ob alle Seiten der PDF vollständig
    untereinander auf die Fläche gedruckt werden sollen (wie „Ausdruck
    einfügen" in OneNote) – beide Varianten lassen sich frei verschieben.
    Die Original-Datei wird in beiden Fällen mit abgespeichert und lässt
    sich über den „PDF öffnen"-Knopf (bzw. Klick auf die Datei-Ablage)
    jederzeit im normalen PDF-Reader des Browsers öffnen
  - Text lässt sich auf ein Bild oder ein PDF ziehen, um ihn dort als
    Beschriftung anzuheften – er bewegt und skaliert sich dann mit dem
    Objekt mit, bleibt aber jederzeit per Doppelklick editierbar. Auf
    einer als Seiten eingefügten PDF lässt sich außerdem direkt zeichnen
    (Zeichnen-Modus) – Text und Zeichnung funktionieren gleichzeitig und
    beides kann genau wie bei einem Bild an der PDF verankert werden
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
