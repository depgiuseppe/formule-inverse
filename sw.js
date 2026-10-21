// sw.js — Service Worker per Progressive Web App (PWA) Android e offline.
// Versione della cache:
const CACHE_NAME = 'formule-inverse-v2.1';

// Risorse statiche core da pre-memorizzare nella cache all'installazione
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/bundle.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png'
];

// Installazione: pre-caching di tutti gli asset essenziali
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Avviso pre-caching PWA:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Attivazione: rimozione delle vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: strategia Stale-While-Revalidate per file locali e cache-first offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignora le richieste a schemi non-http (es. chrome-extension, file)
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se presente in cache, restituisci subito e aggiorna in background (Stale-While-Revalidate)
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Rete non disponibile: se non abbiamo cachedResponse, tenta fallback su index.html per navigazioni
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return null;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Permette all'app di forzare l'aggiornamento
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
