CREATE TABLE IF NOT EXISTS dv2_followup (
 patient_id TEXT PRIMARY KEY REFERENCES dv2_patients(id) ON DELETE CASCADE,
 consent INTEGER NOT NULL DEFAULT 0,
 consent_at TEXT,
 preventive_date TEXT,
 next_date TEXT,
 treatment_review_date TEXT,
 appointment_date TEXT,
 appointment_time TEXT,
 birthday_coupon TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS dv2_followup_events (
 id TEXT PRIMARY KEY,
 patient_id TEXT NOT NULL REFERENCES dv2_patients(id) ON DELETE CASCADE,
 event_key TEXT NOT NULL,
 kind TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('preparado','abierto','enviado','omitido')),
 message TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(patient_id,event_key)
);
CREATE INDEX IF NOT EXISTS idx_dv2_followup_events_patient ON dv2_followup_events(patient_id);
