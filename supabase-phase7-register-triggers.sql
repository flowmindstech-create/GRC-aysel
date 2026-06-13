-- ============================================================
-- RiskShield IRM — Phase 7 Migration
-- (1) Department-based unique Risk ID (risk_code)
-- (2) Triggers → Controls (bowtie) stored as JSONB on the risk
-- (3) Org unit short code (Risk ID prefix)
-- ============================================================

-- ── 1. Human-readable, department-based Risk ID ──────────────────────────────
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_code ON risks(org_id, risk_code)
  WHERE risk_code IS NOT NULL;

-- ── 2. Triggers + per-control activities (bowtie) ────────────────────────────
-- Shape: [{ id, description, controls: [{ id, description, control_ref_id?,
--   design_compliance, design_strength, design_timeliness,
--   impl_relevance, impl_sustainability, impl_traceability, score, rating }] }]
ALTER TABLE risks ADD COLUMN IF NOT EXISTS triggers JSONB DEFAULT '[]';

-- ── 3. Org unit code (used as Risk ID prefix, e.g. IT, CORP) ──────────────────
ALTER TABLE org_units ADD COLUMN IF NOT EXISTS code TEXT;

-- Optional: backfill demo department codes (safe to re-run; only sets when null)
UPDATE org_units SET code = 'CORP' WHERE name = 'Korporativ xidmətlər departamenti' AND (code IS NULL OR code = '');
UPDATE org_units SET code = 'BIZ'  WHERE name = 'Biznesin inkişafı departamenti' AND (code IS NULL OR code = '');
UPDATE org_units SET code = 'DIG'  WHERE name = 'Rəqəmsal həllərin inkişafı departamenti' AND (code IS NULL OR code = '');
UPDATE org_units SET code = 'IT'   WHERE name = 'İT infrastruktur və əməliyyatların idarəedilməsi departamenti' AND (code IS NULL OR code = '');
UPDATE org_units SET code = 'OPS'  WHERE name = 'Əməliyyatlar departamenti' AND (code IS NULL OR code = '');
