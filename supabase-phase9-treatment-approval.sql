-- ============================================================
-- RiskShield IRM — Phase 9 Migration
-- Risk treatment approval (İcraçı Direktor təsdiqi)
-- A treatment forbidden by the inherent-risk matrix (× in Excel
-- "5-Riskin müalicəsi") may only be selected with executive-director
-- approval. These columns persist that approval + its justification.
-- ============================================================

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS treatment_approved      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS treatment_approval_note TEXT,
  ADD COLUMN IF NOT EXISTS treatment_approved_by   TEXT,
  ADD COLUMN IF NOT EXISTS treatment_approved_at   TIMESTAMPTZ;

-- ── Clean Control Library start (controls seeded from ISO / UI later) ─────────
-- control_mappings reference controls via FK ON DELETE CASCADE, so mappings
-- are removed automatically.
DELETE FROM controls;
