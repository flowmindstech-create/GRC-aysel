-- ============================================================
-- RiskShield IRM — Phase 38 Migration (6 risk categories + incident risk_category)
-- Platforma boyu risk taksonomiyası 6-ya keçir:
--   financial · operational · reputation · information_security · strategic · compliance
-- ============================================================

-- ── 1. risks.category CHECK-i yenilə (köhnə: phase5) ────────────────────────
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_category_check;

UPDATE risks SET category = 'information_security' WHERE category = 'cybersecurity';
UPDATE risks SET category = 'compliance'           WHERE category IN ('legal_compliance', 'legal');
UPDATE risks SET category = 'operational'          WHERE category = 'hr';

ALTER TABLE risks
  ADD CONSTRAINT risks_category_check
  CHECK (category IN ('financial','operational','reputation','information_security','strategic','compliance'));

-- ── 2. incidents.risk_category sütunu (insident → valideyn risk kateqoriyası) ─
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS risk_category TEXT;
