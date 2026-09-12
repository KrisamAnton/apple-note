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
- **Direkt lostippen**: ein Klick/Tipp auf eine leere Stelle der Fläche
  legt sofort ein freies Textobjekt an diesem Punkt an und aktiviert den
  Bearbeitungsmodus – wie in OneNote. Es reagiert dabei erst, wenn
  feststeht, dass es sich um einen echten Tipp handelt (kurz, ohne
  Bewegung, nur ein Finger) – ein Wischen zum Scrollen oder eine
  Zwei-Finger-Geste lösen kein Textobjekt aus. Bleibt die Stelle leer,
  verschwindet das Textobjekt beim Verlassen automatisch wieder. Solange
  es leer ist, zeigt sich auch kein Rahmen, keine Werkzeugleiste und kein
  Ziehpunkt – nur ein blinkender Cursor; die Fläche startet klein und
  wächst beim Tippen automatisch mit
- **Verschieben über einen eigenen Ziehpunkt**: jedes ausgewählte Objekt
  (Text/Bild/PDF) zeigt oberhalb eine kleine Leiste mit einem
  Griff-Symbol – daran lässt es sich zuverlässig verschieben, unabhängig
  vom Inhalt und auch auf Touch-Geräten (wie in OneNote)
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
    jederzeit im normalen PDF-Reader des Browsers öffnen. Bei einer als
    Seiten eingefügten PDF lässt sich der Seiteninhalt unabhängig von der
    Fenstergröße vergrößern (Mausrad) und verschieben (Umschalt + Ziehen),
    ohne das Objekt selbst zu bewegen – ein Ziehen ohne Umschalt bewegt
    weiterhin das ganze Objekt auf der Fläche
  - Text lässt sich auf ein Bild oder ein PDF ziehen, um ihn dort als
    Beschriftung anzuheften – er bewegt und skaliert sich dann mit dem
    Objekt mit, bleibt aber jederzeit per Doppelklick editierbar. Auf
    einer als Seiten eingefügten PDF lässt sich außerdem direkt zeichnen
    (Zeichnen-Modus) – Text und Zeichnung funktionieren gleichzeitig und
    beides kann genau wie bei einem Bild an der PDF verankert werden
