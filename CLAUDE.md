# Regeln für dieses Projekt (KrisNote / Test-Version)

## Versionsnummer und Änderungsverlauf

- Die Versionsnummer steht in `server/package.json` (und `server/package-lock.json`).
- **Bei jeder Änderung, die ich an der Test-Version mache, erhöht sich die letzte Zahl** (1.7.1 → 1.7.2 → …):
  `cd server && npm version patch --no-git-tag-version`
- Gleichzeitig kommt ein kurzer, verständlicher Eintrag (deutsch, mit Datum) ganz oben in `CHANGELOG.md`.
  Dieser Text erscheint in der App unter Einstellungen → „Änderungsverlauf" (schreibgeschützt).
  Format: `## <Version> - TT.MM.JJJJ`, darunter Listenpunkte mit `- `.
- Die **Gäste-Version** (Repo `KrisamAnton/KrisNote`) bekommt Änderungen und Versionsnummer erst,
  wenn Anton ausdrücklich sagt, dass sie aktualisiert werden soll. Dann übernimmt sie die
  aktuelle Nummer und den `CHANGELOG.md` der Test-Version.

## Update-Befehl immer mitgeben

- Nach **jeder** Änderung an der Test-Version gebe ich Anton den Befehl zum Aktualisieren der Test-Version
  (Proxmox-Container **260**, "KrisNote") mit. Branch `claude/apple-notes-pwa-base-vhvnvh`:
  `cd "$(systemctl cat krisnote | grep -m1 WorkingDirectory | cut -d= -f2)/.." && git pull origin claude/apple-notes-pwa-base-vhvnvh && cd server && npm install && systemctl restart krisnote && curl -s localhost:3000/api/version`
- Den Befehl für die Gäste-Version (Einzeiler mit `install.sh`) gebe ich erst mit, wenn Anton sagt, dass die
  Gäste-Version aktualisiert werden soll.

## Beim Übernehmen in die Gäste-Version nicht vergessen

- **LibreOffice im Installer** (`install.sh` der Gäste-Version): Für "Word-Datei als Text anzeigen" (Umwandlung
  Word -> PDF, ab Version 1.7.16) braucht der Server LibreOffice. Der Installer muss das anbieten (Frage mit j/N,
  Standard Nein, da groß) und dann ausführen:
  `apt-get update && apt-get install -y libreoffice-writer fonts-crosextra-carlito fonts-liberation`
- README (Deutsch und Englisch) der Gäste-Version ergänzen: Word-Dokumente anzeigen (optional, braucht LibreOffice)
  und dieser Befehl; außerdem die neuen Funktionen (Zugangsdaten-Liste, Word-Anzeige) bei den Features nennen.
- Der Hinweis "SOFFICE_BIN" (Umgebungsvariable, Pfad zu LibreOffice) gehört in die Tabelle der Umgebungsvariablen.
