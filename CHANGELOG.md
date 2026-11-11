# Änderungsverlauf

Hier steht, was wann geändert wurde (neueste Einträge oben). Die Versionsnummer
steht klein neben dem Benutzernamen; bei jeder Änderung erhöht sich die letzte
Zahl (1.7.1 → 1.7.2 → …).

## 1.7.30 - 11.11.2026

- Neu: **Tickets anzeigen**. In jedem Eintrag einer Sammlung gibt es oben den Knopf „🎫 Tickets anzeigen" (und in der Tabelle ein kleines „🎫 3"). Er öffnet eine Vollbild-Ansicht: **ein Ticket pro Bildschirm**, mit dem Finger oder dem Mausrad von oben nach unten durchblätterbar. Die Tickets werden scharf dargestellt und lassen sich **vergrößern** (Knöpfe − / +, Doppeltipp oder Zwei-Finger-Zoom), um z. B. den Barcode oder QR-Code zu scannen; vergrößert kann man das Ticket mit dem Finger verschieben. Am Handy bleibt der Bildschirm dabei an.
- Der Schalter links oben wechselt zwischen **„Nur Tickets"** und **„Alle Dateien"**. In „Alle Dateien" kann man bei jedem PDF oder Bild mit „Als Ticket markieren" festlegen, was ein Ticket ist (z. B. Rechnungen bleiben draußen); in „Nur Tickets" gibt es pro Ticket „Kein Ticket".
- Beim automatischen Ablegen in einer Sammlung markiert KrisNote Dokumente, die wie ein Ticket aussehen (Ticketnummer, „Ticket", „Einlass", Barcode/QR), gleich selbst als Ticket. Bereits abgelegte Dateien markierst du einmal in der Ansicht „Alle Dateien".

## 1.7.29 - 11.11.2026

