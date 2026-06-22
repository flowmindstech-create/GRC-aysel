-- ============================================================
-- RiskShield IRM — Phase 32 Migration (Incident fields v2)
-- Reporter person, incident category, compliance link, 5-Why,
-- and ISO-aligned root-cause categories.
-- ============================================================

-- Migrate existing root-cause categories to the new ISO set
UPDATE incidents SET root_cause_category = 'human'       WHERE root_cause_category = 'people';
UPDATE incidents SET root_cause_category = 'third_party' WHERE root_cause_category = 'external';
UPDATE incidents SET root_cause_category = 'control_gap' WHERE root_cause_category = 'technology';

ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_root_cause_category_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_root_cause_category_check
  CHECK (root_cause_category IS NULL OR root_cause_category IN
    ('process','human','control_gap','procedure_gap','third_party'));

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reporter_person          TEXT,
  ADD COLUMN IF NOT EXISTS incident_category        TEXT,
  ADD COLUMN IF NOT EXISTS compliance_obligation_id UUID REFERENCES compliance_obligations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS root_cause_whys          JSONB;
