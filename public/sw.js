// Modo sin conexión: guarda lo que se descarga y lo sirve si no hay red.
// Cambia CACHE para forzar que todos bajen la versión nueva.
const CACHE = 'honda-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest', './icons/icon.svg'])));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const save = (r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; };
  // La página: primero la red (para recibir versiones nuevas) y, sin conexión, la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  // Scripts, fuentes e íconos llevan hash en el nombre: primero la copia guardada.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(save)));
});
