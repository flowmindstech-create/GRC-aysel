-- ============================================================
-- RiskShield IRM — Phase 15 Migration
-- Regulatory Change refinements: effective_date, business_effect, assessor,
-- action_plan, responsibility, link to top-level obligation.
-- ============================================================

ALTER TABLE regulatory_changes
  ADD COLUMN IF NOT EXISTS effective_date        DATE,
  ADD COLUMN IF NOT EXISTS business_effect       TEXT,
  ADD COLUMN IF NOT EXISTS assessor              TEXT,
  ADD COLUMN IF NOT EXISTS action_plan           TEXT,
  ADD COLUMN IF NOT EXISTS responsible_structure TEXT,
  ADD COLUMN IF NOT EXISTS responsible_person    TEXT,
  ADD COLUMN IF NOT EXISTS requirement_link_id   UUID REFERENCES compliance_obligations(id) ON DELETE SET NULL;
