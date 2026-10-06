// Offline support. Pages and the app shell: network first, falling back to the last copy.
// Hashed assets (they never change under the same name): cache first.
const CACHE = 'eleven-eleven-v1';

// On install, cache the shell and every script and stylesheet the page references, so the app works offline after one visit
// (fonts and anything else the page already loaded arrive through the 'precache' message below).
async function precacheShell() {
  const cache = await caches.open(CACHE);
  await cache.addAll(['./', './manifest.webmanifest', './icon-192.png']);
  try {
    const html = await (await fetch('./', { cache: 'no-store' })).text();
    const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => new URL(m[1], self.registration.scope).href);
    await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
  } catch { /* offline install: nothing more to cache */ }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
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
