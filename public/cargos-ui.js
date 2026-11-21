/* Botones de eliminación para la pantalla de saldos; requiere cargosAPI conectada. */
(()=>{'use strict';
const enhance=()=>{
 const form=document.querySelector('#quoteform');if(!form||!window.patient||document.querySelector('#dv-delete-help'))return;
 const tip=document.createElement('p');tip.id='dv-delete-help';tip.textContent='Para retirar cargos erróneos, pulsa Eliminar en el tratamiento. Los cancelados también pueden retirarse.';form.after(tip);
 document.querySelectorAll('[data-quote]').forEach(sel=>{
  const row=sel.closest('.item');if(!row||row.querySelector('.dv-delete'))return;
  const btn=document.createElement('button');btn.type='button';btn.className='btn secondary dv-delete';btn.textContent='Eliminar cargo';btn.style.marginLeft='8px';
  btn.onclick=async()=>{const motivo=prompt('Motivo para eliminar este cargo del estado de cuenta:');if(motivo===null)return;if(motivo.trim().length<5)return alert('Escribe un motivo de al menos 5 caracteres');if(!confirm('¿Eliminar este cargo del estado de cuenta? Se conservará registro administrativo.'))return;
   btn.disabled=true;try{const r=await fetch('/api/cargos/'+sel.dataset.quote,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({motivo})});const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo eliminar');await window.patientBalance()}catch(e){alert(e.message);btn.disabled=false}
  };row.append(btn);
 });
};
new MutationObserver(enhance).observe(document.querySelector('#app')||document.body,{subtree:true,childList:true});enhance();
})();
