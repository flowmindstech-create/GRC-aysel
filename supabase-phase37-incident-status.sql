-- ============================================================
-- RiskShield IRM — Phase 37 Migration (6-stage incident status)
-- Open → Review by Risk Manager → Root Cause Analysis → Resolution → Done → Closed
-- ============================================================

UPDATE incidents SET status = 'review_by_risk_manager' WHERE status = 'investigating';
UPDATE incidents SET status = 'root_cause_analysis'    WHERE status = 'contained';
UPDATE incidents SET status = 'done'                   WHERE status = 'resolved';

ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('open','review_by_risk_manager','root_cause_analysis','resolution','done','closed'));
