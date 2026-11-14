/* Extensión de formatos clínicos. No modifica registros de pacientes. */
(function () {
  const nombreDoctor = 'Dr. Valentín Naif Hamsho Domínguez';
  const cedula = '8536800';
  const telefono = '2291571065';
  const hoy = () => new Date().toLocaleDateString('es-MX', {year:'numeric',month:'long',day:'numeric'});
  const limpiar = v => esc(v == null ? '' : v);
  const cabecera = () => `<div class="dv-doc-header"><h2>Dentista Viajero · Odontopediatría</h2><p><strong>${nombreDoctor}</strong><br>Cédula de especialidad: <strong>${cedula}</strong><br>Teléfono: <strong>${telefono}</strong></p></div>`;

  function imprimirDocumento() {
    const hoja = document.getElementById('dv-documento');
    if (!hoja || !hoja.textContent.trim()) { alert('Primero selecciona un formato.'); return; }
    window.print();
  }

  printables = function () {
    if (!patient) { go('patients'); return; }
    shell(`<div class="card dv-print-controls"><button class="btn secondary" id="back">← Expediente</button><h2>Imprimibles · ${limpiar(patient.nombre)}</h2><div class="toolbar"><button class="btn" id="recipe">Receta</button><button class="btn" id="consent">Consentimiento informado</button><button class="btn" id="print">Imprimir / Guardar PDF</button></div><p class="muted">Revisa y completa el documento antes de imprimir. La autorización de promoción es opcional.</p></div><div id="dv-documento"></div>`);
    document.getElementById('back').onclick = ficha;
    document.getElementById('print').onclick = imprimirDocumento;
    document.getElementById('recipe').onclick = receta;
    document.getElementById('consent').onclick = consentimiento;
  };

  function receta() {
    document.getElementById('dv-documento').innerHTML = `<article class="dv-paper">${cabecera()}<h2>Receta odontológica</h2><p><strong>Paciente:</strong> ${limpiar(patient.nombre)}<br><strong>Fecha:</strong> ${hoy()}</p><label>Indicaciones / prescripción</label><textarea rows="12" placeholder="Escribe aquí las indicaciones..."></textarea><p style="margin-top:45px">Firma del profesional: ___________________________________</p><p>${nombreDoctor}</p></article>`;
  }

  function consentimiento() {
    const tutor = patient.tutor_nombre || '';
    document.getElementById('dv-documento').innerHTML = `<article class="dv-paper">${cabecera()}<h2>Consentimiento informado para atención odontopediátrica</h2><p><strong>Fecha:</strong> ${hoy()}</p>
    <p>Yo, <strong>${tutor ? limpiar(tutor) : '________________________________________'}</strong>, en mi carácter de:</p>
    <p class="dv-checks">☐ Madre &nbsp; ☐ Padre &nbsp; ☐ Tutor(a) &nbsp; ☐ Responsable legal</p>
    <p>del paciente <strong>${limpiar(patient.nombre)}</strong>, declaro que he proporcionado información completa y verdadera sobre sus antecedentes médicos, alergias, enfermedades, medicamentos, hábitos y estado general de salud.</p>
    <p>Se me ha informado que, de acuerdo con la valoración clínica y las necesidades del paciente, podrán proponerse procedimientos odontológicos preventivos, diagnósticos, restaurativos, ortopédicos, de higiene, control y seguimiento, así como otros que el profesional considere clínicamente indicados.</p>
    <p>Entiendo que los procedimientos específicos, sus beneficios, riesgos, alternativas y costos deberán explicarse antes de su realización, y que podré plantear mis dudas y otorgar o rechazar mi autorización conforme corresponda.</p>
    <p>Me comprometo a seguir las indicaciones proporcionadas por el profesional, acudir a las citas de revisión, mantener las medidas de higiene recomendadas y cumplir con los cuidados necesarios para favorecer el éxito, mantenimiento y duración de los tratamientos.</p>
    <p>Reconozco que la evolución y duración de los tratamientos dependen de diversos factores clínicos y del cumplimiento de las indicaciones, por lo que no constituyen una garantía absoluta de resultados.</p>
    <h3>Uso de información personal</h3>
    <p>Los datos personales y de salud proporcionados se utilizarán para la integración del expediente clínico y el seguimiento odontológico, conforme al aviso de privacidad correspondiente. Los resultados estadísticos o educativos se presentarán sin identificar al paciente, salvo autorización específica.</p>
    <h3>Autorización adicional y opcional para promoción y marketing</h3>
    <p class="dv-checks">☐ Sí autorizo &nbsp;&nbsp; ☐ No autorizo</p>
    <p>Autorizo, únicamente si marco «Sí autorizo», el uso de fotografías, videos, testimonios u otra información identificable del paciente con fines de difusión educativa, promoción y marketing, de acuerdo con los usos y medios que se me hayan explicado y el aviso de privacidad correspondiente. Esta decisión no condiciona la atención odontológica.</p>
    <div class="dv-signatures"><div><p>________________________________</p><p>Nombre y firma de madre, padre, tutor o responsable legal</p><p>${limpiar(tutor)}</p></div><div><p>________________________________</p><p>Nombre y firma del profesional</p><p>${nombreDoctor}</p></div></div>
    <p><strong>Fecha:</strong> ${hoy()}</p></article>`;
  }

  const style = document.createElement('style');
  style.textContent = `.dv-paper{background:#fff;color:#172b36;max-width:800px;margin:14px auto;padding:25px 30px;box-shadow:0 2px 14px #0002;font:15px/1.5 Arial,sans-serif}.dv-paper h2{color:#075c80}.dv-paper p{margin:11px 0}.dv-paper textarea{width:100%;min-height:220px;border:1px solid #aaa;font:15px Arial}.dv-doc-header{border-bottom:2px solid #087c83;margin-bottom:18px}.dv-signatures{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:55px;text-align:center;font-size:13px}.dv-checks{font-size:16px}@media print{body{background:white!important}body>*,#app>*,header,main,.dv-print-controls,.toolbar,.noprint{visibility:hidden!important}#app,#dv-documento,.dv-paper,.dv-paper *{visibility:visible!important}#dv-documento{position:absolute;left:0;top:0;width:100%}.dv-paper{box-shadow:none;margin:0;padding:10mm;font-size:11pt;max-width:none}.dv-paper textarea{border:0;border-bottom:1px solid #aaa;resize:none}.dv-signatures{break-inside:avoid}@page{size:letter;margin:10mm}}`;
  document.head.appendChild(style);
})();
