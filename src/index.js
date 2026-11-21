import { clinicaV4API } from './clinica-v4-api.js';
import { escuelasAPI } from './escuelas-api.js';
import { seguimientoAPI } from './seguimiento-api.js';
const J=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const E=(msg,s=400)=>J({error:msg},s), uid=()=>crypto.randomUUID();
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const digest=async x=>hex(await crypto.subtle.digest('SHA-256',enc.encode(x)));
async function sig(secret,msg){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(msg)))}
function eq(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
async function valid(req,env){const secret=env.ADMIN_TOKEN;if(!secret||secret.length<16)return false;const c=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('dv_session='));if(!c)return false;const parts=c.slice(11).split('.');if(parts.length!==2)return false;const [until,signature]=parts;if(!/^\d{13}$/.test(until)||Number(until)<Date.now())return false;return eq(signature,await sig(secret,until))}
async function read(req){const s=await req.text();if(s.length>180000)return null;try{return s?JSON.parse(s):{}}catch{return null}}
function origin(req){const o=req.headers.get('origin');return !o||o===new URL(req.url).origin}
const allow={patients:['nombre','fecha_nacimiento','tutor_nombre','tutor_parentesco','telefono','correo','ciudad','colonia','medico','origen','origen_otro','escuela_campana','estado','archivado'],schools:['nombre','clave','localidad']};
const fields=(d,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(d,k)).map(k=>[k,d[k]]));
const str=v=>typeof v==='string'&&v.length<=10000;
const safe=d=>Object.values(d).every(v=>v===null||str(v)||typeof v==='number');
async function audit(db,entity,id,action){await db.prepare('INSERT INTO dv2_audit(id,entity,entity_id,action) VALUES(?,?,?,?)').bind(uid(),entity,id,action).run()}
const tables=['dv2_patients','dv2_histories','dv2_marks','dv2_tooth_notes','dv2_visits','dv2_quotes','dv2_payments','dv2_schools'];
async function api(req,env){const db=env.DB;if(!db)return E('Falta enlace DB',503);const u=new URL(req.url),p=u.pathname,m=req.method;
 if(m!=='GET'&&!origin(req))return E('Origen no permitido',403);
 if(p==='/api/login'&&m==='POST'){
  const d=await read(req);if(!d||!str(d.token))return E('Contraseña inválida',401);
  if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<16)return E('Configura ADMIN_TOKEN (mínimo 16 caracteres)',503);
  const a=await digest(d.token),b=await digest(env.ADMIN_TOKEN);if(!eq(a,b))return E('Contraseña incorrecta',401);
  const until=String(Date.now()+8*60*60*1000);const signature=await sig(env.ADMIN_TOKEN,until);
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json','cache-control':'no-store','set-cookie':`dv_session=${until}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`}})
 }
 if(p==='/api/logout'&&m==='POST')return new Response('{"ok":true}',{headers:{'content-type':'application/json','set-cookie':'dv_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'}});
 if(!await valid(req,env))return E('Sesión no autorizada',401);
 if(p==='/api/me')return J({ok:true});
 const respuestaSeguimiento = await seguimientoAPI(req,env);
 if(respuestaSeguimiento)return respuestaSeguimiento;
 const respuestaClinicaV4 = await clinicaV4API(req,env);
 if(respuestaClinicaV4)return respuestaClinicaV4;
 const respuestaEscuelas = await escuelasAPI(req,env);
