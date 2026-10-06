// Offline support. Pages and the app shell: network first, falling back to the last copy.
// Hashed assets (they never change under the same name): cache first.
const CACHE = 'eleven-eleven-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest', './icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// the page tells us what it already loaded (it was fetched before we took control), so one visit is enough
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'precache') return;
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(event.data.urls.filter((u) => new URL(u).origin === self.location.origin).map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const hashed = /\/assets\/.+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?|ttf)$/.test(req.url);
  if (hashed) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
    return;
  }
  event.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((hit) => hit || caches.match('./'))));
});
