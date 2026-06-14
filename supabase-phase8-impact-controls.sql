-- ============================================================
-- RiskShield IRM — Phase 8 Migration
-- (1) Excel impact domains: business process, HSE (SƏTƏM), strategy
-- (2) Control Library: non-compliance (custom) controls + expansion columns
-- ============================================================

-- ── 1. New impact dimensions on risks (Excel "Təsir Şkalası") ─────────────────
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS business_process_impact INT,
  ADD COLUMN IF NOT EXISTS hse_impact              INT,
  ADD COLUMN IF NOT EXISTS strategy_impact         INT;

-- ── 2. Controls: allow non-compliance (custom) controls ──────────────────────
ALTER TABLE controls DROP CONSTRAINT IF EXISTS controls_framework_check;
ALTER TABLE controls
  ADD CONSTRAINT controls_framework_check
  CHECK (framework IN ('iso27001','soc2','gdpr','pci_dss','custom'));

-- Control Library expansion fields (safe if already added in phase 1)
ALTER TABLE controls
  ADD COLUMN IF NOT EXISTS control_type          TEXT,
  ADD COLUMN IF NOT EXISTS classification        TEXT,
  ADD COLUMN IF NOT EXISTS owner_id              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_dept            TEXT,
  ADD COLUMN IF NOT EXISTS execution_frequency   TEXT,
  ADD COLUMN IF NOT EXISTS evidence_requirements TEXT,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();
