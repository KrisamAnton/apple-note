// Sync-Schicht: kapselt die Datenhaltung, egal ob mit oder ohne Firebase.
//
// - Ist in firebase-config.js ein Projekt eingetragen UND ein Gerätecode
//   gesetzt, laufen alle Daten über Firestore (Cloud) -> alle Geräte mit
//   demselben Code sehen denselben Stand in Echtzeit.
// - Sonst wird ganz normal im localStorage dieses Geräts gespeichert
//   (kein Login/Cloud nötig, aber auch kein Abgleich zwischen Geräten).
//
// Beide Modi bieten exakt dieselbe API, damit app.js nicht wissen muss,
// welcher Modus gerade aktiv ist.

const Sync = (() => {
  const LOCAL_KEYS = {
    medications: 'mt_local_medications',
    intakes: 'mt_local_intakes',
    measurements: 'mt_local_measurements',
    code: 'mt_household_code',
  };

  const cfg = window.MEDIPLAN_FIREBASE_CONFIG || {};
  const firebaseAvailable = !!(cfg.apiKey && cfg.projectId && window.firebase);

  let db = null;
  let code = localStorage.getItem(LOCAL_KEYS.code) || '';

  function cloudReady() {
    return firebaseAvailable && !!code;
  }

  if (firebaseAvailable) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.firestore();
    } catch (err) {
      console.error('Firebase-Initialisierung fehlgeschlagen, nutze lokalen Speicher.', err);
    }
  }

  function readLocal(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (err) {
      return [];
    }
  }

  function writeLocal(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  // --- Gerätecode ---------------------------------------------------

  function getCode() {
    return code;
  }

  function setCode(newCode) {
    code = (newCode || '').trim().toUpperCase();
    if (code) localStorage.setItem(LOCAL_KEYS.code, code);
    else localStorage.removeItem(LOCAL_KEYS.code);
  }

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function isCloudEnabled() {
    return firebaseAvailable;
  }

  // --- Generische Collection-Hilfsfunktionen -------------------------

  function subscribe(kind, key, callback) {
    if (cloudReady()) {
      return db
        .collection('households')
        .doc(code)
        .collection(kind)
        .onSnapshot(
          (snap) => {
            const list = [];
            snap.forEach((doc) => list.push(doc.data()));
            callback(list);
          },
          (err) => {
            console.error(`Firestore-Fehler (${kind}):`, err);
            callback(readLocal(key));
          }
        );
    }
    // Lokaler Modus: sofort einmal liefern, danach auf Änderungen aus
    // anderen Tabs/Fenstern desselben Geräts reagieren.
    callback(readLocal(key));
    const handler = (event) => {
      if (event.key === key) callback(readLocal(key));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  async function upsert(kind, key, item) {
    if (cloudReady()) {
      await db.collection('households').doc(code).collection(kind).doc(item.id).set(item);
      return;
    }
    const list = readLocal(key);
    const idx = list.findIndex((entry) => entry.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    writeLocal(key, list);
  }

  async function remove(kind, key, id) {
    if (cloudReady()) {
      await db.collection('households').doc(code).collection(kind).doc(id).delete();
      return;
    }
    const list = readLocal(key).filter((entry) => entry.id !== id);
    writeLocal(key, list);
  }

  return {
    getCode,
    setCode,
    randomCode,
    isCloudEnabled,
    cloudReady,
    subscribeMedications: (cb) => subscribe('medications', LOCAL_KEYS.medications, cb),
    subscribeIntakes: (cb) => subscribe('intakes', LOCAL_KEYS.intakes, cb),
    subscribeMeasurements: (cb) => subscribe('measurements', LOCAL_KEYS.measurements, cb),
    saveMedication: (med) => upsert('medications', LOCAL_KEYS.medications, med),
    deleteMedication: (id) => remove('medications', LOCAL_KEYS.medications, id),
    saveIntake: (intake) => upsert('intakes', LOCAL_KEYS.intakes, intake),
    saveMeasurement: (m) => upsert('measurements', LOCAL_KEYS.measurements, m),
  };
})();
