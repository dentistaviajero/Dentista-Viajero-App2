import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
const err=(msg,status=400)=>json({error:msg},status);
const uuid=()=>crypto.randomUUID();
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const fromB64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const hash=async s=>b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
const randomToken=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
const secureHeaders={'x-frame-options':'DENY','referrer-policy':'no-referrer','permissions-policy':'camera=(), microphone=(), geolocation=()','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
async function body(req){const s=await req.text();if(s.length>1024*1024)throw Error('Solicitud demasiado grande');return s?JSON.parse(s):{};}
async function user(req,db){const cookie=req.headers.get('cookie')||'';const token=cookie.match(/(?:^|;\s*)dv_session=([^;]+)/)?.[1];if(!token)return null;const row=await db.prepare('SELECT u.id,u.nombre,u.rol FROM app_sessions s JOIN app_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expira_en>? AND u.activo=1').bind(await hash(token),Date.now()).first();return row||null;}
async function session(db,userId){const token=randomToken();await db.prepare('INSERT INTO app_sessions(token_hash,user_id,expira_en) VALUES(?,?,?)').bind(await hash(token),userId,Date.now()+7*86400000).run();return `dv_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;}
async function audit(db,u,action,entity,id){await db.prepare('INSERT INTO audit_events(id,actor_id,accion,entidad,entidad_id) VALUES(?,?,?,?,?)').bind(uuid(),u?.id||null,action,entity||null,id||null).run();}
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
 if(p==='/api/me'&&m==='GET'){const u=await user(req,db);return json({user:u});}
 if(p.startsWith('/api/auth/')&&p!=='/api/auth/logout'&&m==='POST'&&!await throttle(req,db))return err('Demasiados intentos. Espera 15 minutos.',429);
 if(p==='/api/auth/register/options'&&m==='POST'){
  const data=await body(req);const count=await db.prepare('SELECT COUNT(*) n FROM app_users').first();const u=await user(req,db);
  if(count.n===0){if(!env.BOOTSTRAP_SECRET||!data.secret||await hash(data.secret)!==await hash(env.BOOTSTRAP_SECRET))return err('Clave de instalación incorrecta',403);}
  else if(!u||u.rol!=='dentista')return err('Solo el administrador puede añadir dispositivos',403);
  const userId=u?.id||uuid();const options=await generateRegistrationOptions({rpName:'Dentista Viajero Clínica',rpID:url.hostname,userName:u?.nombre||'Dentista Viajero',userID:new TextEncoder().encode(userId),attestationType:'none',authenticatorSelection:{residentKey:'preferred',userVerification:'required'},timeout:60000});
  const id=await challenge(db,options.challenge,'register',userId);return json({options,challengeId:id});
 }
 if(p==='/api/auth/register/verify'&&m==='POST'){
  const data=await body(req);const c=await consume(db,data.challengeId,'register');if(!c)return err('Solicitud caducada',403);
  const count=await db.prepare('SELECT COUNT(*) n FROM app_users').first();const u=await user(req,db);
  if(count.n===0){if(!env.BOOTSTRAP_SECRET||!data.secret||await hash(data.secret)!==await hash(env.BOOTSTRAP_SECRET))return err('Clave incorrecta',403);}
  else if(!u||u.rol!=='dentista'||u.id!==c.user_id)return err('Sin autorización',403);
  const verification=await verifyRegistrationResponse({response:data.credential,expectedChallenge:c.challenge,expectedOrigin:url.origin,expectedRPID:url.hostname,requireUserVerification:true});
  if(!verification.verified||!verification.registrationInfo)return err('No se pudo verificar la huella',403);
  const cred=verification.registrationInfo.credential;
  if(count.n===0)await db.prepare('INSERT INTO app_users(id,nombre,rol) VALUES(?,?,?)').bind(c.user_id,'Dentista Viajero','dentista').run();
  await db.prepare('INSERT INTO passkeys(id,user_id,public_key,counter,transports,device_type,backed_up) VALUES(?,?,?,?,?,?,?)').bind(cred.id,c.user_id,b64url(cred.publicKey),cred.counter,JSON.stringify(cred.transports||[]),verification.registrationInfo.credentialDeviceType||null,verification.registrationInfo.credentialBackedUp?1:0).run();
  await audit(db,{id:c.user_id},'alta_passkey','passkeys',cred.id);return json({ok:true},200,{'set-cookie':await session(db,c.user_id)});
 }
 if(p==='/api/auth/login/options'&&m==='POST'){
  const keys=await db.prepare('SELECT id,transports FROM passkeys LIMIT 30').all();
  const options=await generateAuthenticationOptions({rpID:url.hostname,userVerification:'required',allowCredentials:keys.results.map(k=>({id:k.id,transports:JSON.parse(k.transports||'[]')}))});
  return json({options,challengeId:await challenge(db,options.challenge,'login',null)});
 }
 if(p==='/api/auth/login/verify'&&m==='POST'){
  const data=await body(req);const c=await consume(db,data.challengeId,'login');if(!c)return err('Solicitud caducada',403);
  const key=await db.prepare('SELECT p.*,u.activo FROM passkeys p JOIN app_users u ON p.user_id=u.id WHERE p.id=?').bind(data.credential?.id||'').first();if(!key||!key.activo)return err('Dispositivo no autorizado',403);
  const result=await verifyAuthenticationResponse({response:data.credential,expectedChallenge:c.challenge,expectedOrigin:url.origin,expectedRPID:url.hostname,credential:{id:key.id,publicKey:fromB64(key.public_key),counter:key.counter,transports:JSON.parse(key.transports||'[]')},requireUserVerification:true});
  if(!result.verified)return err('Acceso no verificado',403);
  await db.prepare('UPDATE passkeys SET counter=?,ultimo_uso=CURRENT_TIMESTAMP WHERE id=?').bind(result.authenticationInfo.newCounter,key.id).run();
  await audit(db,{id:key.user_id},'inicio_sesion');return json({ok:true},200,{'set-cookie':await session(db,key.user_id)});
 }
 const u=await user(req,db);if(!u)return err('Inicia sesión',401);
 if(p==='/api/auth/logout'&&m==='POST'){const token=(req.headers.get('cookie')||'').match(/dv_session=([^;]+)/)?.[1];if(token)await db.prepare('DELETE FROM app_sessions WHERE token_hash=?').bind(await hash(token)).run();return json({ok:true},200,{'set-cookie':'dv_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});}
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