- Sammlungen am Handy: Das Angaben-Fenster oben im Eintrag ist am Handy zuerst **eingeklappt** („Angaben einblenden"), damit man die abgelegten Dateien direkt sieht. Ist es aufgeklappt, lässt es sich **innerhalb des Fensters scrollen** und nimmt höchstens knapp die halbe Bildschirmhöhe ein, die Seite mit den Dateien darunter bleibt sichtbar. Die Felder stehen am Handy in zwei Spalten.
- Der Haken in der Sammlung heißt jetzt „Jedes Dokument vor dem Ablegen manuell prüfen (nicht angehakt: KrisNote legt alles automatisch ab)".

## 1.7.28 - 11.11.2026

- Sammlungen: Der **Titel wird jetzt aus dem Dokument selbst erkannt**, nicht mehr nur aus dem Dateinamen. Du musst Dateien wie „TICKET-2313302972319-3.pdf" nicht umbenennen. KrisNote nimmt z. B. die Zeile über „Samstag, 14.11.2026 19:30" oder die größte Schrift und macht aus GROSSBUCHSTABEN eine normale Schreibweise („Die Schöne und das Biest").
- Mehrere Tickets derselben Bestellung (z. B. „…2972319-1", „-2", „-3") werden automatisch **einem Eintrag** zugeordnet. Ticketnummer dient als Bestellnummer, **Anzahl Karten** und **Preis gesamt** zählen dabei mit (3 × 189 € = 567 €). Mit „Alles rückgängig" wird das ebenfalls zurückgesetzt.
- Mehr wird erkannt: Uhrzeit direkt nach dem Datum („19:30"), Veranstaltungsort aus dem Text („im Raimund Theater"), Art „Musical" bei Vereinigte Bühnen Wien.
- Bilder (Fotos, Screenshots) und gescannte PDFs werden per Texterkennung gelesen, wenn auf dem Server `tesseract-ocr` installiert ist.

## 1.7.27 - 11.11.2026

- Sammlungen: **vollautomatisches Ablegen**. Du kannst jetzt mehrere Dokumente auf einmal auf eine Sammlung ziehen. KrisNote arbeitet sie der Reihe nach ab, liest jedes Dokument, füllt die Angaben aus (Datum, Uhrzeit, Titel, Ort, Preis, Buchungs-/Bestellnummer, Art, Zahlungsart) und entscheidet selbst: gehört es zu einem schon vorhandenen Eintrag (gleiche Buchungsnummer, gleicher Titel, gleiches Datum und Ort), wird es dort abgelegt, sonst entsteht automatisch ein neuer Eintrag. Danach zeigt eine Zusammenfassung, was passiert ist, mit „Öffnen" und **„Alles rückgängig"**.
- Wer lieber jedes Dokument vorher prüfen möchte, hakt in der Sammlung „Jedes Dokument vor dem Ablegen einzeln prüfen" an.
- Besseres Auslesen: Tickets mit mehreren Spalten (z. B. bringticket, ticketdirect), Buchungsbestätigungen (z. B. Booking.com, auch ohne Jahreszahl wie „Fr., 23. Okt."), Datumsformate wie „24.Okt.26", Titel, Veranstaltungsort mit Ort, Beginn statt Einlass.
- Behoben: Wenn der Server aus einem PDF keinen Text lesen konnte, wurde gar nichts erkannt. Jetzt liest KrisNote den Text von PDFs zusätzlich direkt im Browser.

## 1.7.26 - 11.11.2026

- Neu: **Sammlungen**. Über das „+" in der Notizliste gibt es jetzt „Neue Sammlung". Eine Sammlung verwaltet gleichartige Einträge, z. B. Konzert-/Musicalkarten und Reisen, Versicherungen oder Rechnungen. Du wählst eine Vorlage (Veranstaltungen & Reisen, Versicherungen, Rechnungen & Garantien oder leer) und legst die **Felder selbst fest**: Text, Datum, Betrag, Zahl, Auswahl oder Ja/Nein. Die Felder lassen sich jederzeit unter „Felder bearbeiten" ändern, umsortieren und löschen.
- Jeder Eintrag ist eine ganz normale **Unterseite** der Sammlung (mit PDFs, Text, Erinnerungen usw.) und hat oben ein Fenster mit seinen Angaben. Der **Seitentitel entsteht automatisch** aus den Feldern, die „Titel" angehakt haben, z. B. „14.11.2026 Musical - Die Schöne und das Biest". Wird der Titel von Hand geändert, bleibt er so, bis man „Titel automatisch erzeugen" klickt.
- Die Sammlung selbst zeigt alle Einträge als **Tabelle** (nach Datum sortiert, mit Summe der Beträge und Suchfeld). Vergangene Einträge werden nach dem Haupt-Datum automatisch unter „Vergangen" eingeordnet.
- **Dokument hineinziehen**: Ziehst du ein PDF, Bild oder eine Datei auf die Sammlung, liest KrisNote den Text (bei Scans per Texterkennung), erkennt Datum, Beträge, Nummern und Titel und schaut, ob es **schon einen passenden Eintrag gibt** (z. B. über die Polizzennummer oder den Titel). Du siehst vor dem Ablegen einen Vorschlag: „Ablegen bei: ✓ bestehender Eintrag" oder „Neuer Eintrag" mit den erkannten Angaben zum Prüfen und Korrigieren. Erst nach „Ablegen" wird etwas gespeichert.
- Die Angaben der Einträge werden auch von der Suche gefunden.

## 1.7.25 - 30.10.2026

- Neu: **Dateiversionen**. Eine abgelegte Datei (Datei-Symbol oder PDF als Datei) kann jetzt mehrere Versionen haben, ohne dass viele fast gleiche Dateien herumliegen. Ziehst du eine Datei direkt auf ein vorhandenes Datei-Symbol, fragt KrisNote, ob sie als **neue Version** dieser Datei oder als **eigene Datei** abgelegt werden soll. Alternativ gibt es in der grauen Leiste den Knopf „Neue Version hinzufügen" (Pfeil nach oben).
- Öffnen (auch per Doppelklick) und Herunterladen nehmen immer die **neueste** Version. Ab der zweiten Version zeigt das Symbol ein kleines „v2", „v3" usw. Ein Klick darauf (oder auf den Uhr-Knopf in der grauen Leiste) zeigt die **Liste aller Versionen** mit Datum und Größe. Jede Version lässt sich ansehen (Öffnen) oder herunterladen, und eine ältere Version kann „als aktuell festgelegt" werden. Dabei geht keine Version verloren: Es entsteht eine neue Versionsnummer.
- Beim Herunterladen einer älteren Version heißt die Datei z. B. „Stromliste (Version 1).xlsx".
- Das Kürzel auf dem Datei-Symbol (WORD, EXCEL ...) richtet sich bei umbenannten Dateien ohne Endung nach der gespeicherten Datei.

## 1.7.24 - 30.10.2026

- „Herunterladen" lädt Excel-, Word- und andere Office-Dateien jetzt wirklich herunter. Edge hat sie vorher von sich aus im Office-Betrachter im Browser geöffnet. Die Datei wird jetzt direkt von KrisNote geholt und als normaler Download gespeichert. Sehr große Dateien (über 80 MB) laufen über einen Download-Link des Servers.

## 1.7.23 - 30.10.2026

- Abgelegte Dateien lassen sich jetzt **herunterladen**, nicht nur öffnen. In der grauen Leiste über einer Datei, PDF, Sprachaufnahme oder einem Bild gibt es dafür einen neuen Knopf „Herunterladen" (Pfeil nach unten). Das gleiche gilt für PDFs, die mitten im Text liegen, für Dateien im Logbuch (Pfeil neben dem Dateinamen) und für Fotos im Logbuch (Knopf in der Großansicht).
- Die heruntergeladene Datei heißt so, wie sie in KrisNote heißt (auch nach dem Umbenennen), mit der richtigen Dateiendung.

## 1.7.22 - 27.10.2026

- Das Fenster zum Anlegen und Bearbeiten einer Erinnerung (und das der einzelnen Zugangsdaten-Karte) schließt sich nicht mehr, wenn du daneben klickst. Deine Eingaben bleiben erhalten, das Fenster geht nur mit „Speichern" oder „Abbrechen" zu.

## 1.7.21 - 27.10.2026

- Erinnerungen gehören in den Text: Ist ein Textfeld angeklickt (ausgewählt), auch wenn gerade kein Cursor darin blinkt, wird die Erinnerung beim Klick auf den Wecker jetzt als kleines Glockensymbol am Ende dieses Textes eingefügt. Vorher entstand dann eine eigene Karte unter dem Text. Nur wenn nichts ausgewählt ist, entsteht weiterhin eine freie Erinnerungs-Karte.
- Der Browser fragt beim Anlegen einer Erinnerung (und im Logbuch bei Titel und Schlagwort) nicht mehr, ob er ein Kennwort speichern soll.

## 1.7.20 - 24.10.2026

- Neu: **Texterkennung (OCR)**. Die Suche findet jetzt auch Text, der **in Bildern** steht (z. B. fotografierte Rechnungen, Typenschilder, Schilder) und in **gescannten PDFs** ohne eigenen Text. Im Suchergebnis steht dann „Im Bild …" bzw. „In Datei …" mit dem erkannten Textausschnitt. Das gilt für Bilder auf Seiten, im Text und als Anhang im Logbuch.
- Neu in den Einstellungen: **Dateisuche & Texterkennung**. Das Fenster zeigt, ob der Server alles Nötige hat (PDF, Word/Excel/PowerPoint, Texterkennung), wie viele Dateien noch gelesen werden und, falls etwas fehlt, den Befehl zum Nachinstallieren.
- Für die Texterkennung braucht der Server die Pakete `tesseract-ocr`, `tesseract-ocr-deu` und `tesseract-ocr-eng`. Ohne sie funktioniert alles andere ganz normal. Was KI auf Fotos „sieht" (z. B. einen Reifen), wird nicht erkannt, nur lesbarer Text.

## 1.7.19 - 24.10.2026

- Neue Suche: Du kannst jetzt nach **einzelnen Wörtern** suchen. Alle eingegebenen Wörter müssen vorkommen, in beliebiger Reihenfolge, Groß-/Kleinschreibung und Akzente sind egal. Gesucht wird in allen Notizen und Logbüchern auf einmal.
- Die Suche liest jetzt auch den **Inhalt abgelegter Dateien**: PDF, Word, Excel, PowerPoint und Textdateien. Der Server liest den Text im Hintergrund aus, sobald eine Datei vorkommt. Im Ergebnis steht, wo etwas gefunden wurde, z. B. „In Datei Rechnung.pdf, Seite 2" mit einem Textausschnitt. Ein Klick darauf springt zur Datei.
- Unter jedem Suchergebnis stehen jetzt Textausschnitte mit hervorgehobenen Wörtern. Bei Logbüchern steht das Datum des Eintrags, ein Klick springt direkt zu diesem Eintrag. Auch Texte aus Sprachaufnahmen (Transkripte) werden durchsucht.
- Für die Dateisuche braucht der Server das Programm `pdftotext` (Paket poppler-utils) und für Word/Excel/PowerPoint zusätzlich LibreOffice. Fehlt etwas, wird die jeweilige Dateiart übersprungen und später automatisch nachgeholt.

## 1.7.18 - 24.10.2026

- Neu: **Logbuch**. Beim Klick auf das „+" über der Notizliste kannst du jetzt zwischen „Neue Seite" und „Neues Logbuch" wählen. Ein Logbuch ist eine Zeitleiste aus einzelnen Einträgen: oben schreibst du in der Schnellzeile (Strg+Enter trägt ein), dazu optional Titel, Uhrzeit, Schlagwörter sowie Fotos und Dateien als Anhang.
- Logbuch: Die Einträge stehen neueste zuerst, nach Monaten gruppiert. Du kannst im Logbuch suchen, nach Schlagwörtern filtern und zwischen Liste und Kalender umschalten (ein Klick auf einen Tag zeigt nur dessen Einträge). Einträge lassen sich bearbeiten und löschen, Fotos öffnen sich groß. Gibt es einen Eintrag vom selben Tag im Vorjahr, erscheint ein Hinweis.
- Logbuch: Aus einer bestehenden Seite mit Datumszeilen (z. B. „20.10.2026") erzeugt „Logbuch aus dieser Seite erstellen" automatisch ein Logbuch mit einzelnen Einträgen. Die Seite selbst bleibt unverändert.
- Logbücher haben in der Notizliste ein Buch-Symbol und werden von der Suche über alle Notizen mit durchsucht.

## 1.7.17 - 13.10.2026

- Das Mausrad zoomt eine PDF- bzw. Word-Ansicht nur noch, wenn du sie vorher angeklickt (aktiviert) hast. Sonst scrollt es ganz normal die Seite, auch wenn der Mauszeiger gerade über der Datei steht. Klickst du danach etwas anderes oder die leere Fläche an, scrollt das Mausrad wieder die Seite.

## 1.7.16 - 13.10.2026

- Neu: Word-Dokumente (.doc, .docx, .odt, .rtf), die du auf eine Seite ziehst oder einfügst (Strg+V), werden wie eine PDF behandelt: Du wirst gefragt, ob der **Text hier angezeigt** werden soll oder ob nur die **Datei abgelegt** wird.
- „Text hier anzeigen": Das Dokument wird zum Anzeigen in eine PDF umgewandelt und wie eine PDF auf die Fläche gelegt (alle Seiten untereinander, mit Zoom und zum Zeichnen). Die Word-Datei selbst wird zusätzlich **unverändert** als Datei darüber abgelegt. Die Umwandlung arbeitet nur mit einer Kopie, die PDF wird danach verworfen.
- Dafür muss auf dem Server **LibreOffice** installiert sein (`apt-get install -y libreoffice-writer`). Ohne LibreOffice bleibt nur „Nur Datei ablegen" auswählbar, mit einem Hinweis.

## 1.7.15 - 08.10.2026

- Zugangsdaten-Liste: Das Bearbeiten-Fenster ist jetzt nur in der Notiz zu sehen, in der du es geöffnet hast. Wechselst du zu einer anderen Seite, verschwindet es. Kommst du zurück, ist es wieder da, genau so, wie du es verlassen hast (solange du nicht „OK" oder „Abbrechen" gedrückt hast).
- Zugangsdaten-Liste: Das Bearbeiten-Fenster lässt sich am Titel verschieben und merkt sich seine Position.
- Zugangsdaten-Liste: Die Einträge im Fenster lassen sich per Ziehen umsortieren, am Griff (⋮⋮) oder mit der Maus irgendwo am Rand der Eintrags-Box.

## 1.7.14 - 08.10.2026

- Zugangsdaten-Liste: Das Bearbeiten-Fenster bleibt jetzt offen, auch wenn du daneben klickst, etwas kopierst oder die Notiz wechselst. Es schließt sich nur über „OK" oder „Abbrechen". Dein Entwurf bleibt dabei erhalten, sogar nach einem versehentlichen Neuladen der Seite.
- Zugangsdaten-Liste: Der Text in den Einträgen lässt sich jetzt formatieren (fett, kursiv, unterstrichen, durchgestrichen, größer/kleiner, Farbe).
- Zugangsdaten-Liste: Titel und Text sind größer, der Schlüssel vor dem Titel ist weg, und ein aufgeklappter Eintrag zeigt einen grünen Schlüssel.
- Der Browser fragt beim Eingeben von Zugangsdaten nicht mehr, ob er ein Kennwort speichern soll.

## 1.7.13 - 08.10.2026

- Neu: Zugangsdaten als **Liste**. Beim Klick auf das Schloss fragt KrisNote jetzt, ob du eine einzelne Karte oder eine Liste möchtest. In der Liste stehen viele Einträge untereinander, jeweils nur mit Name und Schlüssel. Ein Klick auf den Schlüssel zeigt die Angaben darunter und klappt die anderen zu. Mit „Alle zeigen" öffnest du alle auf einmal. Bearbeiten über den Stift in der grauen Leiste.

## 1.7.12 - 08.10.2026

- Neu: Unter Einstellungen gibt es den Link „Projekt unterstützen (freiwillig)" (öffnet PayPal in einem neuen Tab). KrisNote bleibt kostenlos.
- Sicherheit: Die Abhängigkeiten (Express, multer, qs, proxy-addr) sind auf den neuesten Stand gebracht. Es gibt keine bekannten Schwachstellen mehr (vorher 4, davon 1 kritische).
- Neu: Einstellung `TRUST_PROXY` für den Betrieb hinter einem Reverse-Proxy (z. B. Cloudflare Tunnel). Damit zählen die Sperre nach Fehlversuchen und das „Secure"-Merkmal der Anmelde-Cookies pro echtem Besucher statt pro Proxy. Standardmäßig aus, bestehende Installationen ändern sich nicht.

## 1.7.11 - 08.10.2026

- Lizenz: KrisNote steht jetzt unter der MIT-Lizenz (Datei LICENSE). Jeder darf es kostenlos nutzen, ändern und weitergeben; der Urheber-Hinweis muss erhalten bleiben.

## 1.7.10 - 03.10.2026

- Sprachnotizen: Der unverständliche Knopf mit den drei Zeilen ist ersetzt durch „Transkript" mit einem Symbol aus Schallwelle, Pfeil und Textzeilen (Sprache wird zu Text). Er steht mit Beschriftung in der grauen Leiste über der Sprachnotiz.
- Sprachnotizen: Sobald die Umwandlung läuft, wird das Feld automatisch größer und zeigt einen Dreh-Kreis, den Fortschritt in Prozent und einen Balken. Bei einem Fehler wächst es ebenfalls für die Meldung, und ist das Transkript fertig, ist genug Platz zum Lesen.

## 1.7.9 - 03.10.2026

- Ordnerfarben: Statt 7 gibt es jetzt 15 Farben (neu: Pink, Indigo, Himmelblau, Türkis, Dunkelgrün, Limette, Braun, Bordeaux). Die Auswahl bleibt dieselbe einfache Farbtafel, jetzt in 3 Reihen zu je 5 mit etwas kleineren Kästchen - passt auch auf das Handy. Bereits gewählte Ordnerfarben bleiben unverändert.

## 1.7.8 - 03.10.2026

- Handy/Tablet: Ordner lassen sich jetzt umbenennen. Neben jedem Ordner gibt es einen Stift-Knopf; ein Tipp darauf öffnet das Namensfeld mit Tastatur. Ein normales Antippen des Namens öffnet wie bisher nur den Ordner, ohne Tastatur und ohne die Kopieren-Auswahl.
- Handy/Tablet: Der Löschen-Knopf (Mülleimer) ist neben jedem Ordner dauerhaft sichtbar und springt nicht mehr beim Antippen auf; Löschen fragt wie bisher nach. Am PC ändert sich nichts (Umbenennen per Doppelklick).

## 1.7.7 - 03.10.2026

- Der Knopf „Text" und die Abfrage „Textart" sind entfernt (am PC und am Handy). Text entsteht durch Tippen auf eine leere Stelle der Fläche.
- Neu: In der grauen Leiste über jedem Text gibt es den Knopf „Rahmen an/aus". Damit wird aus freiem Text ein Textfeld mit Rahmen und Hintergrund und umgekehrt. Der Text bleibt dabei erhalten.

## 1.7.6 - 03.10.2026

- Zeichnen am Handy: Die eigentliche Ursache der Verzögerung war die riesige Zeichen-Ebene (am Handy über 20 Millionen Pixel), die der Browser bei jeder Änderung komplett neu aufbereiten muss. Jetzt deckt sie am Handy nur noch den sichtbaren Ausschnitt plus Rand ab und wandert beim Scrollen mit; der Strich selbst erscheint beim Ziehen sofort als einfache Linie und wird erst beim Loslassen in die Zeichnung übernommen. Auch das Lasso zeichnet seine Linie so. Der Radierer zeigt beim Ziehen eine graue Spur, die beim Loslassen löscht. Am PC bleibt die Zeichen-Ebene unverändert.

## 1.7.5 - 03.10.2026

- Zeichnen: Ein Strich erscheint jetzt sofort unter dem Finger. Vorher wurde bei jeder Bewegung die ganze Zeichenfläche komplett neu gemalt, was am Handy zwei bis drei Sekunden Verzögerung verursachte. Jetzt wird nur der Bereich des neuen Stücks aktualisiert.

## 1.7.4 - 03.10.2026

- Handy (Touch + schmaler Bildschirm): Die Werkzeugleiste ist neu. Unten gibt es eine feste Leiste mit Text, Zeichnen, Bild, PDF, Sprache, Datei sowie „Format" und „Mehr". „Format" öffnet alle Textformate (Überschrift, Schriftart, Größe, Fett, Kursiv, Farbe, Markieren, Listen …) als große Knöpfe, „Mehr" die selteneren (Zugangsdaten, Erinnerung, Link, Hintergrund, Verschieben). Oben bleiben Zurück, Rückgängig und Wiederholen. Auswahlfenster (Farbe, Größe, Hintergrund …) erscheinen einheitlich über der unteren Leiste. Am PC ändert sich nichts.
- Die graue Leiste über Dateien, Sprachnotizen, Bildern und Zugangsdaten ist jetzt auch am PC etwas größer (28 statt 18 Pixel).

## 1.7.3 - 03.10.2026

- Handy/Tablet: Die graue Leiste über Dateien, Sprachnotizen, Bildern, Zugangsdaten usw. (mit Öffnen, Umbenennen, Löschen) ist jetzt deutlich größer und mit dem Finger gut zu treffen. Am PC mit Maus ändert sich nichts.

## 1.7.2 - 02.10.2026

- Rückgängig: Text, der in ein Textfeld eingefügt wurde (auch wenn dabei markierter Text ersetzt wurde), lässt sich jetzt wieder mit dem Rückgängig-Pfeil oder Strg+Z zurücknehmen.

## 1.7.1 - 02.10.2026

- Neu: Versionsnummer klein neben dem Benutzernamen sichtbar.
- Neu: Unter Einstellungen gibt es jetzt den „Änderungsverlauf" (diese Liste, nur zum Lesen).
- Rechtschreibkorrektur: Ein Vorschlag aus dem Rechtsklick-Menü wird jetzt zuverlässig übernommen (das Textfeld bleibt im Bearbeitungsmodus, solange das Browser-Menü offen ist).
- Suche: Klick auf einen Treffer wechselt zum Ordner der Notiz. Die Überschrift zeigt dabei den Weg (Ordner › übergeordnete Seiten). Nach dem Leeren der Suche bleibt man in diesem Ordner.
- Markieren: Funktioniert auch bei Text, der aus KrisNote kopiert und eingefügt wurde (keine Streifen mehr). Rückgängig nimmt die Markierung wieder zurück. „Markierung entfernen" entfernt auch nur einen Teil einer Markierung.
- Suchfeld: Das „x" löscht den Suchtext wieder.

## Vor der Versionsnummer (Verlauf bis 01.10.2026)

- 28.09.2026: Erste freigegebene Version für andere Personen („Gäste-Version"): Installationsskript mit einem Befehl, Ersteinrichtung mit Einrichtungscode, feste Einführung „Erklärung KrisNote" für jeden neuen Benutzer, Registrierung standardmäßig aus, Sperre nach 5 Fehlversuchen.
- 28.09.2026: Rechtsklick in einem Text, den man gerade bearbeitet, zeigt wieder das Browser-Menü (Rechtschreibvorschläge, Ausschneiden, Kopieren, Einfügen).
- 28.09.2026: Mehrfachauswahl von Objekten auf der Fläche (gemeinsam verschieben, löschen, kopieren); Kopieren und Löschen per Standard-Rechtsklick sowie Strg+C und Strg+V.
- 27.09.2026: Erinnerungs-Mail (SMTP) wird pro Benutzer eingestellt.
- 27.09.2026: Notizliste: Hauptseite und zugehörige Unterseiten sind dezent markiert.
- 27.09.2026: Eigener, privater Bereich pro Benutzer; neue Anmeldeseite mit „Passwort ändern".
- 27.09.2026: Suchfeld wird nicht mehr automatisch mit einem alten Begriff gefüllt.
