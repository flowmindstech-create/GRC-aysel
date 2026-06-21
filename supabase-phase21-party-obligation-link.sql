-- ============================================================
-- RiskShield IRM — Phase 21 Migration (Interested Party ↔ Obligation)
-- An interested party's needs/expectations often translate into a compliance
-- obligation. This M:N link makes that relationship explicit (ISO 37301/37001).
-- ============================================================

CREATE TABLE IF NOT EXISTS party_obligation_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  party_id      UUID NOT NULL REFERENCES interested_parties(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (party_id, obligation_id)
);

CREATE INDEX IF NOT EXISTS idx_party_obl_party ON party_obligation_links(party_id);
CREATE INDEX IF NOT EXISTS idx_party_obl_org   ON party_obligation_links(org_id);

ALTER TABLE party_obligation_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_party_obligation_links" ON party_obligation_links;
CREATE POLICY "org_party_obligation_links" ON party_obligation_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
