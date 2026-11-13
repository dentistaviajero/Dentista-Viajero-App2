-- Tablas v2 independientes: no se eliminan ni alteran los datos anteriores.
CREATE TABLE IF NOT EXISTS dv2_counter (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT OR IGNORE INTO dv2_counter(name,value) VALUES('patient',0);
CREATE TABLE IF NOT EXISTS dv2_patients (id TEXT PRIMARY KEY, folio INTEGER UNIQUE NOT NULL, nombre TEXT NOT NULL, fecha_nacimiento TEXT, tutor_nombre TEXT, tutor_parentesco TEXT, telefono TEXT, correo TEXT, ciudad TEXT, colonia TEXT, medico TEXT, origen TEXT, origen_otro TEXT, escuela_campana TEXT, estado TEXT NOT NULL DEFAULT 'en_tratamiento', archivado INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS dv2_patients_name ON dv2_patients(nombre);
CREATE TABLE IF NOT EXISTS dv2_histories (patient_id TEXT PRIMARY KEY REFERENCES dv2_patients(id), data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS dv2_marks (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES dv2_patients(id), tooth TEXT NOT NULL, surface TEXT NOT NULL, code TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS dv2_marks_patient ON dv2_marks(patient_id);
CREATE TABLE IF NOT EXISTS dv2_tooth_notes (patient_id TEXT NOT NULL REFERENCES dv2_patients(id), tooth TEXT NOT NULL, symbols TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '', PRIMARY KEY(patient_id,tooth));
CREATE TABLE IF NOT EXISTS dv2_visits (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES dv2_patients(id), data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS dv2_visits_patient ON dv2_visits(patient_id);
CREATE TABLE IF NOT EXISTS dv2_quotes (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES dv2_patients(id), tooth TEXT, procedure TEXT NOT NULL, amount_cents INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pendiente', source TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS dv2_quotes_patient ON dv2_quotes(patient_id);
CREATE TABLE IF NOT EXISTS dv2_payments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES dv2_patients(id), amount_cents INTEGER NOT NULL, concept TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS dv2_schools (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, clave TEXT, localidad TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS dv2_audit (id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT, action TEXT NOT NULL, at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
