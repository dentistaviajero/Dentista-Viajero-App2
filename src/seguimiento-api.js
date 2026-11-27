/* API de seguimiento: importar tras autenticar la sesión en index.js. */
const J=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const E=(v,s=400)=>J({error:v},s);
const keys=['preventive_date','next_date','treatment_review_date','appointment_date','appointment_time','birthday_coupon'];
const statuses=['yes','pending','no'];
const date=s=>s===''||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T12:00:00')));
const time=s=>s===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export async function seguimientoAPI(req,env){
 const u=new URL(req.url),p=u.pathname,m=req.method;if(!p.startsWith('/api/seguimiento'))return null;const db=env.DB;
 if(p==='/api/seguimiento/annie'&&m==='POST'){
 let d;try{d=await req.json()}catch{return E('JSON inválido')}
 const row=await db.prepare('SELECT p.telefono,p.tutor_parentesco,p.archivado,f.promo_permission FROM dv2_patients p JOIN dv2_followup f ON f.patient_id=p.id WHERE p.id=?').bind(String(d?.patient_id||'')).first();
 if(!row||row.archivado||row.promo_permission!=='yes'||!/^(madre|mam[aá])$/i.test(String(row.tutor_parentesco||'').trim()))return E('Falta autorización o parentesco materno',403);
 let tel=String(row.telefono||'').replace(/\D/g,'');if(tel.length===10)tel='52'+tel;if(!/^52\d{10}$/.test(tel))return E('Teléfono inválido');
 await db.prepare('CREATE TABLE IF NOT EXISTS dv2_annie_sent (phone TEXT PRIMARY KEY, sent_at TEXT DEFAULT CURRENT_TIMESTAMP)').run();
 await db.prepare('INSERT OR IGNORE INTO dv2_annie_sent(phone) VALUES(?)').bind(tel).run();return J({ok:true});
 }
 if(p==='/api/seguimiento'&&m==='GET'){
  const rows=(await db.prepare('SELECT * FROM dv2_followup').all()).results;
  const events=(await db.prepare('SELECT * FROM dv2_followup_events ORDER BY created_at DESC LIMIT 3000').all()).results;
  await db.prepare('CREATE TABLE IF NOT EXISTS dv2_annie_sent (phone TEXT PRIMARY KEY, sent_at TEXT DEFAULT CURRENT_TIMESTAMP)').run();const annie=(await db.prepare('SELECT phone FROM dv2_annie_sent').all()).results;const updates=(await db.prepare("SELECT * FROM dv2_followup_events WHERE kind='actualizacion'").all()).results;return J({rows,events,annie,updates});
 }
 const match=p.match(/^\/api\/seguimiento\/([a-f0-9-]+)$/);
 if(match&&m==='PUT'){
  let d;try{d=await req.json()}catch{return E('JSON inválido')}
  if(!d||typeof d!=='object')return E('Datos inválidos');
  for(const k of keys)if(typeof d[k]!=='string'||d[k].length>100)return E('Campo inválido: '+k);
  if(!['preventive_date','next_date','treatment_review_date','appointment_date'].every(k=>date(d[k]))||!time(d.appointment_time)||d.birthday_coupon.length>80)return E('Fecha, hora o cupón inválido');
  for(const k of ['clinical_permission','billing_permission','promo_permission'])if(!statuses.includes(d[k]))return E('Permiso inválido: '+k);
  if(typeof d.first_contact_enabled!=='boolean'||typeof d.permission_method!=='string'||d.permission_method.length>60||typeof d.permission_evidence!=='string'||d.permission_evidence.length>500)return E('Datos de consentimiento inválidos');
  const id=match[1];if(!await db.prepare('SELECT id FROM dv2_patients WHERE id=?').bind(id).first())return E('Paciente inexistente',404);
  const old=await db.prepare('SELECT * FROM dv2_followup WHERE patient_id=?').bind(id).first();
  const changed=!old||['clinical_permission','billing_permission','promo_permission','permission_method','permission_evidence'].some(k=>String(old[k]||'')!==String(d[k]));
  const at=changed?new Date().toISOString():old.permission_updated_at;
  const consent=d.clinical_permission==='yes'?1:0;
  const consentAt=consent?(old?.clinical_permission==='yes'?old.consent_at:new Date().toISOString()):null;
  await db.prepare(`INSERT INTO dv2_followup(patient_id,consent,consent_at,preventive_date,next_date,treatment_review_date,appointment_date,appointment_time,birthday_coupon,clinical_permission,billing_permission,promo_permission,permission_method,permission_evidence,permission_updated_at,first_contact_enabled)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(patient_id) DO UPDATE SET consent=excluded.consent,consent_at=excluded.consent_at,preventive_date=excluded.preventive_date,next_date=excluded.next_date,treatment_review_date=excluded.treatment_review_date,appointment_date=excluded.appointment_date,appointment_time=excluded.appointment_time,birthday_coupon=excluded.birthday_coupon,clinical_permission=excluded.clinical_permission,billing_permission=excluded.billing_permission,promo_permission=excluded.promo_permission,permission_method=excluded.permission_method,permission_evidence=excluded.permission_evidence,permission_updated_at=excluded.permission_updated_at,first_contact_enabled=excluded.first_contact_enabled,updated_at=CURRENT_TIMESTAMP`)
  .bind(id,consent,consentAt,...keys.map(k=>d[k]),d.clinical_permission,d.billing_permission,d.promo_permission,d.permission_method,d.permission_evidence,at,d.first_contact_enabled?1:0).run();return J({ok:true});
 }
 if(p==='/api/seguimiento/evento'&&m==='POST'){
  let d;try{d=await req.json()}catch{return E('JSON inválido')}
  if(!d||!/^[-a-f0-9]{36}$/.test(d.patient_id||'')||typeof d.event_key!=='string'||d.event_key.length>130||!['cumple','preventivo','tratamiento','cita','cobro','primer_contacto','actualizacion'].includes(d.kind)||!['abierto','enviado','omitido'].includes(d.status)||typeof d.message!=='string'||!d.message.trim()||d.message.length>2500)return E('Evento inválido');
  const c=await db.prepare('SELECT * FROM dv2_followup WHERE patient_id=?').bind(d.patient_id).first();if(!c)return E('Paciente sin configuración',403);
  if(d.kind==='primer_contacto'){
   if(!c.first_contact_enabled||c.first_contact_done||c.clinical_permission!=='pending'||c.billing_permission!=='pending'||c.promo_permission!=='pending')return E('Primer contacto no habilitado o ya realizado',403);
  }else if(d.kind==='cumple'){
   if(c.promo_permission!=='yes')return E('Falta autorización promocional',403);
  }else if(d.kind==='cobro'){
   if(c.billing_permission!=='yes')return E('Falta autorización para avisos de cobro',403);
  }else if(c.clinical_permission!=='yes')return E('Falta autorización para recordatorios clínicos',403);
  const old=await db.prepare('SELECT status FROM dv2_followup_events WHERE patient_id=? AND event_key=?').bind(d.patient_id,d.event_key).first();
  if(old?.status==='enviado'&&d.status!=='enviado')return E('Mensaje ya marcado enviado');
  await db.prepare(`INSERT INTO dv2_followup_events(id,patient_id,event_key,kind,status,message) VALUES(?,?,?,?,?,?) ON CONFLICT(patient_id,event_key) DO UPDATE SET status=excluded.status,message=excluded.message,updated_at=CURRENT_TIMESTAMP`).bind(crypto.randomUUID(),d.patient_id,d.event_key,d.kind,d.status,d.message).run();
  if(d.kind==='primer_contacto'&&d.status==='enviado')await db.prepare('UPDATE dv2_followup SET first_contact_done=1,first_contact_enabled=0,updated_at=CURRENT_TIMESTAMP WHERE patient_id=?').bind(d.patient_id).run();
  return J({ok:true});
 }
 return E('Ruta no disponible',404);
}
