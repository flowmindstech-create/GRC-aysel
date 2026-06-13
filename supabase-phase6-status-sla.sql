-- ============================================================
-- RiskShield IRM — Phase 6 Migration
-- (1) Risk status pipeline: open → backlog → in_progress → review → done → solved
-- (2) Persisted residual_level column (for SLA + registry display)
-- ============================================================

-- ── 1. Status pipeline ───────────────────────────────────────────────────────
-- Drop the old CHECK, backfill legacy values, then add the new CHECK.
-- legacy map: mitigated → done, accepted → solved, closed → solved

ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

UPDATE risks SET status = 'done'   WHERE status = 'mitigated';
UPDATE risks SET status = 'solved' WHERE status IN ('accepted', 'closed');

ALTER TABLE risks
  ADD CONSTRAINT risks_status_check
  CHECK (status IN ('open','backlog','in_progress','review','done','solved'));

-- ── 2. Residual level (computed from inherent × control effectiveness) ────────
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS residual_level TEXT
    CHECK (residual_level IN ('minimal','low','medium','high','critical'));
