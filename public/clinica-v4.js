/* Dentista Viajero v4: WhatsApp directo, borrado de cargos y cuentas por área. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>(n/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const labels={ortopedia:'Ortopedia',operatoria:'Operatoria',prevencion:'Prevención',campana:'Campaña'};
const category=procedure=>{const x=String(procedure||'').toLowerCase();if(/ortopedia|bracket|aparato/.test(x))return 'ortopedia';if(/campaña|campana/.test(x))return 'campana';if(/consulta|prevent|flúor|fluor|sellador|choque|paste|diamino|profilaxis|limpieza|remineral|barniz/.test(x))return 'prevencion';return 'operatoria'};
window.dvCategoryFor=category;
const request=async(path,method='GET',data)=>{const r=await fetch('/api/clinica-v4/'+path,{method,credentials:'same-origin',headers:{'content-type':'application/json'},body:data?JSON.stringify(data):undefined});let x=await r.json();if(!r.ok)throw Error(x.error||'Error');return x};
// Intercepta el botón de compartir ANTES del controlador anterior.
document.addEventListener('click',async ev=>{
 const b=ev.target.closest?.('[data-action="share"]');if(!b||!b.closest('.dv-patients'))return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const area=b.closest('#dv-p-detail')||b.closest('.dv-p-pane');const title=area?.querySelector('h1,h2,.dv-p-name')?.textContent?.trim();
 const list=typeof patients!=='undefined'?patients:await window.api('patients');
 const visible=area?.textContent||'';
 let matches=list.filter(p=>p.nombre?.trim()===title);if(matches.length!==1)matches=list.filter(p=>visible.includes(p.nombre)&&visible.includes(String(p.folio).padStart(4,'0')));
 if(matches.length!==1){alert('No se pudo identificar un expediente único. Abre la ficha del paciente e inténtalo de nuevo.');return}
 const p=matches[0],raw=String(p.telefono||'').replace(/\D/g,'');let tel=raw.length===10?'52'+raw:raw;
 if(!/^\d{11,15}$/.test(tel)){alert('Este expediente no tiene un teléfono válido del tutor. Corrígelo en Editar datos.');return}
 window.location.assign('https://wa.me/'+tel);
},true);
let currentId=null,loading=false;
async function render(){const form=document.querySelector('#quoteform');if(!form||typeof patient==='undefined'||!patient?.id)return;const id=patient.id;
 if(loading||form.dataset.dvV4===id)return;loading=true;
 try{
 const [quotes,payments]=await Promise.all([window.api('quotes?patient='+encodeURIComponent(id)),window.api('payments?patient='+encodeURIComponent(id))]);
 if(!form.isConnected||patient.id!==id)return;
 form.dataset.dvV4=id;currentId=id;
 const card=form.closest('.card');if(!card)return;
 const payform=card.querySelector('#payform');if(payform){const area=document.createElement('label');area.id='dv-pay-area';area.textContent='Aplicar abono a';area.innerHTML='<strong>Aplicar abono a</strong><select name="category">'+Object.entries(labels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')+'</select>';payform.prepend(area);payform.addEventListener('submit',e=>{if(e.defaultPrevented)return},true);
 // El manejador original no incluye categoría; interceptar para guardar correctamente.
 payform.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();const fd=new FormData(payform);const amount=Math.round(Number(fd.get('amount'))*100),concept=String(fd.get('concept')||'Abono'),cat=String(fd.get('category'));if(!Number.isSafeInteger(amount)||amount<=0)return alert('Importe inválido');const btn=payform.querySelector('button[type="submit"],button');btn.disabled=true;try{await window.api('payments','POST',{patient:id,amount_cents:amount,concept,category:cat});await patientBalance()}catch(err){alert(err.message);btn.disabled=false}},true);
 }
 const qformSelect=form.querySelector('[name="procedure"]');if(qformSelect){form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();const fd=new FormData(form);const amount=Math.round(Number(fd.get('amount'))*100);if(!Number.isSafeInteger(amount)||amount<0)return alert('Importe inválido');try{await window.api('quotes','POST',{patient:id,tooth:String(fd.get('tooth')||''),procedure:String(fd.get('procedure')),amount_cents:amount,source:'manual',category:category(fd.get('procedure'))});await patientBalance()}catch(err){alert(err.message)}},true)}
 const section=document.createElement('section');section.id='dv-accounts-v4';section.style.cssText='border:2px solid #a5d9d2;border-radius:16px;padding:14px;margin:14px 0;background:#f5fffb';
 const qs={ortopedia:0,operatoria:0,prevencion:0,campana:0},ps={...qs};quotes.forEach(q=>{if(q.status==='cancelado')return;qs[q.category||category(q.procedure)]+=q.amount_cents});payments.forEach(x=>{ps[x.category||'sin_clasificar']=(ps[x.category||'sin_clasificar']||0)+x.amount_cents});
 section.innerHTML='<h3>Cuentas independientes</h3><p style="font-size:13px">Los abonos antiguos sin categoría aparecen pendientes de clasificación; no se vuelven a cobrar.</p><div style="overflow-x:auto"><table style="width:100%"><thead><tr><th>Área</th><th>Cotizado</th><th>Abonado</th><th>Restante</th></tr></thead><tbody>'+Object.keys(labels).map(k=>`<tr><td>${labels[k]}</td><td>${money(qs[k])}</td><td>${money(ps[k])}</td><td><b>${money(qs[k]-ps[k])}</b></td></tr>`).join('')+'</tbody></table></div>'+(ps.sin_clasificar?`<p><strong>Abonos antiguos por clasificar: ${money(ps.sin_clasificar)}</strong></p>`:'');
 form.before(section);
 const rows=[...card.querySelectorAll('[data-quote]')];rows.forEach(sel=>{const q=quotes.find(x=>x.id===sel.dataset.quote);if(!q)return;const row=sel.closest('.item');if(!row)return;const controls=document.createElement('div');controls.className='dv-v4-actions';controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';const cat=document.createElement('select');cat.setAttribute('aria-label','Área del cargo');cat.innerHTML=Object.entries(labels).map(([k,v])=>`<option value="${k}" ${k===(q.category||category(q.procedure))?'selected':''}>${v}</option>`).join('');cat.onchange=async()=>{try{await request('categoria/'+q.id,'PUT',{type:'quote',category:cat.value});await patientBalance()}catch(e){alert(e.message)}};
 const del=document.createElement('button');del.type='button';del.className='btn secondary';del.textContent='Eliminar cargo erróneo';del.onclick=async()=>{const motivo=prompt('Motivo para retirar este cargo del estado de cuenta:');if(motivo===null)return;if(motivo.trim().length<5)return alert('Escribe al menos 5 caracteres');if(!confirm('¿Eliminar este cargo? Se conservará un registro administrativo.'))return;del.disabled=true;try{await request('cargo/'+q.id,'DELETE',{motivo});await patientBalance()}catch(e){alert(e.message);del.disabled=false}};controls.append(cat,del);row.append(controls)});
 if(payments.length){const heading=[...card.querySelectorAll('h3')].find(x=>x.textContent.trim()==='Abonos');if(heading){const pitems=[...heading.parentElement.querySelectorAll('.item')].filter(x=>payments.some(p=>x.textContent.includes(p.created_at)&&x.textContent.includes(p.concept)));pitems.forEach((row,i)=>{const pay=payments[i];if(!pay)return;const select=document.createElement('select');select.setAttribute('aria-label','Clasificar abono');select.innerHTML='<option value="">Sin clasificar</option>'+Object.entries(labels).map(([k,v])=>`<option value="${k}" ${pay.category===k?'selected':''}>${v}</option>`).join('');select.onchange=async()=>{if(!select.value)return;try{await request('categoria/'+pay.id,'PUT',{type:'payment',category:select.value});await patientBalance()}catch(e){alert(e.message)}};row.append(select)})}}
 }catch(e){console.error('DV cuentas v4',e)}finally{loading=false}
}
const mo=new MutationObserver(()=>{if(document.querySelector('#quoteform')&&!loading)render()});mo.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});render();
})();
