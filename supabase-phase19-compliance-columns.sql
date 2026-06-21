-- ============================================================
-- RiskShield IRM — Phase 19 Migration (Compliance Register columns)
-- Adds obligation ↔ policy M:N link table so the Obligation Register can
-- surface Related Policy alongside the existing Related Control links.
-- (Regulator + Evidence columns already exist on compliance_obligations.)
-- Mirrors the obligation_control_links pattern (phase 10).
-- ============================================================

-- ── obligation_policy_links (obligation ↔ internal policy) ──────────────────
CREATE TABLE IF NOT EXISTS obligation_policy_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  policy_id     UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (obligation_id, policy_id)
);

CREATE INDEX IF NOT EXISTS idx_obl_pol_obl ON obligation_policy_links(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obl_pol_org ON obligation_policy_links(org_id);

ALTER TABLE obligation_policy_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_obligation_policy_links" ON obligation_policy_links;
CREATE POLICY "org_obligation_policy_links" ON obligation_policy_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
