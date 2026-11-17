// Offline-Cache: HTML netzwerk-zuerst, Rest cache-zuerst. VERSION beim Update hochzählen.
const VERSION = 'hundemarke-v10';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'icons/apple-touch-icon.png',
  'src/main.js', 'src/game.js', 'src/map.js', 'src/hex.js', 'src/data.js', 'src/ai.js', 'src/ui.js', 'src/render.js', 'src/sprites.js', 'src/fx.js', 'src/util.js',
  'src/art.js', 'src/mart.js', 'src/iart.js', 'src/wart.js', 'src/menubg.js', 'src/crest.js', 'src/saves.js', 'src/symbols.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const html = e.request.mode === 'navigate' || e.request.url.endsWith('.html') || e.request.url.endsWith('/');
  if (html) e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
  else e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(e.request, c)); return r; })));
});
