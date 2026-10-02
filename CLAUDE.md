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
