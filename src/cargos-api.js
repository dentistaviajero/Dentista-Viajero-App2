/* Registrar eliminación administrativa de cargos erróneos; conectar tras validar sesión. */
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function cargosAPI(req,env){
 const u=new URL(req.url),m=req.method,match=u.pathname.match(/^\/api\/cargos\/([a-f0-9-]+)$/);
 if(!match||m!=='DELETE')return null;
 const db=env.DB,id=match[1];let d;try{d=await req.json()}catch{return json({error:'Solicitud inválida'},400)}
 if(typeof d?.motivo!=='string'||d.motivo.trim().length<5||d.motivo.length>250)return json({error:'Indica el motivo (mínimo 5 caracteres)'},400);
 const q=await db.prepare('SELECT * FROM dv2_quotes WHERE id=?').bind(id).first();if(!q)return json({error:'Cargo no encontrado'},404);
 const paid=(await db.prepare('SELECT COALESCE(SUM(amount_cents),0) total FROM dv2_payments WHERE patient_id=?').bind(q.patient_id).first()).total;
 const total=(await db.prepare("SELECT COALESCE(SUM(amount_cents),0) total FROM dv2_quotes WHERE patient_id=? AND status!='cancelado'").bind(q.patient_id).first()).total;
 if(q.status!=='cancelado'&&paid>total-q.amount_cents)return json({error:'Revisa primero los pagos: el cargo podría estar cubierto'},409);
 await db.batch([
  db.prepare('INSERT INTO dv2_audit(id,entity,entity_id,action) VALUES(?,?,?,?)').bind(crypto.randomUUID(),'quote',id,'eliminado:'+d.motivo.trim()),
  db.prepare('DELETE FROM dv2_quotes WHERE id=?').bind(id)
 ]);
 return json({ok:true});
}
