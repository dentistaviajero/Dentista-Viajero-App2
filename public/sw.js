/* Dentista Viajero Clínica: shell offline v3. No almacena /api ni expedientes. */
const CACHE='dv-clinica-shell-v3';
const CORE=['/index.html','/app.js','/portada.js','/imprimibles.js','/pacientes.js','/historia-panel.js','/documentos-v2.js','/escuelas-v3.js','/offline-acceso.js','/offline-register.js','/styles.css','/portada.css','/pacientes.css','/historia-panel.css','/documentos-v2.css','/escuelas-v3.css'];
const OPTIONAL=['/manifest.webmanifest','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // No activar una versión nueva si faltan archivos esenciales.
 await Promise.all(CORE.map(async path=>{
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok)throw new Error('Falta recurso esencial: '+path);
  await cache.put(path,res);
 }));
 await Promise.allSettled(OPTIONAL.map(async path=>{const r=await fetch(path,{cache:'no-store'});if(r.ok)await cache.put(path,r)}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await self.clients.claim();
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith('dv-clinica-shell-')&&k!==CACHE).map(k=>caches.delete(k)));
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   try {const response=await fetch(request);if(response.ok){const c=await caches.open(CACHE);await c.put('/index.html',response.clone())}return response}
   catch {return (await caches.match('/index.html'))||Response.error()}
  })());return;
 }
 event.respondWith((async()=>{
  const cached=await caches.match(request);if(cached)return cached;
  const response=await fetch(request);
  if(response.ok){const c=await caches.open(CACHE);await c.put(request,response.clone())}
  return response;
 })());
});
