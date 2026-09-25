const CACHE_NAME = 'paprika-auditflow-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './presentation.html',
  './presentation_light.html',
  './css/style.css',
  './js/app.js',
  './js/rules.js',
  './js/bpmn_rules.js',
  './js/pmg.js',
  './js/roi.js',
  './js/diff.js',
  './js/autofix.js',
  './js/cmd_palette.js',
  './js/db.js',
  './img/paprika_logo.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Network first, falling back to cache if offline
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        return response;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
