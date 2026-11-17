/* Dentista Viajero Clínica — apertura sin conexión, versión 1.
   No almacena respuestas de /api ni datos clínicos. */
const CACHE = 'dv-clinica-shell-v1';
const SHELL = [
  '/', '/index.html', '/manifest.webmanifest',
  '/styles.css', '/portada.css', '/pacientes.css',
  '/historia-panel.css', '/documentos-v2.css', '/escuelas-v3.css',
  '/app.js', '/portada.js', '/imprimibles.js', '/pacientes.js',
  '/historia-panel.js', '/documentos-v2.js', '/escuelas-v3.js',
  '/icon-192.png', '/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(async url => {
      const response = await fetch(url, {cache:'reload'});
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('dv-clinica-shell-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put('/', response.clone());
        return response;
      } catch (_) {
        return (await caches.match('/')) || (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
    return response;
  })());
});
