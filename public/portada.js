
/* Dentista Viajero: portada y centro de imprimibles. */
(function () {
  const doctor = 'Dr. Valentín Naif Hamsho Domínguez';
  const cedula = '8536800';
  const telefono = '2291571065';
  const logo = '/recepcion-banner.webp';
  const fecha = () => new Date().toLocaleDateString('es-MX');
  const safe = value => esc(value == null ? '' : value);

  home = function () {
    const now = new Date();
    const day = now.toLocaleDateString('es-MX', {
      weekday:'long',day:'numeric',month:'long',year:'numeric'
    });
    const hour = now.toLocaleTimeString('es-MX', {
      hour:'2-digit',minute:'2-digit'
    });

    app.innerHTML = `<div class="dv-home">
      <div class="dv-top">
        <button class="dv-icon" id="dv-home-button">⌂</button>
        <strong>Dentista Viajero · Clínica</strong>
        <button class="dv-icon" id="dv-alerts">♧</button>
        <button class="dv-icon" id="dv-private" type="button" title="Administración privada" aria-label="Administración privada: finanzas e inventario">▣</button>
        <button class="dv-icon" id="dv-settings" title="Respaldos">⚙</button>
        <button class="dv-icon" id="dv-exit">⏻</button>
      </div>
      <img class="dv-banner" src="/recepcion-banner.webp"
        alt="Bienvenida a Dentista Viajero">
      <div class="dv-menu">
        <button data-dv-nav="patients">
          <img src="/boton-pacientes.webp" alt="Pacientes">
        </button>
        <button data-dv-nav="schools">
          <img src="/boton-escuelas.webp" alt="Escuelas">
        </button>
        <button data-dv-nav="balances">
          <img src="/boton-saldos.webp" alt="Saldos">
        </button>
        <button id="dv-print">
          <img src="/boton-imprimibles.webp" alt="Imprimibles">
        </button>
      </div>
      <section class="dv-agenda">
        <div class="dv-agenda-title">
          <span style="font-size:30px">🗓</span>
          <h2>Agenda</h2>
          <button id="dv-calendar">Google Calendar</button>
        </div>
        <div class="dv-notice">
          Calendario pendiente de conectar.
        </div>
      </section>
      <div class="dv-summary">
        <div class="dv-stat">
          <strong>Hoy</strong><p>${day}<br>${hour}</p>
        </div>
        <div class="dv-stat">
          <strong>Cumpleañeros</strong>
          <p id="dv-birthdays">Consultando…</p>
        </div>
        <div class="dv-stat">
          <strong>Citas de hoy</strong><p>Sin sincronizar</p>
        </div>
      </div>
      <img class="dv-footer" src="/pie-viajero.webp"
        alt="La Niña en ruta">
    </div>`;

    document.querySelectorAll('[data-dv-nav]').forEach(b =>
      b.onclick = () => go(b.dataset.dvNav)
    );
    document.getElementById('dv-home-button').onclick = home;
    document.getElementById('dv-exit').onclick = async () => {
      try { await api('logout','POST'); }
      finally { login(); }
    };
    document.getElementById('dv-alerts').onclick = () =>
      alert('Las notificaciones estarán disponibles al conectar la agenda.');
    document.getElementById('dv-settings').onclick = () => {
      if (confirm('¿Abrir respaldos administrativos?')) go('backup');
    };
    document.getElementById('dv-private').onclick = privateHub;
    document.getElementById('dv-print').onclick = printHub;
    document.getElementById('dv-calendar').onclick = () =>
      window.open('https://calendar.google.com/calendar/u/0/r',
        '_blank','noopener');

    api('patients').then(rows => {
      const today = new Date();
      const md = String(today.getMonth()+1).padStart(2,'0')
        + '-' + String(today.getDate()).padStart(2,'0');
      const birthdays = rows.filter(p =>
        !p.archivado &&
        typeof p.fecha_nacimiento === 'string' &&
        p.fecha_nacimiento.slice(5,10) === md
      );
      const el = document.getElementById('dv-birthdays');
      if (el) el.textContent = birthdays.length
        ? birthdays.map(p => p.nombre).join(', ') : '0 hoy';
    }).catch(() => {
      const el = document.getElementById('dv-birthdays');
      if (el) el.textContent = 'No disponible';
    });
  };

  function privateHub() {
    app.innerHTML = `<div class="dv-home">
      <div class="dv-top"><button class="dv-icon" id="dv-private-back" aria-label="Volver a inicio">←</button><strong>Administración privada</strong><span aria-hidden="true">▣</span></div>
      <main class="dv-private-main">
        <h2>Administración del consultorio</h2>
        <p>Acceso reservado para el control interno del consultorio.</p>
        <div class="dv-private-grid">
          <section class="dv-private-card"><span aria-hidden="true" class="dv-private-symbol">▤</span><h3>Finanzas</h3><p>Ingresos, egresos y movimientos del consultorio, la combi y personales.</p><span class="dv-private-pending">Módulo pendiente de implementación</span></section>
          <section class="dv-private-card"><span aria-hidden="true" class="dv-private-symbol">▦</span><h3>Inventario</h3><p>Materiales, instrumental, existencias, movimientos y caducidades.</p><span class="dv-private-pending">Módulo pendiente de implementación</span></section>
        </div>
        <p class="dv-private-note">Estas herramientas aún no registran ni modifican información. Se habilitarán al implementar sus módulos y almacenamiento.</p>
      </main>
    </div>`;
    document.getElementById('dv-private-back').onclick = home;
  }

  async function printHub() {
    app.innerHTML = `<div class="dv-home">
      <div class="dv-top">
        <button class="dv-icon" id="ph-back">←</button>
        <strong>Imprimibles · Clínica</strong>
      </div>
      <main style="padding:16px;max-width:780px;margin:auto">
        <h2>Imprimibles</h2>
        <p>Selecciona un paciente o una escuela.</p>
        <div class="card">
          <h3>Buscar paciente</h3>
          <input id="ph-search" placeholder="Nombre o folio">
          <div id="ph-patients">Cargando pacientes…</div>
        </div>
        <div class="card">
          <h3>Buscar escuela</h3>
          <input id="ph-school-search"
            placeholder="Nombre del plantel">
          <div id="ph-schools">Cargando escuelas…</div>
        </div>
        <div id="ph-report"></div>
      </main>
    </div>`;

    document.getElementById('ph-back').onclick = home;

    try {
      const rows = await api('patients');
      const draw = () => {
        const input = document.getElementById('ph-search');
        const box = document.getElementById('ph-patients');
        if (!input || !box) return;
        const q = input.value.trim().toLowerCase();
        const filtered = rows.filter(p =>
          !p.archivado &&
          (String(p.nombre||'').toLowerCase().includes(q) ||
           String(p.folio||'').includes(q))
        );
        box.innerHTML = filtered.slice(0,50).map((p,i) => `
          <div class="item">
            <strong>${safe(p.nombre)}</strong>
            · Folio ${safe(p.folio)}
            <p><button class="btn secondary"
              data-patient-index="${i}">Elegir paciente</button></p>
          </div>`).join('') || '<p>No hay coincidencias.</p>';

        box.querySelectorAll('[data-patient-index]').forEach(b =>
          b.onclick = () => {
            patient = filtered[Number(b.dataset.patientIndex)];
            patientPrintMenu();
          }
        );
      };
      document.getElementById('ph-search').oninput = draw;
      draw();
    } catch(e) {
      const el = document.getElementById('ph-patients');
      if(el) el.textContent = 'Error: ' + e.message;
    }

    try {
      const schools = await api('schools');
      const draw = () => {
        const input = document.getElementById('ph-school-search');
        const box = document.getElementById('ph-schools');
        if (!input || !box) return;
        const q = input.value.trim().toLowerCase();
        const filtered = schools.filter(s =>
          String(s.nombre||'').toLowerCase().includes(q)
        );
        box.innerHTML = filtered.map((s,i) => `
          <div class="item">
            <strong>${safe(s.nombre)}</strong>
            · ${safe(s.localidad)}
            <p><button class="btn secondary"
              data-school-index="${i}">Preparar informe</button></p>
          </div>`).join('') || '<p>No hay coincidencias.</p>';

        box.querySelectorAll('[data-school-index]').forEach(b =>
          b.onclick = () =>
            schoolReport(filtered[Number(b.dataset.schoolIndex)])
        );
      };
      document.getElementById('ph-school-search').oninput = draw;
      draw();
    } catch(e) {
      const el = document.getElementById('ph-schools');
      if(el) el.textContent = 'Error: ' + e.message;
    }
  }

  function patientPrintMenu() {
    const box = document.getElementById('ph-report');
    if (!box || !patient) return;
    box.innerHTML = `<div class="card">
      <h3>Paciente: ${safe(patient.nombre)}</h3>
      <p>Folio ${safe(patient.folio)}</p>
      <div class="toolbar">
        <button class="btn" id="ph-clinical">
          Receta y consentimiento
        </button>
        <button class="btn" id="ph-quote">
          Cotización imprimible
        </button>
      </div>
      <div id="ph-message"></div>
    </div>`;

    document.getElementById('ph-clinical').onclick = () =>
      printables();

    document.getElementById('ph-quote').onclick = async () => {
      const msg = document.getElementById('ph-message');
      msg.textContent = 'Consultando tratamientos…';
      try {
        const quotes = await api(
          'quotes?patient=' + encodeURIComponent(patient.id)
        );
        const active = quotes.filter(q => q.status !== 'cancelado');
        const total = active.reduce(
          (sum,q) => sum + Number(q.amount_cents||0),0
        );
        const lines = active.map(q => `<tr>
          <td>${safe(q.tooth||'General')}</td>
          <td>${safe(q.procedure)}</td>
          <td>${money(Number(q.amount_cents||0))}</td>
        </tr>`).join('');

        const body = `
          <h2>Cotización de tratamientos</h2>
          <p><strong>Paciente:</strong> ${safe(patient.nombre)}
          · <strong>Folio:</strong> ${safe(patient.folio)}</p>
          <p><strong>Fecha:</strong> ${fecha()}</p>
          <table style="width:100%;border-collapse:collapse"
            border="1" cellpadding="7">
            <thead><tr>
              <th>Diente</th><th>Tratamiento</th><th>Importe</th>
            </tr></thead>
            <tbody>${lines || '<tr><td colspan="3">Sin tratamientos cotizados</td></tr>'}</tbody>
          </table>
          <h3>Total: ${money(total)}</h3>
          <p>Presupuesto sujeto a valoración y cambios clínicos
          debidamente informados.</p>`;

        openPrint(body,'Cotización');
        msg.textContent = '';
      } catch(e) {
        msg.textContent = 'No se pudo generar: ' + e.message;
      }
    };
  }

  function schoolReport(school) {
    const box = document.getElementById('ph-report');
    if (!box) return;
    box.innerHTML = `<div class="card">
      <h3>Informe escolar: ${safe(school.nombre)}</h3>
      <p>Captura resultados verificados manualmente.</p>
      <label>Grupo</label>
      <input id="sr-group" placeholder="Ej. 3° A">
      <label>Niños evaluados</label>
      <input id="sr-total" type="number" min="0" step="1">
      <label>Niños con caries</label>
      <input id="sr-caries" type="number" min="0" step="1">
      <label>Otras incidencias y grupos con mayor frecuencia</label>
      <textarea id="sr-notes" rows="4"></textarea>
      <button class="btn" id="sr-print"
        style="margin-top:12px">Generar informe imprimible</button>
      <p id="sr-error" role="alert"></p>
    </div>`;

    document.getElementById('sr-print').onclick = () => {
      const rawTotal = document.getElementById('sr-total').value;
      const rawCaries = document.getElementById('sr-caries').value;
      const total = Number(rawTotal);
      const caries = Number(rawCaries);

      if (rawTotal === '' || rawCaries === '' ||
          !Number.isInteger(total) || !Number.isInteger(caries) ||
          total < 0 || caries < 0 || caries > total) {
        document.getElementById('sr-error').textContent =
          'Revisa las cantidades: caries no puede superar el total.';
        return;
      }

      const group = document.getElementById('sr-group').value;
      const notes = document.getElementById('sr-notes').value;
      const percentage = total
        ? ((caries/total)*100).toFixed(1)+'%'
        : 'No calculable';

      const body = `
        <h2>Informe de salud bucal escolar</h2>
        <p><strong>Escuela:</strong> ${safe(school.nombre)}</p>
        <p><strong>Localidad:</strong> ${safe(school.localidad)}</p>
        <p><strong>Grupo:</strong> ${safe(group||'No especificado')}</p>
        <p><strong>Fecha:</strong> ${fecha()}</p>
        <p><strong>Niños evaluados:</strong> ${total}</p>
        <p><strong>Niños con caries:</strong> ${caries}</p>
        <p><strong>Porcentaje con caries:</strong> ${percentage}</p>
        <p><strong>Otras incidencias y observaciones:</strong></p>
        <p style="white-space:pre-wrap">${safe(notes||'Sin información adicional')}</p>
        <p><em>Resultados introducidos manualmente.</em></p>`;

      openPrint(body,'Informe escolar');
    };
  }

  function openPrint(body,title) {
    const w = window.open('','_blank');
    if (!w) {
      alert('Permite ventanas emergentes para imprimir.');
      return;
    }
    const header = `<div style="display:flex;align-items:center;
      gap:18px;border-bottom:3px solid #087c83;padding-bottom:12px">
      <img src="${logo}" alt="Dentista Viajero"
        style="width:115px;max-height:90px;object-fit:contain">
      <div>
        <strong>Dentista Viajero · Odontopediatría</strong><br>
        ${doctor}<br>
        Cédula de especialidad ${cedula}<br>
        Teléfono ${telefono}
      </div></div>`;

    w.document.write(`<!doctype html><html lang="es">
      <head><meta charset="utf-8"><title>${safe(title)}</title>
      <style>
        body{font:15px Arial,sans-serif;line-height:1.55;
          max-width:800px;margin:28px auto;padding:18px;color:#142f3b}
        h2{color:#075d88}
        table{margin:20px 0}
        th{background:#e8f7ff}
        td,th{text-align:left}
        @media print{body{margin:0;padding:10px}}
      </style></head>
      <body>${header}${body}<hr>
      <p>Firma del profesional: ______________________________</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(),350);
  }
})();
