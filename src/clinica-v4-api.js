/* API complementaria. Llamar solo tras validar sesión. */
const J=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const E=(error,status=400)=>J({error},status);
const validId=s=>typeof s==='string'&&/^[a-f0-9-]{36}$/i.test(s);
const areas=['ortopedia','operatoria','prevencion','campana'];
export async function clinicaV4API(req,env){
 const u=new URL(req.url),p=u.pathname,m=req.method,db=env.DB;
 if(!p.startsWith('/api/clinica-v4/'))return null;
 const route=p.slice('/api/clinica-v4/'.length).split('/');
 const [kind,id]=route;
 if(kind==='cargo'&&validId(id)&&m==='DELETE'){
  let d;try{d=await req.json()}catch{return E('Solicitud inválida')}
  if(typeof d?.motivo!=='string'||d.motivo.trim().length<5||d.motivo.length>250)return E('Explica el error (5 a 250 caracteres)');
  const q=await db.prepare('SELECT * FROM dv2_quotes WHERE id=?').bind(id).first();if(!q)return E('Cargo no encontrado',404);
  const total=(await db.prepare("SELECT COALESCE(SUM(amount_cents),0) n FROM dv2_quotes WHERE patient_id=? AND status!='cancelado'").bind(q.patient_id).first()).n;
  const paid=(await db.prepare('SELECT COALESCE(SUM(amount_cents),0) n FROM dv2_payments WHERE patient_id=?').bind(q.patient_id).first()).n;
  if(q.status!=='cancelado'&&paid>total-q.amount_cents)return E('Revisa abonos: eliminar este cargo dejaría pagos superiores al total activo',409);
  await db.batch([
   db.prepare('INSERT INTO dv2_deleted_quotes(id,patient_id,tooth,procedure,amount_cents,status,source,reason,deleted_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind(q.id,q.patient_id,q.tooth,q.procedure,q.amount_cents,q.status,q.source,d.motivo.trim()),
   db.prepare('DELETE FROM dv2_quote_categories WHERE quote_id=?').bind(id),
   db.prepare('DELETE FROM dv2_quotes WHERE id=?').bind(id),
   db.prepare('INSERT INTO dv2_audit(id,entity,entity_id,action) VALUES(?,?,?,?)').bind(crypto.randomUUID(),'quote',id,'delete_error')
  ]);
  return J({ok:true});
 }
 if(kind==='categoria'&&validId(id)&&m==='PUT'){
  let d;try{d=await req.json()}catch{return E('JSON inválido')}
  if(!areas.includes(d?.category))return E('Área inválida');
  const type=d?.type==='payment'?'payment':d?.type==='quote'?'quote':null;if(!type)return E('Tipo inválido');
  const table=type==='payment'?'dv2_payments':'dv2_quotes',cat=type==='payment'?'dv2_payment_categories':'dv2_quote_categories',key=type==='payment'?'payment_id':'quote_id';
  const found=await db.prepare(`SELECT id FROM ${table} WHERE id=?`).bind(id).first();if(!found)return E('Movimiento inexistente',404);
  await db.prepare(`INSERT INTO ${cat}(${key},category) VALUES(?,?) ON CONFLICT(${key}) DO UPDATE SET category=excluded.category`).bind(id,d.category).run();return J({ok:true});
 }
 if(kind==='escuela'&&validId(id)&&m==='GET'){
  const school=await db.prepare('SELECT id,nombre FROM dv2_schools WHERE id=?').bind(id).first();if(!school)return E('Escuela no encontrada',404);
  const prices=await db.prepare('SELECT * FROM dv2_campaign_prices WHERE school_id=?').bind(id).first();
  const students=(await db.prepare('SELECT s.*,g.grado,g.grupo FROM dv2_school_students s JOIN dv2_school_groups g ON s.group_id=g.id WHERE g.school_id=? ORDER BY g.grado,g.grupo,s.nombre').bind(id).all()).results;
  const ids=students.map(x=>x.id);const statuses=ids.length?(await db.prepare('SELECT * FROM dv2_campaign_students WHERE student_id IN ('+ids.map(()=>'?').join(',')+')').bind(...ids).all()).results:[];
  return J({school,prices:prices||{caries_cents:25000,preventive_cents:25000},students:students.map(x=>({...x,campaign_status:statuses.find(y=>y.student_id===x.id)?.status||'cotizado'}))});
 }
 if(kind==='escuela'&&validId(id)&&m==='PUT'){
  let d;try{d=await req.json()}catch{return E('JSON inválido')}
  if(!Number.isSafeInteger(d?.caries_cents)||d.caries_cents<0||d.caries_cents>2000000||!Number.isSafeInteger(d?.preventive_cents)||d.preventive_cents<0||d.preventive_cents>2000000)return E('Precios inválidos');
  const exists=await db.prepare('SELECT id FROM dv2_schools WHERE id=?').bind(id).first();if(!exists)return E('Escuela no encontrada',404);
  await db.prepare('INSERT INTO dv2_campaign_prices(school_id,caries_cents,preventive_cents) VALUES(?,?,?) ON CONFLICT(school_id) DO UPDATE SET caries_cents=excluded.caries_cents,preventive_cents=excluded.preventive_cents').bind(id,d.caries_cents,d.preventive_cents).run();return J({ok:true});
 }
 if(kind==='alumno'&&validId(id)&&m==='PUT'){
  let d;try{d=await req.json()}catch{return E('JSON inválido')}
  if(!['cotizado','autorizado','realizado','cobrado','atencion_externa','no_acepta'].includes(d?.status))return E('Estado inválido');
  const found=await db.prepare('SELECT id FROM dv2_school_students WHERE id=?').bind(id).first();if(!found)return E('Alumno no encontrado',404);
  await db.prepare('INSERT INTO dv2_campaign_students(student_id,status) VALUES(?,?) ON CONFLICT(student_id) DO UPDATE SET status=excluded.status,updated_at=CURRENT_TIMESTAMP').bind(id,d.status).run();return J({ok:true});
 }
 return E('Ruta no encontrada',404);
}
