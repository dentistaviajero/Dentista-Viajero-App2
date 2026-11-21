/* Dentista Viajero Clínica: operación exclusivamente en línea.
   Desregistra el service worker offline anterior y elimina únicamente su caché. */
(async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.filter(r => r.scope.startsWith(location.origin + '/')).map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('dv-clinica-shell-')).map(k => caches.delete(k)));
    }
    // No se elimina almacenamiento local ni información clínica.
  } catch (error) {
    console.warn('No fue posible limpiar toda la caché offline:', error);
  }
})();
