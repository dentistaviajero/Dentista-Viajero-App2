/* Historial de navegación sin datos clínicos en URL o almacenamiento. */
(()=>{
 const browser=window.dvNativeHistory, routes=new Map(); if(!browser||typeof browser.pushState!=='function'||typeof browser.replaceState!=='function')return;let current=null,seq=0,epoch=crypto.randomUUID(),restoring=false;
 function reset(){routes.clear();current=null;epoch=crypto.randomUUID();try{browser.replaceState({dvEpoch:epoch,dvKey:0},'')}catch(e){console.warn(e)}}
 function enter(key,render){if(restoring)return;if(current?.key===key){current.render=render;return}const id=++seq;const route={key,render,id};routes.set(id,route);try{if(!current)browser.replaceState({dvEpoch:epoch,dvKey:id},'');else browser.pushState({dvEpoch:epoch,dvKey:id},'');current=route}catch(e){console.warn('Navegación no disponible',e)}}
 window.dvNav={enter,reset};
 window.addEventListener('popstate',async e=>{const target=e.state?.dvEpoch===epoch&&routes.get(e.state.dvKey);if(!target){if(current){reset();try{await api('me');home()}catch{}}return}current=target;restoring=true;try{await api('me');await target.render();window.scrollTo(0,0)}catch(err){if(!document.getElementById('login')){app.textContent='No se pudo regresar: '+err.message;const b=document.createElement('button');b.textContent='Inicio';b.onclick=()=>home();app.append(b)}}finally{restoring=false}});
 const wrap=(fn,key)=>function(...args){const p=patient;if(['home','patients','schools','balances','backup'].includes(key))window.dvClinicalLeave?.();enter(key+(p&&['edit','ficha','history','odonto','visits','balance','print'].includes(key)?':'+p.id:''),()=>{patient=p;if(['home','patients','schools','balances','backup'].includes(key))window.dvClinicalLeave?.();return fn(...args)});return fn(...args)};
 home=wrap(home,'home');list=wrap(list,'patients');schools=wrap(schools,'schools');balances=wrap(balances,'balances');backup=wrap(backup,'backup');editPatient=wrap(editPatient,'edit');
})();
