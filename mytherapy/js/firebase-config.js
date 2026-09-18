// Firebase-Konfiguration für die geräteübergreifende Synchronisierung.
//
// Solange hier nichts eingetragen ist, läuft die App ganz normal weiter –
// dann werden Medikamentenplan und Einnahmen nur lokal auf diesem Gerät
// gespeichert (wie bisher bei der Notiz-App), ohne Abgleich zwischen
// mehreren Handys.
//
// Um echten Gerätesync zu aktivieren:
//   1. Kostenloses Firebase-Projekt anlegen: https://console.firebase.google.com
//   2. Dort "Firestore Database" aktivieren (im Testmodus reicht für den Start)
//   3. Unter Projekteinstellungen -> "Meine Apps" -> Web-App hinzufügen,
//      die dort angezeigten Werte hier eintragen.
//
// Die Felder unten mit "" sind bewusst leer gelassen (= Sync ausgeschaltet).
window.MEDIPLAN_FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
