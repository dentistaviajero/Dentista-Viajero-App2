
/* Portada: extensión visual. No altera pacientes ni base D1. */
(function(){
  const originalHome=home;
  home=function(){
    const now=new Date();
    const day=now.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const hour=now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
    app.innerHTML=`<div class="dv-home">
      <div class="dv-top">
        <button class="dv-icon" id="dv-home-button" aria-label="Inicio">⌂</button>
        <strong>Dentista Viajero · Clínica</strong>
        <button class="dv-icon" id="dv-alerts" aria-label="Notificaciones">♧</button>
        <button class="dv-icon" id="dv-settings" aria-label="Configuración">⚙</button>
        <button class="dv-icon" id="dv-exit" aria-label="Salir">⏻</button>
      </div>
      <img class="dv-banner" src="/recepcion-banner.webp" alt="Pippo, Peluche, Rumi y La Niña te dan la bienvenida a la clínica">
      <div class="dv-menu">
        <button data-dv-nav="patients" aria-label="Pacientes"><img src="/boton-pacientes.webp" alt="Pacientes: expedientes, historia clínica y tratamientos"></button>
        <button data-dv-nav="schools" aria-label="Escuelas"><img src="/boton-escuelas.webp" alt="Escuelas: campañas, grupos y reportes"></button>
        <button data-dv-nav="balances" aria-label="Saldos"><img src="/boton-saldos.webp" alt="Saldos: pagos, adeudos y recibos"></button>
        <button id="dv-print" aria-label="Imprimibles"><img src="/boton-imprimibles.webp" alt="Imprimibles: recetas, consentimientos, certificados y cotizaciones"></button>
      </div>
      <section class="dv-agenda">
        <div class="dv-agenda-title"><span style="font-size:30px">🗓</span><h2>Agenda</h2><button id="dv-calendar">Google Calendar</button><button id="dv-new-appointment">+ Agendar cita</button></div>
        <div class="dv-notice" id="dv-calendar-status">Calendario pendiente de conectar. No se muestran citas inventadas.</div>
      </section>
      <div class="dv-summary">
        <div class="dv-stat"><strong>Hoy</strong><p>${day}<br>${hour}</p></div>
        <div class="dv-stat"><strong>Cumpleañeros</strong><p id="dv-birthdays">Consultando…</p></div>
        <div class="dv-stat"><strong>Citas de hoy</strong><p id="dv-appointments">Sin sincronizar</p></div>
      </div>
      <img class="dv-footer" src="/pie-viajero.webp" alt="La Niña en ruta: Pippo, Peluche y Rumi al cuidado de las sonrisas">
    </div>`;
    document.querySelectorAll('[data-dv-nav]').forEach(b=>b.onclick=()=>go(b.dataset.dvNav));
    document.getElementById('dv-home-button').onclick=()=>home();
    document.getElementById('dv-exit').onclick=async()=>{try{await api('logout','POST')}finally{login()}};
    document.getElementById('dv-alerts').onclick=()=>alert('Las notificaciones estarán disponibles al conectar la agenda.');
    document.getElementById('dv-settings').onclick=()=>{if(confirm('¿Abrir respaldos administrativos?'))go('backup')};
    document.getElementById('dv-print').onclick=()=>alert('Los imprimibles se abren desde el expediente de cada paciente. Próximo paso: índice general.');
    document.getElementById('dv-calendar').onclick=()=>window.open('https://calendar.google.com/calendar/u/0/r','_blank','noopener');
    document.getElementById('dv-new-appointment').onclick=()=>window.open('https://calendar.google.com/calendar/u/0/r/eventedit','_blank','noopener');
    api('patients').then(rows=>{
      const today=new Date(), md=String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
      const b=rows.filter(p=>!p.archivado&&typeof p.fecha_nacimiento==='string'&&p.fecha_nacimiento.slice(5,10)===md);
      document.getElementById('dv-birthdays').textContent=b.length?b.map(p=>p.nombre).join(', '):'0 hoy';
    }).catch(()=>{document.getElementById('dv-birthdays').textContent='No disponible'});
  };
})();
