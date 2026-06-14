-- ============================================================
-- RiskShield IRM — Phase 11 Migration
-- (1) Compliance obligation: compliance_condition, responsible_structure, primary_risk_id
-- (2) Regulatory Change Management (ISO 37301): regulatory_changes + affected-obligation links
-- Org-scoped RLS (same pattern as phase 5/10).
-- ============================================================

-- ── 1. Obligation extra fields ───────────────────────────────────────────────
ALTER TABLE compliance_obligations
  ADD COLUMN IF NOT EXISTS compliance_condition  TEXT,
  ADD COLUMN IF NOT EXISTS responsible_structure TEXT,
  ADD COLUMN IF NOT EXISTS primary_risk_id       UUID REFERENCES risks(id) ON DELETE SET NULL;

-- ── 2. regulatory_changes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulatory_changes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  change_code       TEXT UNIQUE,
  title             TEXT NOT NULL,
  source            TEXT,
  regulator         TEXT,
  change_date       DATE,
  description       TEXT,
  impact_assessment TEXT,
  status            TEXT DEFAULT 'new'
    CHECK (status IN ('new','under_assessment','implemented','closed')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_changes_org ON regulatory_changes(org_id);

ALTER TABLE regulatory_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_regulatory_changes" ON regulatory_changes;
CREATE POLICY "org_regulatory_changes" ON regulatory_changes
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 3. regulatory_change_links (change ↔ affected obligation) ────────────────
CREATE TABLE IF NOT EXISTS regulatory_change_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  change_id     UUID NOT NULL REFERENCES regulatory_changes(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (change_id, obligation_id)
);

CREATE INDEX IF NOT EXISTS idx_reg_link_change ON regulatory_change_links(change_id);
CREATE INDEX IF NOT EXISTS idx_reg_link_org    ON regulatory_change_links(org_id);

ALTER TABLE regulatory_change_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_regulatory_change_links" ON regulatory_change_links;
CREATE POLICY "org_regulatory_change_links" ON regulatory_change_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
