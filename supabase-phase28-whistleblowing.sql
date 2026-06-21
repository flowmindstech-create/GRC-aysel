-- ============================================================
-- RiskShield IRM — Phase 28 Migration (Whistleblowing)
-- Confidential whistleblowing register. The complaint BODY is stored encrypted
-- (AES-GCM); only someone who knows the officer access code can decrypt it in
-- the UI — even an org admin cannot read it without the code.
-- Subject/source are kept as light metadata so the register is usable.
-- ============================================================

CREATE TABLE IF NOT EXISTS whistleblow_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code        TEXT UNIQUE,                 -- WB-YYYY-NNN
  source      TEXT DEFAULT 'manual'
    CHECK (source IN ('manual','email')),
  subject     TEXT,                         -- light metadata (non-sensitive)
  body_iv     TEXT,                         -- AES-GCM IV (base64)
  body_cipher TEXT,                         -- encrypted complaint body (base64)
  status      TEXT DEFAULT 'new'
    CHECK (status IN ('new','under_review','substantiated','dismissed','closed')),
  risk_id     UUID REFERENCES risks(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whistleblow_org ON whistleblow_reports(org_id);

ALTER TABLE whistleblow_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_whistleblow" ON whistleblow_reports;
CREATE POLICY "org_whistleblow" ON whistleblow_reports
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
