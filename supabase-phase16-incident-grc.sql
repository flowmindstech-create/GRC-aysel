-- ============================================================
-- RiskShield IRM — Phase 16 Migration
-- Incident GRC: risk/control linkage + full intake/investigation/resolution
-- columns so the rich incident fields persist to Supabase (not just localStorage).
-- ============================================================

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS workflow_stage       TEXT,
  ADD COLUMN IF NOT EXISTS likelihood           INT,
  ADD COLUMN IF NOT EXISTS impact               INT,
  ADD COLUMN IF NOT EXISTS reporter_email       TEXT,
  ADD COLUMN IF NOT EXISTS reporter_structure   TEXT,
  ADD COLUMN IF NOT EXISTS occurrence_datetime  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discovery_datetime   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS loss_effect          TEXT,
  ADD COLUMN IF NOT EXISTS loss_amount          NUMERIC,
  ADD COLUMN IF NOT EXISTS loss_currency        TEXT,
  ADD COLUMN IF NOT EXISTS attached_files       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS investigation_notes  TEXT,
  ADD COLUMN IF NOT EXISTS investigation_lead   TEXT,
  ADD COLUMN IF NOT EXISTS investigation_start  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS investigation_end    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affected_systems     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS affected_departments TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS risk_id              UUID REFERENCES risks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS control_id           UUID REFERENCES controls(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_summary   TEXT,
  ADD COLUMN IF NOT EXISTS corrective_actions   JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS lessons_learned      TEXT,
  ADD COLUMN IF NOT EXISTS reputation_impact    TEXT,
  ADD COLUMN IF NOT EXISTS closed_at            TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_incidents_risk    ON incidents(risk_id);
CREATE INDEX IF NOT EXISTS idx_incidents_control ON incidents(control_id);
