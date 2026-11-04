-- No elimina ni modifica las cuatro tablas creadas en Cloudflare.
CREATE TABLE IF NOT EXISTS app_users (
 id TEXT PRIMARY KEY, nombre TEXT NOT NULL, rol TEXT NOT NULL DEFAULT 'dentista',
 activo INTEGER NOT NULL DEFAULT 1, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS passkeys (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, public_key TEXT NOT NULL,
 counter INTEGER NOT NULL DEFAULT 0, transports TEXT, device_type TEXT, backed_up INTEGER NOT NULL DEFAULT 0,
 creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, ultimo_uso TEXT,
 FOREIGN KEY(user_id) REFERENCES app_users(id)
);
CREATE TABLE IF NOT EXISTS auth_challenges (
 id TEXT PRIMARY KEY, challenge TEXT NOT NULL, tipo TEXT NOT NULL,
 user_id TEXT, expira_en INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS app_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expira_en INTEGER NOT NULL,
 creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES app_users(id)
);
CREATE TABLE IF NOT EXISTS audit_events (
 id TEXT PRIMARY KEY, actor_id TEXT, accion TEXT NOT NULL,
 entidad TEXT, entidad_id TEXT, fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS escuelas (
 id TEXT PRIMARY KEY, nombre TEXT NOT NULL, clave TEXT, localidad TEXT,
 creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tamizajes_escolares (
 id TEXT PRIMARY KEY, escuela_id TEXT NOT NULL, paciente_id TEXT,
 fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, grado TEXT, grupo TEXT,
 caries INTEGER, respiracion_bucal INTEGER, bruxismo INTEGER, observaciones TEXT,
 FOREIGN KEY(escuela_id) REFERENCES escuelas(id), FOREIGN KEY(paciente_id) REFERENCES pacientes(id)
);
CREATE TABLE IF NOT EXISTS pagos (
 id TEXT PRIMARY KEY, paciente_id TEXT NOT NULL, consulta_id TEXT,
 concepto TEXT NOT NULL, monto_centavos INTEGER NOT NULL,
 fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, notas TEXT,
 FOREIGN KEY(paciente_id) REFERENCES pacientes(id), FOREIGN KEY(consulta_id) REFERENCES consultas(id)
);
CREATE TABLE IF NOT EXISTS documentos (
 id TEXT PRIMARY KEY, paciente_id TEXT NOT NULL, tipo TEXT NOT NULL,
 nombre TEXT NOT NULL, referencia_privada TEXT, fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(paciente_id) REFERENCES pacientes(id)
);
CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas(paciente_id,fecha);
CREATE INDEX IF NOT EXISTS idx_odontograma_paciente ON odontograma_hallazgos(paciente_id,activo);
CREATE INDEX IF NOT EXISTS idx_tamizajes_escuela ON tamizajes_escolares(escuela_id);
CREATE INDEX IF NOT EXISTS idx_pagos_paciente ON pagos(paciente_id);
CREATE TABLE IF NOT EXISTS auth_attempts (
 actor_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_start INTEGER NOT NULL
);
