-- ============================================================
-- RiskShield IRM — Phase 20 Migration (Risk of non-compliance)
-- Adds a free-text "risk of non-compliance" to obligations, plus a link to
-- the active risk that gets created when that risk materializes.
-- ============================================================

ALTER TABLE compliance_obligations
  ADD COLUMN IF NOT EXISTS noncompliance_risk   TEXT,
  ADD COLUMN IF NOT EXISTS materialized_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL;
