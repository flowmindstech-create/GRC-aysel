-- ============================================================
-- RiskShield IRM — Phase 24 Migration (Incident ↔ Process)
-- Links an incident to a business process so the system can surface related
-- risks / incidents / controls and warn about recent occurrences.
-- ============================================================

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES processes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_process ON incidents(process_id);