- **Sprachnotizen aufnehmen**: über das Mikrofon-Symbol im Ribbon direkt im
  Browser aufnehmen (nochmal klicken zum Beenden, der Button pulsiert rot
  währenddessen). Die Aufnahme wird als eigenes Objekt mit Abspiel-Player an
  der aktuellen Position auf der Fläche abgelegt – so lässt sie sich genau
  neben dem passenden Textabschnitt platzieren
  - **In Text umwandeln**: über den Knopf am Aufnahme-Objekt eine
    Transkription im Hintergrund anstoßen (läuft lokal auf dem Server, auch
    bei langen Aufnahmen von 30–90 Minuten – dauert dann einfach
    entsprechend länger, ohne den Rest der App zu blockieren). Ist ein
    Hugging-Face-Zugriffstoken hinterlegt (siehe „Self-Hosting" unten), wird
    zusätzlich versucht, verschiedene Sprecher zu erkennen (Sprecher 1, 2, …);
    jeder Sprecher-Name im Transkript lässt sich anklicken, um ihn
    umzubenennen
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
- **Kneif-Zoom** auf der Fläche (10–400 %): für eine bessere Übersicht
  herauszoomen und gezielt in den benötigten Bereich hineinzoomen –
  auf der leeren Fläche selbst ist dabei nur der Doppel-Tipp-Zoom
  deaktiviert (der würde sonst mit "Tipp erzeugt Text" kollidieren)
- Als PWA installierbar ("Zum Home-Bildschirm hinzufügen" in Safari)
- App-Shell wird per Service Worker gecacht (schnellerer Start); für
  Notizen, Bilder und PDFs ist aber eine Verbindung zum Server nötig,
  da diese dort gespeichert sind

## Daten

Alle Notizen, Ordner, Bilder und PDFs werden auf einem eigenen kleinen
**Server gespeichert** (nicht mehr im Browser). Das bedeutet:

- Die App ist von jedem Gerät im selben Netzwerk (bzw. über die
  konfigurierte Adresse) aus mit demselben Datenstand erreichbar –
  keine getrennten Datenstände pro Gerät/Browser mehr.
- Es gibt praktisch **kein Speicherlimit** mehr wie beim früheren
  `localStorage` (ca. 5–10 MB): Bilder und PDFs werden als normale
  Dateien auf der Festplatte des Servers abgelegt, die Notizdaten
  selbst (Texte, Positionen) bleiben eine kleine JSON-Datei. Auch
  viele große PDFs (z. B. 100 Stück à 30 MB) sind kein Problem, solange
  auf dem Server genug Festplattenplatz vorhanden ist.
- Es gibt weiterhin **kein Login/Benutzerkonto** – jeder, der die
  Adresse des Servers erreicht, sieht denselben Datenstand. Das ist für
  eine Einzelperson/Familie im eigenen Netzwerk unkritisch, sollte aber
  nicht ohne Zugriffsschutz öffentlich ins Internet gestellt werden.
- Fällt die Verbindung zum Server aus, erscheint beim Speichern eine
  deutliche Warnung, damit nie unbemerkt eine Änderung verloren geht.

## Technik

Frontend bewusst ohne Build-Prozess und ohne Frameworks umgesetzt –
reines HTML/CSS/JavaScript. Dazu ein kleiner, eigenständiger
Node.js-Server für Speicherung und Datei-Uploads:

```
index.html        Grundgerüst (3-Spalten-Layout)
css/styles.css     Styling im Apple-Notes-Look (hell/dunkel)
js/app.js          App-Logik (State, Rendering, freie Zeichenfläche, Server-Anbindung)
js/vendor/         Lokal eingebundene pdf.js-Bibliothek (Apache-2.0, für PDF-Vorschau)
manifest.json      PWA-Manifest
sw.js              Service Worker (Offline-Cache der App-Shell; API-Anfragen ausgenommen)
icons/             App-Icons für Home-Bildschirm / Manifest
server/            Node.js/Express-Server (Notizen + Datei-Uploads, siehe unten)
data/              Vom Server angelegt: state.json (Notizdaten) + files/ (Bilder/PDFs).
                   Nicht Teil des Repositorys (.gitignore), da es die echten Nutzdaten sind.
```

Die externen Abhängigkeiten sind [pdf.js](https://mozilla.github.io/pdf.js/)
(Mozilla, Apache-2.0-Lizenz) zum Rendern von PDF-Seiten im Frontend –
lokal mitgeliefert, kein CDN – sowie im Server `express` (Webserver)
und `multer` (Datei-Uploads), installiert über `npm`.

## Lokal ausführen

```bash
cd server
npm install
npm start
```

Danach im Browser `http://localhost:3000` öffnen (Port über die
Umgebungsvariable `PORT` änderbar). Der Server liefert sowohl die
App selbst als auch die API (`/api/state`, `/api/upload`) aus.

## Self-Hosting (z. B. auf einem eigenen Server/Proxmox)

Der Server ist bewusst einfach gehalten (keine Datenbank, kein
Login) und lässt sich auf jedem Rechner mit Node.js betreiben, der
dauerhaft erreichbar ist:

```bash
git clone <dieses Repository>
cd apple-note/server
npm install
PORT=3000 npm start
```

Für den Dauerbetrieb empfiehlt sich ein Prozess-Manager wie `pm2` oder
ein systemd-Service, damit der Server nach einem Neustart automatisch
wieder hochfährt. Die Adresse (z. B. eine eigene Domain/Subdomain)
lässt sich per Reverse Proxy (z. B. Cloudflare Tunnel, nginx) auf den
internen Server-Port weiterleiten. Alle Notizdaten und hochgeladenen
Dateien liegen unter `server/../data/` (per Umgebungsvariable
`DATA_DIR` änderbar) – dieses Verzeichnis sollte regelmäßig gesichert
werden.

### Transkription einrichten (optional)

Damit „In Text umwandeln" funktioniert, muss zusätzlich Python 3 mit
den Paketen aus `server/requirements.txt` installiert sein (siehe die
Kommentare dort für den genauen `pip3`-Befehl – CPU-only, spart
Speicherplatz). Ohne weitere Einrichtung wird nur der reine Text
erkannt (ein Sprecher). Für die Sprechererkennung zusätzlich:

1. Kostenlosen Account auf [huggingface.co](https://huggingface.co) anlegen.
2. Den Nutzungsbedingungen von
   [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
   zustimmen (Button auf der Modell-Seite).
3. Unter [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   ein Zugriffstoken (Read) erstellen.
4. Als Umgebungsvariable `HF_TOKEN` für den Server hinterlegen (z. B. im
   systemd-Service).

Die Modellgröße für die Texterkennung lässt sich über `WHISPER_MODEL`
einstellen (Standard: `medium` – gute Qualität, läuft auf einer
modernen CPU ohne Grafikkarte in etwa 1-3-facher Aufnahmedauer;
`small` ist schneller, aber etwas ungenauer). Transkriptionen laufen
serverseitig strikt nacheinander und mit niedrigster Prozess-Priorität,
damit eine lange Aufnahme weder die App selbst noch andere Dienste auf
demselben Server ausbremst.

## Nächste Schritte

Individuelle Anpassungen und weitere Features werden in den nächsten
Schritten besprochen und umgesetzt.
