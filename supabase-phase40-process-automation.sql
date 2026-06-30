-- ============================================================
-- RiskShield IRM — Phase 40 (business process automation)
-- Process-level automation indicator (manual / automated / hybrid)
-- shown in the Mapping Matrix (business process) view.
-- ============================================================

ALTER TABLE processes ADD COLUMN IF NOT EXISTS automation text;
