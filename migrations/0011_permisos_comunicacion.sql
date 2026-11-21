ALTER TABLE dv2_followup ADD COLUMN clinical_permission TEXT NOT NULL DEFAULT 'pending' CHECK(clinical_permission IN ('yes','pending','no'));
ALTER TABLE dv2_followup ADD COLUMN billing_permission TEXT NOT NULL DEFAULT 'pending' CHECK(billing_permission IN ('yes','pending','no'));
ALTER TABLE dv2_followup ADD COLUMN promo_permission TEXT NOT NULL DEFAULT 'pending' CHECK(promo_permission IN ('yes','pending','no'));
ALTER TABLE dv2_followup ADD COLUMN permission_method TEXT NOT NULL DEFAULT '';
ALTER TABLE dv2_followup ADD COLUMN permission_evidence TEXT NOT NULL DEFAULT '';
ALTER TABLE dv2_followup ADD COLUMN permission_updated_at TEXT;
ALTER TABLE dv2_followup ADD COLUMN first_contact_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dv2_followup ADD COLUMN first_contact_done INTEGER NOT NULL DEFAULT 0;
