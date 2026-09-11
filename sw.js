const CACHE_VERSION = 'v3';
const CACHE_NAME = `apple-notes-pwa-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Notizdaten und hochgeladene Dateien kommen ausschließlich vom Server und
  // dürfen nie aus dem Cache beantwortet werden – sonst könnten veraltete oder
  // sogar Daten eines anderen Geräts angezeigt werden, statt ehrlich einen
  // Verbindungsfehler zu melden.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/files/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Netzwerk zuerst, damit Aktualisierungen sofort ankommen (nicht erst nach dem
  // nächsten Laden). Nur wenn das Netzwerk nicht erreichbar ist (offline), wird
  // auf die zwischengespeicherte App-Shell zurückgegriffen.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
