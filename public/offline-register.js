/* Registro PWA externo, compatible con la política CSP del Worker. */
if ('serviceWorker' in navigator) {
 window.addEventListener('load',async()=>{
  try {
   const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
   await registration.update();
   console.info('Caché sin conexión: registro correcto');
  } catch(e){console.warn('No se pudo preparar el modo sin conexión:',e)}
 });
}
