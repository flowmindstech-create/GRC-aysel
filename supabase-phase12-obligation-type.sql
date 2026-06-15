-- ============================================================
-- RiskShield IRM — Phase 12 Migration
-- ISO 37301 obligation classification: Requirement (mandatory) vs Commitment (voluntary)
-- ============================================================

ALTER TABLE compliance_obligations
  ADD COLUMN IF NOT EXISTS obligation_type TEXT DEFAULT 'requirement'
    CHECK (obligation_type IN ('requirement','commitment'));
