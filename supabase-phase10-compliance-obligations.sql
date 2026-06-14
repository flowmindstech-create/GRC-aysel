-- ============================================================
-- RiskShield IRM — Phase 10 Migration
-- Compliance Obligation Register (ISO 37301)
-- (1) compliance_obligations (full obligation model — table created here for the first time)
-- (2) obligation_risk_links / obligation_control_links (M:N traceability)
-- (3) obligation_audit_logs (change history for ISO 37301 traceability)
-- All tables are org-scoped via RLS (same pattern as org_units).
-- ============================================================

-- ── 1. compliance_obligations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_obligations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  obligation_code   TEXT UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  source            TEXT,
  source_type       TEXT DEFAULT 'external'
    CHECK (source_type IN ('external','internal','contractual')),
  source_reference  TEXT,
  source_url        TEXT,
  accountable_owner TEXT,
  responsible_party TEXT,
  applicable_depts  TEXT[] DEFAULT '{}',
  status            TEXT DEFAULT 'under_review'
    CHECK (status IN ('compliant','non_compliant','under_review','not_applicable')),
  criticality       TEXT DEFAULT 'medium'
    CHECK (criticality IN ('low','medium','high')),
  effective_date    DATE,
  next_review_date  DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obligations_org ON compliance_obligations(org_id);

ALTER TABLE compliance_obligations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_compliance_obligations" ON compliance_obligations;
CREATE POLICY "org_compliance_obligations" ON compliance_obligations
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 2a. obligation_risk_links (obligation ↔ risk) ────────────────────────────
CREATE TABLE IF NOT EXISTS obligation_risk_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  risk_id       UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (obligation_id, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_obl_risk_obl ON obligation_risk_links(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obl_risk_org ON obligation_risk_links(org_id);

ALTER TABLE obligation_risk_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_obligation_risk_links" ON obligation_risk_links;
CREATE POLICY "org_obligation_risk_links" ON obligation_risk_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 2b. obligation_control_links (obligation ↔ control) ──────────────────────
CREATE TABLE IF NOT EXISTS obligation_control_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  control_id    UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (obligation_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_obl_ctrl_obl ON obligation_control_links(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obl_ctrl_org ON obligation_control_links(org_id);

ALTER TABLE obligation_control_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_obligation_control_links" ON obligation_control_links;
CREATE POLICY "org_obligation_control_links" ON obligation_control_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 3. obligation_audit_logs (change history) ────────────────────────────────
CREATE TABLE IF NOT EXISTS obligation_audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  changed_by    TEXT,
  action        TEXT NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obl_audit_obl ON obligation_audit_logs(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obl_audit_org ON obligation_audit_logs(org_id);

ALTER TABLE obligation_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_obligation_audit_logs" ON obligation_audit_logs;
CREATE POLICY "org_obligation_audit_logs" ON obligation_audit_logs
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
