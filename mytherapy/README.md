# MediPlan

Ein eigenständiger Nachbau einer Medikamentenerinnerungs-App (inspiriert von
Apps wie MyTherapy) als Progressive Web App (PWA). Läuft komplett im
Browser, ist auf jedem Handy ohne App-Store installierbar und lässt sich
optional zwischen mehreren Geräten synchronisieren.

**Status:** Erste vollständige Version. Weitere Anpassungen werden Schritt
für Schritt besprochen und umgesetzt.

## Funktionen

- **Heute-Ansicht**: alle für den Tag fälligen Einnahmen, gruppiert nach
  Morgens/Mittags/Abends/Nachts, mit Fortschrittsanzeige. Jede Einnahme
  lässt sich als eingenommen/ausgelassen markieren oder um eine
  einstellbare Zeit verschieben. Navigation zu vorherigen/nächsten Tagen.
- **Medikamente verwalten**: Name, Darreichungsform (mit Symbol), Menge/
  Einheit, Farbe, beliebig viele Uhrzeiten, Häufigkeit (täglich,
  bestimmte Wochentage, alle X Tage, bei Bedarf), Start-/Enddatum,
  Bestandsverfolgung mit Nachfüll-Warnung, Notizen.
- **Bei-Bedarf-Medikamente**: keine feste Uhrzeit, stattdessen ein
  „Einnahme erfassen"-Knopf mit Tageszähler.
- **Verlauf**: Monatskalender mit Einnahmetreue pro Tag (grün/gelb/rot),
  Tagesdetail per Klick, Ø Einnahmetreue der letzten 30 Tage und
  Tage-Streak. Über „Bericht drucken" lässt sich die Ansicht als PDF
  speichern (Browser-Druckdialog → „Als PDF speichern").
- **Messwerte**: einfache Erfassung von Blutdruck, Blutzucker, Gewicht
  und Puls.
- **Erinnerungen**: Browser-Benachrichtigungen zur geplanten Uhrzeit,
  solange die App geöffnet oder als Hintergrund-Tab aktiv ist (siehe
  Einschränkung unten).
- Helles/dunkles/systemabhängiges Erscheinungsbild.
- Als PWA installierbar, App-Shell funktioniert offline.

## Geräteübergreifende Synchronisierung

Damit derselbe Medikamentenplan und dieselben Häkchen auf mehreren
Handys sichtbar sind, nutzt MediPlan optional **Firebase Firestore**
(Googles kostenlose Cloud-Datenbank) im Hintergrund. Ohne Einrichtung
läuft die App trotzdem normal – dann bleiben die Daten nur lokal auf
dem jeweiligen Gerät gespeichert (wie bisher bei der Notiz-App in
diesem Repository).

### Einrichtung (einmalig, ca. 5 Minuten)

1. Auf <https://console.firebase.google.com> ein kostenloses Projekt
   anlegen (Google-Konto erforderlich).
2. Im Projekt links auf **Build → Firestore Database** klicken,
   **Datenbank erstellen** und für den Start den **Testmodus**
   wählen (30 Tage offen, später in den Firestore-Regeln einschränkbar).
3. Auf das Zahnrad oben links → **Projekteinstellungen** → ganz unten
   bei „Meine Apps" auf das **Web-Symbol (`</>`)** klicken, um eine
   Web-App zu registrieren (kein Hosting nötig, nur „App registrieren").
4. Der angezeigte `firebaseConfig`-Block (apiKey, authDomain,
   projectId, …) wird in die Datei `js/firebase-config.js` in diesem
   Ordner eingetragen.
5. Änderung committen/pushen – danach zeigt „Mehr → Geräte-Synchronisierung"
   in der App die Möglichkeit, einen Gerätecode zu erstellen.

Auf dem ersten Handy einen Code erstellen, denselben Code dann auf den
anderen Handys unter „Mehr → Geräte-Synchronisierung" eingeben – ab dann
sehen alle Geräte mit diesem Code denselben Plan in Echtzeit.

**Hinweis zur Sicherheit:** Im Firestore-Testmodus kann grundsätzlich
jeder mit einem gültigen Projekt-API-Key lesen/schreiben, der Zugriff
ist nur durch den (frei wählbaren, 6-stelligen) Gerätecode „erraten"
erschwert – für eine private, familiäre Nutzung ausreichend, aber kein
Ersatz für ein echtes Login. Für mehr Sicherheit können in der Firebase
Console eigene Firestore-Regeln hinterlegt werden.

## Einschränkung bei Erinnerungen

Als reine Web-App (ohne eigenen Server, der Push-Nachrichten verschickt)
können Erinnerungen nur ausgelöst werden, solange die App in einem
Browser-Tab geöffnet ist (auch im Hintergrund-Tab, aber nicht bei
vollständig geschlossenem Browser). Für zuverlässige Erinnerungen auch
bei geschlossener App wäre ein zusätzlicher Push-Dienst (z. B. Firebase
Cloud Messaging) nötig – das ist ein möglicher nächster Ausbauschritt.

## Technik

Bewusst ohne Build-Prozess und ohne Frameworks umgesetzt – reines
HTML/CSS/JavaScript, wie auch die Notiz-App in diesem Repository:

```
index.html            Grundgerüst (Heute/Medikamente/Verlauf/Mehr)
css/styles.css         Styling (hell/dunkel)
js/app.js              App-Logik (State, Rendering, Fachlogik)
js/sync.js             Datenhaltung: Firestore oder localStorage-Fallback
js/firebase-config.js  Firebase-Projektdaten (siehe oben)
manifest.json          PWA-Manifest
sw.js                  Service Worker (Offline-Cache der App-Shell)
icons/                 App-Icons für Home-Bildschirm / Manifest
```

Einzige externe Abhängigkeit: die Firebase-JS-SDKs von Google (`gstatic.com`),
ausschließlich für die optionale Cloud-Synchronisierung – ohne
Firebase-Konfiguration werden sie geladen, aber nicht verwendet.

## Lokal ausführen

```bash
cd mytherapy
python3 -m http.server 8000
```

Danach im Browser `http://localhost:8000` öffnen.

## Auf dem Handy nutzen (GitHub Pages)

Ist für dieses Repository GitHub Pages aktiviert (Settings → Pages →
Branch `main`, Ordner `/root`), ist die App unter
`https://krisamanton.github.io/apple-note/mytherapy/` erreichbar – auf
jedem Handy im Browser öffnen und über „Zum Home-Bildschirm hinzufügen"
(Safari) bzw. „App installieren" (Chrome) wie eine native App
installieren.
