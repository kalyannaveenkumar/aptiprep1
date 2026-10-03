// AptiPrep service worker: caches the app shell so it opens fast and survives a weak network.
// API calls (/api/*) are never cached. Bump VERSION whenever you change frontend files.
const VERSION = 'aptiprep-v1';
const SHELL = ['/', '/style.css', '/app.js', '/manifest.json', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // network first, fall back to cache when offline
  e.respondWith(fetch(r).then(res => {
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); return res;
  }).catch(() => caches.match(r).then(m => m || caches.match('/'))));
});
