const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
const err=(msg,status=400)=>json({error:msg},status);
const uuid=()=>crypto.randomUUID();
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const fromB64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const hash=async s=>b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
const randomToken=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
const secureHeaders={'x-frame-options':'DENY','referrer-policy':'no-referrer','permissions-policy':'camera=(), microphone=(), geolocation=()','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
async function body(req){const s=await req.text();if(s.length>1024*1024)throw Error('Solicitud demasiado grande');return s?JSON.parse(s):{};}
const ALLOWED_EMAILS=new Set(['dentistaviajero@gmail.com','parteraviajera@gmail.com']);
let accessKeySet=null,accessKeyUrl='';
async function user(req,env){
 return {id:'consultorio',nombre:'Consultorio',rol:'dentista',email:''};
}

async function audit(db,u,action,entity,id){return; /* La bitácora se habilita con las migraciones */}
function sameOrigin(req){const origin=req.headers.get('origin');return origin===new URL(req.url).origin;}
async function throttle(req,db){const ip=req.headers.get('cf-connecting-ip')||'unknown';const key=await hash(ip);const now=Date.now();const row=await db.prepare('SELECT attempts,window_start FROM auth_attempts WHERE actor_hash=?').bind(key).first();if(row&&now-row.window_start<900000&&row.attempts>=12)return false;if(!row||now-row.window_start>=900000)await db.prepare('INSERT INTO auth_attempts(actor_hash,attempts,window_start) VALUES(?,1,?) ON CONFLICT(actor_hash) DO UPDATE SET attempts=1,window_start=excluded.window_start').bind(key,now).run();else await db.prepare('UPDATE auth_attempts SET attempts=attempts+1 WHERE actor_hash=?').bind(key).run();return true;}
async function challenge(db,value,type,userId){const id=uuid();await db.prepare('INSERT INTO auth_challenges(id,challenge,tipo,user_id,expira_en) VALUES(?,?,?,?,?)').bind(id,value,type,userId||null,Date.now()+300000).run();return id;}
async function consume(db,id,type){const row=await db.prepare('SELECT * FROM auth_challenges WHERE id=? AND tipo=? AND expira_en>?').bind(id,type,Date.now()).first();if(row)await db.prepare('DELETE FROM auth_challenges WHERE id=?').bind(id).run();return row;}
const specs={
 pacientes:{fields:['folio','nombre','fecha_nacimiento','telefono','correo','tutor_nombre','tutor_parentesco','ciudad','colonia'],required:['folio','nombre'],patient:false},
 consultas:{fields:['paciente_id','fecha','motivo','exploracion','diagnostico','tratamiento','observaciones','proxima_revision'],required:['paciente_id'],patient:true},
 historias_clinicas:{fields:['paciente_id','alergias','enfermedades','medicamentos','antecedentes_importantes','reaccion_anestesia','contacto_emergencia','telefono_emergencia','patologias','habitos_orales','habitos_generales','higiene_oral','observaciones'],required:['paciente_id'],patient:true},
 odontograma_hallazgos:{fields:['paciente_id','consulta_id','diente','superficie','codigo','observaciones','activo'],required:['paciente_id','diente','superficie','codigo'],patient:true},
 escuelas:{fields:['nombre','clave','localidad'],required:['nombre']},
 tamizajes_escolares:{fields:['escuela_id','paciente_id','fecha','grado','grupo','caries','respiracion_bucal','bruxismo','observaciones'],required:['escuela_id']},
 pagos:{fields:['paciente_id','consulta_id','concepto','monto_centavos','fecha','notas'],required:['paciente_id','concepto','monto_centavos'],patient:true}
};
function checkData(data,spec){const out={};for(const k of spec.fields){if(data[k]!==undefined){const v=data[k];if(v!==null&&typeof v!=='string'&&typeof v!=='number')throw Error(`Campo inválido: ${k}`);if(typeof v==='string'&&v.length>12000)throw Error(`Campo demasiado largo: ${k}`);out[k]=v;}}for(const k of spec.required){if(out[k]===undefined||out[k]===null||out[k]==='')throw Error(`Falta ${k}`);}return out;}
async function api(req,env){const db=env.DB;const url=new URL(req.url),p=url.pathname,m=req.method;
 if(!db)return err('Falta el enlace DB',503);
 if(m!=='GET'&&!sameOrigin(req))return err('Origen no autorizado',403);
 const u=await user(req,env);
 
 if(p==='/api/me'&&m==='GET')return json({user:u});
 if(p==='/api/auth/logout'&&m==='POST')return json({ok:true});
 if(p==='/api/backup'&&m==='GET'){
  const tables=['pacientes','consultas','historias_clinicas','odontograma_hallazgos','escuelas','tamizajes_escolares','pagos'];const out={formato:'dv-clinica-backup',version:1,creado_en:new Date().toISOString(),tablas:{}};
  for(const t of tables){const r=await db.prepare(`SELECT * FROM ${t} LIMIT 10000`).all();out.tablas[t]=r.results;if(r.results.length===10000)return err('Respaldo supera el límite de filas; requiere exportación por lotes',409);}
  await audit(db,u,'exportar_respaldo');return json(out,200,{'content-disposition':`attachment; filename="dv-clinica-${new Date().toISOString().slice(0,10)}.json"`});
 }
 if(p==='/api/backup/import'&&m==='POST'){
  const data=await body(req);if(data.formato!=='dv-clinica-backup'||data.version!==1||!data.tablas)return err('Formato de respaldo inválido');
  const names=['pacientes','consultas','historias_clinicas','odontograma_hallazgos','escuelas','tamizajes_escolares','pagos'];
  const existing=await db.prepare('SELECT COUNT(*) n FROM pacientes').first();if(existing.n>0)return err('Por seguridad, la restauración solo se permite en una base sin pacientes. Solicita una restauración asistida.',409);
  const stmts=[];let count=0;
  for(const t of names){const rows=data.tablas[t]||[];if(!Array.isArray(rows)||rows.length>2000)return err('Cantidad de registros inválida');for(const r of rows){if(!r||typeof r!=='object'||!r.id||typeof r.id!=='string')return err('Registro inválido');const cols=['id',...specs[t].fields.filter(k=>r[k]!==undefined)];if(t==='odontograma_hallazgos')for(const k of ['creado_en','actualizado_en'])if(r[k]!==undefined)cols.push(k);if(t==='pacientes')for(const k of ['fecha_registro','actualizado_en'])if(r[k]!==undefined)cols.push(k);if(t==='historias_clinicas'&&r.actualizado_en!==undefined)cols.push('actualizado_en');if(t==='escuelas'&&r.creado_en!==undefined)cols.push('creado_en');if(t==='pagos'&&r.fecha!==undefined&&!cols.includes('fecha'))cols.push('fecha');
    stmts.push(db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).bind(...cols.map(k=>r[k])));count++;}}
  if(count>5000)return err('Respaldo demasiado grande para esta operación');if(stmts.length)await db.batch(stmts);await audit(db,u,'restaurar_respaldo');return json({ok:true,registros:count});
 }
 if(p==='/api/export/csv'&&m==='GET'){
  const table=url.searchParams.get('tabla');if(!['pacientes','escuelas','tamizajes_escolares','pagos'].includes(table))return err('Tabla no permitida');const rows=(await db.prepare(`SELECT * FROM ${table} LIMIT 5000`).all()).results;const keys=rows.length?Object.keys(rows[0]):specs[table].fields;const cell=v=>'"'+String(v??'').replace(/^[=+@\-]/,m=>"'"+m).replace(/"/g,'""')+'"';const csv='\uFEFF'+[keys.join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');await audit(db,u,'exportar_csv',table);return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="${table}.csv"`,'cache-control':'no-store'}});
 }
 const match=p.match(/^\/api\/(pacientes|consultas|historias_clinicas|odontograma_hallazgos|escuelas|tamizajes_escolares|pagos)(?:\/([a-zA-Z0-9-]+))?$/);
 if(match){const table=match[1],id=match[2],spec=specs[table];
  if(m==='GET'){
   if(id){const row=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();return row?json(row):err('No encontrado',404);}
   const patient=url.searchParams.get('paciente_id'),school=url.searchParams.get('escuela_id');let sql=`SELECT * FROM ${table}`,param=[];
   if(patient&&spec.fields.includes('paciente_id')){sql+=' WHERE paciente_id=?';param=[patient];}else if(school&&spec.fields.includes('escuela_id')){sql+=' WHERE escuela_id=?';param=[school];}
   sql+=' ORDER BY rowid DESC LIMIT 300';const rows=await db.prepare(sql).bind(...param).all();return json(rows.results);
  }
  if(m==='POST'&&!id){const data=checkData(await body(req),spec);const newId=uuid(),cols=['id',...Object.keys(data)];await db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).bind(newId,...Object.values(data)).run();await audit(db,u,'crear',table,newId);return json({id:newId},201);}
  if(m==='PATCH'&&id){const raw=await body(req);const data={};for(const k of spec.fields){if(raw[k]!==undefined){if(raw[k]!==null&&typeof raw[k]!=='string'&&typeof raw[k]!=='number')return err('Dato inválido');data[k]=raw[k];}}if(!Object.keys(data).length)return err('Sin cambios');await db.prepare(`UPDATE ${table} SET ${Object.keys(data).map(k=>`${k}=?`).join(',')} WHERE id=?`).bind(...Object.values(data),id).run();await audit(db,u,'editar',table,id);return json({ok:true});}
  if(m==='DELETE'&&id&&table==='odontograma_hallazgos'){await db.prepare('UPDATE odontograma_hallazgos SET activo=0,actualizado_en=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();await audit(db,u,'desactivar',table,id);return json({ok:true});}
 }
 return err('Ruta no encontrada',404);
}
export default {async fetch(req,env){const url=new URL(req.url);try{if(url.pathname.startsWith('/api/')){const response=await api(req,env);const h=new Headers(response.headers);for(const [k,v] of Object.entries(secureHeaders))h.set(k,v);return new Response(response.body,{status:response.status,headers:h});}const r=await env.ASSETS.fetch(req);const h=new Headers(r.headers);for(const [k,v] of Object.entries(secureHeaders))h.set(k,v);h.set('cache-control','no-store');return new Response(r.body,{status:r.status,headers:h});}catch(e){console.error('Error interno:',e?.name||'Error');return err('No se pudo completar la operación',500);}}};
