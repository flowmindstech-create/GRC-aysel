-- ============================================================
-- RiskShield IRM — Phase 39 (incident investigation deepening)
-- RCSA control assessment (6 sub-criteria) + clarifying questions on incidents.
-- ============================================================

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_control_assessment jsonb;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS clarifying_qa jsonb;
