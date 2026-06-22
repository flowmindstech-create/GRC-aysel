-- ============================================================
-- RiskShield IRM — Phase 31 Migration (Business Process enrichment)
-- Adds status / criticality / owner to processes, and M:N links to
-- policies, risks and obligations (process becomes a first-class GRC node).
-- ============================================================

ALTER TABLE processes
  ADD COLUMN IF NOT EXISTS owner_id    UUID,
  ADD COLUMN IF NOT EXISTS owner_name  TEXT,
  ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'active'
    CHECK (status IN ('active','draft','archived')),
  ADD COLUMN IF NOT EXISTS criticality TEXT DEFAULT 'medium'
    CHECK (criticality IN ('minimal','low','medium','high','critical'));

-- ── process_policy_links ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS process_policy_links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  policy_id  UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_id, policy_id)
);
CREATE INDEX IF NOT EXISTS idx_proc_pol_proc ON process_policy_links(process_id);
ALTER TABLE process_policy_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_process_policy_links" ON process_policy_links;
CREATE POLICY "org_process_policy_links" ON process_policy_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── process_risk_links ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS process_risk_links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  risk_id    UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_id, risk_id)
);
CREATE INDEX IF NOT EXISTS idx_proc_risk_proc ON process_risk_links(process_id);
ALTER TABLE process_risk_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_process_risk_links" ON process_risk_links;
CREATE POLICY "org_process_risk_links" ON process_risk_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── process_obligation_links ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS process_obligation_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  process_id    UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_id, obligation_id)
);
CREATE INDEX IF NOT EXISTS idx_proc_obl_proc ON process_obligation_links(process_id);
ALTER TABLE process_obligation_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_process_obligation_links" ON process_obligation_links;
CREATE POLICY "org_process_obligation_links" ON process_obligation_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