if(respuestaEscuelas)return respuestaEscuelas;
 if(p==='/api/patients'&&m==='GET')return J((await db.prepare('SELECT * FROM dv2_patients ORDER BY folio DESC LIMIT 1500').all()).results);
 if(p==='/api/patients'&&m==='POST'){
  const d=await read(req);if(!d||!str(d.nombre)||!d.nombre.trim())return E('Nombre obligatorio');const x=fields(d,allow.patients);if(!safe(x))return E('Datos inválidos');const id=uid();
  const result=await db.batch([db.prepare("UPDATE dv2_counter SET value=value+1 WHERE name='patient'"),db.prepare(`INSERT INTO dv2_patients(id,folio,${Object.keys(x).join(',')}) VALUES(?,(SELECT value FROM dv2_counter WHERE name='patient'),${Object.keys(x).map(()=>'?').join(',')})`).bind(id,...Object.values(x))]);await audit(db,'patient',id,'create');return J({id},201) }
 const patient=p.match(/^\/api\/patients\/([a-f0-9-]+)$/);if(patient){const id=patient[1];if(m==='PATCH'){const d=await read(req),x=d&&fields(d,allow.patients);if(!x||!safe(x)||!Object.keys(x).length)return E('Datos inválidos');await db.prepare(`UPDATE dv2_patients SET ${Object.keys(x).map(k=>k+'=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...Object.values(x),id).run();await audit(db,'patient',id,'update');return J({ok:true})}if(m==='GET')return J(await db.prepare('SELECT * FROM dv2_patients WHERE id=?').bind(id).first())}
 const patientDelete=p.match(/^\/api\/patients\/([a-f0-9-]+)$/);
 if(patientDelete&&m==='DELETE'){
  const id=patientDelete[1];
  const exists=await db.prepare('SELECT id FROM dv2_patients WHERE id=?').bind(id).first();
  if(!exists)return E('Paciente no encontrado',404);
  await db.batch([
   db.prepare('DELETE FROM dv2_marks WHERE patient_id=?').bind(id),
   db.prepare('DELETE FROM dv2_tooth_notes WHERE patient_id=?').bind(id),
   db.prepare('DELETE FROM dv2_visits WHERE patient_id=?').bind(id),
   db.prepare('DELETE FROM dv2_quotes WHERE patient_id=?').bind(id),
   db.prepare('DELETE FROM dv2_payments WHERE patient_id=?').bind(id),
   db.prepare('DELETE FROM dv2_histories WHERE patient_id=?').bind(id),
   db.prepare('DELETE FROM dv2_patients WHERE id=?').bind(id)
  ]);
  await audit(db,'patient',id,'delete');
  return J({ok:true});
 }if(p==='/api/history'&&m==='GET'){const id=u.searchParams.get('patient');return J(JSON.parse((await db.prepare('SELECT data FROM dv2_histories WHERE patient_id=?').bind(id).first())?.data||'{}'))}
 if(p==='/api/history'&&m==='PUT'){const d=await read(req);if(!d||!str(d.patient)||!d.data||typeof d.data!=='object'||JSON.stringify(d.data).length>80000)return E('Historia inválida');await db.prepare('INSERT INTO dv2_histories(patient_id,data) VALUES(?,?) ON CONFLICT(patient_id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP').bind(d.patient,JSON.stringify(d.data)).run();await audit(db,'history',d.patient,'update');return J({ok:true})}
 if(p==='/api/marks'&&m==='GET'){const id=u.searchParams.get('patient');return J({marks:(await db.prepare('SELECT * FROM dv2_marks WHERE patient_id=? ORDER BY created_at').bind(id).all()).results,notes:(await db.prepare('SELECT * FROM dv2_tooth_notes WHERE patient_id=?').bind(id).all()).results})}
 if(p==='/api/marks'&&m==='POST'){const d=await read(req);if(!d||!/^([1-4][1-8]|[5-8][1-5])$/.test(d.tooth)||!['V','M','D','L','O'].includes(d.surface)||!['caries','restauracion','blanca','sarro'].includes(d.code))return E('Marca inválida');await db.batch([db.prepare('DELETE FROM dv2_marks WHERE patient_id=? AND tooth=? AND surface=?').bind(d.patient,d.tooth,d.surface),db.prepare('INSERT INTO dv2_marks(id,patient_id,tooth,surface,code) VALUES(?,?,?,?,?)').bind(uid(),d.patient,d.tooth,d.surface,d.code)]);await audit(db,'mark',d.patient,'add');return J({ok:true})}
 const mark=p.match(/^\/api\/marks\/([a-f0-9-]+)$/);if(mark&&m==='DELETE'){await db.prepare('DELETE FROM dv2_marks WHERE id=?').bind(mark[1]).run();await audit(db,'mark',mark[1],'remove');return J({ok:true})}
 if(p==='/api/tooth-note'&&m==='PUT'){const d=await read(req);if(!d||!str(d.patient)||!/^([1-4][1-8]|[5-8][1-5])$/.test(d.tooth)||!Array.isArray(d.symbols)||!d.symbols.every(x=>['X','RR','MS','HM','M','✓'].includes(x))||!str(d.notes))return E('Anotación inválida');await db.prepare('INSERT INTO dv2_tooth_notes(patient_id,tooth,symbols,notes) VALUES(?,?,?,?) ON CONFLICT(patient_id,tooth) DO UPDATE SET symbols=excluded.symbols,notes=excluded.notes').bind(d.patient,d.tooth,JSON.stringify(d.symbols),d.notes).run();await audit(db,'tooth',d.patient,'update');return J({ok:true})}
 if(p==='/api/visits'&&m==='GET')return J((await db.prepare('SELECT * FROM dv2_visits WHERE patient_id=? ORDER BY created_at DESC').bind(u.searchParams.get('patient')).all()).results);
 if(p==='/api/visits'&&m==='POST'){const d=await read(req);if(!d||!str(d.patient)||!d.data||JSON.stringify(d.data).length>30000)return E('Nota inválida');const id=uid();await db.prepare('INSERT INTO dv2_visits(id,patient_id,data) VALUES(?,?,?)').bind(id,d.patient,JSON.stringify(d.data)).run();await audit(db,'visit',id,'create');return J({id},201)}
 if(p==='/api/quotes'&&m==='GET')return J((await db.prepare("SELECT q.*, COALESCE(qc.category, '') AS category FROM dv2_quotes q LEFT JOIN dv2_quote_categories qc ON qc.quote_id=q.id WHERE q.patient_id=? ORDER BY q.created_at").bind(u.searchParams.get('patient')).all()).results);
 if(p==='/api/quotes'&&m==='POST'){const d=await read(req);if(!d||!str(d.patient)||!str(d.procedure)||!d.procedure.trim()||!Number.isSafeInteger(d.amount_cents)||d.amount_cents<0)return E('Cotización inválida');const id=uid();if(d.procedure==='MI Paste Plus'&&['automatico','odontograma'].includes(d.source)){const prior=await db.prepare("SELECT id FROM dv2_quotes WHERE patient_id=? AND procedure='MI Paste Plus' AND status!='cancelado' LIMIT 1").bind(d.patient).first();if(prior)return J({id:prior.id,already_exists:true});}await db.prepare('INSERT INTO dv2_quotes(id,patient_id,tooth,procedure,amount_cents,status,source) VALUES(?,?,?,?,?,?,?)').bind(id,d.patient,d.tooth||null,d.procedure,d.amount_cents,'pendiente',d.source||'manual').run();if(['ortopedia','operatoria','prevencion','campana'].includes(d.category))await db.prepare('INSERT INTO dv2_quote_categories(quote_id,category) VALUES(?,?)').bind(id,d.category).run();await audit(db,'quote',id,'create');return J({id},201)}
 const quote=p.match(/^\/api\/quotes\/([a-f0-9-]+)$/);if(quote&&m==='PATCH'){const d=await read(req);if(!d||!['pendiente','en_proceso','terminado','cancelado'].includes(d.status))return E('Estado inválido');await db.prepare('UPDATE dv2_quotes SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(d.status,quote[1]).run();await audit(db,'quote',quote[1],'status');return J({ok:true})}
 if(p==='/api/payments'&&m==='GET')return J((await db.prepare("SELECT p.*, COALESCE(pc.category, '') AS category FROM dv2_payments p LEFT JOIN dv2_payment_categories pc ON pc.payment_id=p.id WHERE p.patient_id=? ORDER BY p.created_at DESC").bind(u.searchParams.get('patient')).all()).results);
 if(p==='/api/payments'&&m==='POST'){const d=await read(req);if(!d||!str(d.patient)||!Number.isSafeInteger(d.amount_cents)||d.amount_cents<=0||!str(d.concept||''))return E('Pago inválido');const id=uid();await db.prepare('INSERT INTO dv2_payments(id,patient_id,amount_cents,concept) VALUES(?,?,?,?)').bind(id,d.patient,d.amount_cents,d.concept||'Abono').run();if(['ortopedia','operatoria','prevencion','campana'].includes(d.category))await db.prepare('INSERT INTO dv2_payment_categories(payment_id,category) VALUES(?,?)').bind(id,d.category).run();await audit(db,'payment',id,'create');return J({id},201)}
 if(p==='/api/schools'&&m==='GET')return J((await db.prepare('SELECT * FROM dv2_schools ORDER BY nombre').all()).results);
 if(p==='/api/schools'&&m==='POST'){const d=await read(req);if(!d||!str(d.nombre)||!d.nombre.trim())return E('Nombre obligatorio');const id=uid(),x=fields(d,allow.schools);if(!safe(x))return E('Datos inválidos');await db.prepare('INSERT INTO dv2_schools(id,nombre,clave,localidad) VALUES(?,?,?,?)').bind(id,x.nombre,x.clave||'',x.localidad||'').run();return J({id},201)}
 if(p==='/api/backup'&&m==='GET'){const data={formato:'dv-clinica-v2',version:2,fecha:new Date().toISOString(),tablas:{}};for(const t of tables)data.tablas[t]=(await db.prepare(`SELECT * FROM ${t} LIMIT 10000`).all()).results;return J(data)}
 return E('Ruta desconocida',404)
}
export default {async fetch(req,env){try{const u=new URL(req.url);if(u.pathname.startsWith('/api/'))return await api(req,env);const r=await env.ASSETS.fetch(req);const h=new Headers(r.headers);h.set('x-content-type-options','nosniff');h.set('x-frame-options','DENY');h.set('cache-control','no-store');h.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");return new Response(r.body,{status:r.status,headers:h})}catch(e){console.error(e);return E('Error interno. Revisa los registros del Worker.',500)}}};
