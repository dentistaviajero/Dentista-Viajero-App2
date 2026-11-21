/* Rutas protegidas: invocar SOLO después de validar dv_session en src/index.js */
const J=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const E=(m,s=400)=>J({error:m},s);
const date=v=>v===''||v===null||/^\d{4}-\d{2}-\d{2}$/.test(v);
const time=v=>v===''||v===null||/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const keys=['preventive_date','next_date','treatment_review_date','appointment_date','appointment_time','birthday_coupon'];
export async function seguimientoAPI(req,env){
 const u=new URL(req.url),p=u.pathname,m=req.method;
 if(!p.startsWith('/api/seguimiento'))return null;
 const db=env.DB;
 if(p==='/api/seguimiento'&&m==='GET'){
  const rows=(await db.prepare('SELECT * FROM dv2_followup').all()).results;
  const events=(await db.prepare('SELECT * FROM dv2_followup_events ORDER BY created_at DESC LIMIT 3000').all()).results;
  return J({rows,events});
 }
 const match=p.match(/^\/api\/seguimiento\/([a-f0-9-]+)$/);
 if(match&&m==='PUT'){
  let d;try{d=await req.json()}catch{return E('JSON inválido')}
  if(!d||typeof d!=='object'||typeof d.consent!=='boolean')return E('Autorización inválida');
  for(const k of keys)if(typeof d[k]!=='string'||d[k].length>100)return E('Campo inválido: '+k);
  if(!['preventive_date','next_date','treatment_review_date','appointment_date'].every(k=>date(d[k]))||!time(d.appointment_time))return E('Fecha u hora inválida');
  if(d.birthday_coupon.length>80)return E('Cupón demasiado largo');
  const id=match[1];if(!await db.prepare('SELECT id FROM dv2_patients WHERE id=?').bind(id).first())return E('Paciente inexistente',404);
  const old=await db.prepare('SELECT consent,consent_at FROM dv2_followup WHERE patient_id=?').bind(id).first();
  const consentAt=d.consent?(old?.consent?old.consent_at:new Date().toISOString()):null;
  await db.prepare(`INSERT INTO dv2_followup(patient_id,consent,consent_at,preventive_date,next_date,treatment_review_date,appointment_date,appointment_time,birthday_coupon)
  VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(patient_id) DO UPDATE SET consent=excluded.consent,consent_at=excluded.consent_at,preventive_date=excluded.preventive_date,next_date=excluded.next_date,treatment_review_date=excluded.treatment_review_date,appointment_date=excluded.appointment_date,appointment_time=excluded.appointment_time,birthday_coupon=excluded.birthday_coupon,updated_at=CURRENT_TIMESTAMP`)
  .bind(id,d.consent?1:0,consentAt,...keys.map(k=>d[k])).run();return J({ok:true});
 }
 if(p==='/api/seguimiento/evento'&&m==='POST'){
  let d;try{d=await req.json()}catch{return E('JSON inválido')}
  if(!d||!/^[-a-f0-9]{36}$/.test(d.patient_id||'')||typeof d.event_key!=='string'||d.event_key.length>130||!['cumple','preventivo','tratamiento','cita'].includes(d.kind)||!['abierto','enviado','omitido'].includes(d.status)||typeof d.message!=='string'||d.message.length>2500)return E('Evento inválido');
  const consent=await db.prepare('SELECT consent FROM dv2_followup WHERE patient_id=?').bind(d.patient_id).first();if(!consent?.consent)return E('Falta consentimiento',403);
  const existing=await db.prepare('SELECT status FROM dv2_followup_events WHERE patient_id=? AND event_key=?').bind(d.patient_id,d.event_key).first();
  if(existing?.status==='enviado'&&d.status!=='enviado')return E('Mensaje ya marcado como enviado');
  await db.prepare(`INSERT INTO dv2_followup_events(id,patient_id,event_key,kind,status,message) VALUES(?,?,?,?,?,?) ON CONFLICT(patient_id,event_key) DO UPDATE SET status=excluded.status,message=excluded.message,updated_at=CURRENT_TIMESTAMP`)
  .bind(crypto.randomUUID(),d.patient_id,d.event_key,d.kind,d.status,d.message).run();return J({ok:true});
 }
 return E('Ruta no disponible',404);
}
