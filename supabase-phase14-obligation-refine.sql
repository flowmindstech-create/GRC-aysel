-- ============================================================
-- RiskShield IRM — Phase 14 Migration
-- Obligation refinements: responsible_role (owner dependency) + evidence
-- ============================================================

ALTER TABLE compliance_obligations
  ADD COLUMN IF NOT EXISTS responsible_role TEXT,
  ADD COLUMN IF NOT EXISTS evidence         TEXT;
