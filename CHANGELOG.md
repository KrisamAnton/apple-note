# Änderungsverlauf

Hier steht, was wann geändert wurde (neueste Einträge oben). Die Versionsnummer
steht klein neben dem Benutzernamen; bei jeder Änderung erhöht sich die letzte
Zahl (1.7.1 → 1.7.2 → …).

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
