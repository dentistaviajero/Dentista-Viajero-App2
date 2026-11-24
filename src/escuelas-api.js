// Módulo de campañas escolares. Importar y llamar desde src/index.js DESPUÉS de autenticar la sesión.
const out=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const err=(m,status=400)=>out({error:m},status);
const newid=()=>crypto.randomUUID();
const validId=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x);
const clean=(x,max=180)=>typeof x==='string'?x.trim().slice(0,max):'';
const findings=['SRB','CL','CD','CB','BX','HMI','MS','Otro'];
const integer=(x,max)=>Number.isInteger(Number(x))&&Number(x)>=0&&Number(x)<=max;
async function body(req){try{return await req.json()}catch{return null}}
export async function escuelasAPI(req,env){
 const db=env.DB,u=new URL(req.url),p=u.pathname,m=req.method;
 if(!p.startsWith('/api/escuelas/'))return null;
 const route=p.slice('/api/escuelas/'.length).split('/').filter(Boolean);
 const [kind,id,sub]=route;
 if(kind==='plantel'&&validId(id)&&m==='PATCH'){
 const d=await body(req);if(!d||!clean(d.nombre))return err('Nombre obligatorio');
 await db.prepare('UPDATE dv2_schools SET nombre=?,localidad=? WHERE id=?').bind(clean(d.nombre),clean(d.localidad),id).run();return out({ok:true});
 }
 if(kind==='plantel'&&validId(id)&&m==='DELETE'){
 const count=await db.prepare('SELECT COUNT(*) n FROM dv2_school_students a JOIN dv2_school_groups g ON g.id=a.group_id WHERE g.school_id=?').bind(id).first();
 if(count?.n)return err('La escuela contiene alumnos; no se puede eliminar sin preservar sus evaluaciones.',409);
 await db.batch([db.prepare('DELETE FROM dv2_school_groups WHERE school_id=? AND NOT EXISTS (SELECT 1 FROM dv2_school_students a JOIN dv2_school_groups g ON g.id=a.group_id WHERE g.school_id=?)').bind(id,id),db.prepare('DELETE FROM dv2_schools WHERE id=? AND NOT EXISTS (SELECT 1 FROM dv2_school_groups WHERE school_id=?)').bind(id,id)]);return out({ok:true});
 }
 if(kind==='grupos'&&m==='GET'){
  if(!validId(u.searchParams.get('escuela')))return err('Escuela inválida');
  return out((await db.prepare('SELECT * FROM dv2_school_groups WHERE school_id=? ORDER BY grado,grupo').bind(u.searchParams.get('escuela')).all()).results);
 }
 if(kind==='grupos'&&m==='POST'){
  const d=await body(req);if(!d||!validId(d.school_id)||!clean(d.grado,30))return err('Faltan escuela o grado');
  const school=await db.prepare('SELECT id FROM dv2_schools WHERE id=?').bind(d.school_id).first();if(!school)return err('Escuela no encontrada',404);
  const gid=newid();await db.prepare('INSERT INTO dv2_school_groups(id,school_id,grado,grupo,maestro) VALUES(?,?,?,?,?)').bind(gid,d.school_id,clean(d.grado,30),clean(d.grupo,30),clean(d.maestro)).run();return out({id:gid},201);
 }
 if(kind==='grupos'&&validId(id)&&m==='PATCH'){
  const d=await body(req);if(!d||!clean(d.grado,30))return err('Grado obligatorio');
  await db.prepare('UPDATE dv2_school_groups SET grado=?,grupo=?,maestro=? WHERE id=?').bind(clean(d.grado,30),clean(d.grupo,30),clean(d.maestro),id).run();return out({ok:true});
 }
 if(kind==='grupos'&&validId(id)&&m==='DELETE'){
  const count=await db.prepare('SELECT COUNT(*) n FROM dv2_school_students WHERE group_id=?').bind(id).first();if(count?.n)return err('El grupo contiene alumnos. Muévelos o elimínalos antes.',409);
  await db.prepare('DELETE FROM dv2_school_groups WHERE id=?').bind(id).run();return out({ok:true});
 }
 if(kind==='alumnos'&&m==='GET'){
  if(!validId(u.searchParams.get('grupo')))return err('Grupo inválido');
  return out((await db.prepare('SELECT * FROM dv2_school_students WHERE group_id=? ORDER BY nombre COLLATE NOCASE').bind(u.searchParams.get('grupo')).all()).results);
 }
 if(kind==='alumnos'&&(m==='POST'||(m==='PATCH'&&validId(id)))){
  const d=await body(req);if(!d||!clean(d.nombre)||!integer(d.edad,25)||!integer(d.caries,32)||!['Femenino','Masculino','No especificado'].includes(d.sexo)||!Array.isArray(d.hallazgos)||!d.hallazgos.every(x=>findings.includes(x)))return err('Datos del alumno inválidos');
  const unique=[...new Set(d.hallazgos)];const values=[clean(d.nombre),Number(d.edad),d.sexo,Number(d.caries),JSON.stringify(unique),clean(d.otro,400)];
  if(m==='POST'){
   if(!validId(d.group_id))return err('Grupo inválido');const group=await db.prepare('SELECT id FROM dv2_school_groups WHERE id=?').bind(d.group_id).first();if(!group)return err('Grupo no encontrado',404);
   const sid=newid();await db.prepare('INSERT INTO dv2_school_students(id,group_id,nombre,edad,sexo,caries,hallazgos,otro) VALUES(?,?,?,?,?,?,?,?)').bind(sid,d.group_id,...values).run();return out({id:sid},201);
  }
  await db.prepare('UPDATE dv2_school_students SET nombre=?,edad=?,sexo=?,caries=?,hallazgos=?,otro=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(...values,id).run();return out({ok:true});
 }
 if(kind==='alumnos'&&validId(id)&&m==='DELETE'){
  await db.prepare('DELETE FROM dv2_school_students WHERE id=?').bind(id).run();return out({ok:true});
 }
 if(kind==='alumnos'&&validId(id)&&sub==='vincular'&&m==='POST'){
  const d=await body(req);if(!d||!validId(d.patient_id))return err('Expediente inválido');
  const patient=await db.prepare('SELECT id FROM dv2_patients WHERE id=?').bind(d.patient_id).first();if(!patient)return err('Expediente no encontrado',404);
  await db.prepare('UPDATE dv2_school_students SET patient_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(d.patient_id,id).run();return out({ok:true});
 }
 if(kind==='resumen'&&m==='GET'){
  if(!validId(u.searchParams.get('escuela')))return err('Escuela inválida');
  const rows=(await db.prepare(`SELECT a.*,g.grado,g.grupo,g.maestro FROM dv2_school_students a JOIN dv2_school_groups g ON g.id=a.group_id WHERE g.school_id=? ORDER BY g.grado,g.grupo,a.nombre COLLATE NOCASE`).bind(u.searchParams.get('escuela')).all()).results;
  const total=rows.length,conCaries=rows.filter(x=>x.caries>0).length,dientes=rows.reduce((n,x)=>n+Number(x.caries||0),0);
  const hallazgos=Object.fromEntries(findings.map(f=>[f,rows.filter(x=>{try{return JSON.parse(x.hallazgos||'[]').includes(f)}catch{return false}}).length]));
  return out({total,conCaries,sinCaries:total-conCaries,dientes,hallazgos,porcentajeCaries:total?Math.round(conCaries*10000/total)/100:0,filas:rows});
 }
 return err('Ruta escolar desconocida',404);
}
