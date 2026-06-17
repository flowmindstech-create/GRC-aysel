-- ============================================================
-- RiskShield IRM — Phase 17 Migration
-- Interested Parties register (ISO 37301/37001 stakeholders)
-- ============================================================

CREATE TABLE IF NOT EXISTS interested_parties (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  party_code         TEXT UNIQUE,
  name               TEXT NOT NULL,
  party_type         TEXT DEFAULT 'external'
    CHECK (party_type IN ('internal','external','regulator','customer','supplier','employee','community')),
  needs_expectations TEXT,
  influence          TEXT DEFAULT 'medium'
    CHECK (influence IN ('low','medium','high')),
  owner              TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interested_parties_org ON interested_parties(org_id);

ALTER TABLE interested_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_interested_parties" ON interested_parties;
CREATE POLICY "org_interested_parties" ON interested_parties
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
