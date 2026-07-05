-- ============================================================
-- GRCell — Phase 43 Migration (Internal Policies register)
-- Compliance səhifəsindəki "Internal Policies" tabı: register/list formatı —
-- code, policy name, document type, approving body (Trustees Body/CEO),
-- responsible structure/person, version, document number,
-- publish time + validity period, status (5 mərhələ).
-- ============================================================

CREATE TABLE IF NOT EXISTS internal_policies (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                  TEXT NOT NULL,          -- IP-YYYY-NNN
  policy_name           TEXT NOT NULL,
  document_type         TEXT NOT NULL DEFAULT 'policy'
    CHECK (document_type IN ('policy','procedure','rules','instruction')),
  approving_body        TEXT NOT NULL DEFAULT 'ceo'
    CHECK (approving_body IN ('trustees_body','ceo')),
  responsible_structure TEXT,
  responsible_person    TEXT,
  version               TEXT NOT NULL DEFAULT '1.0',
  document_number       TEXT,
  publish_time          DATE,
  validity_period       DATE,                   -- qüvvədə olma müddətinin bitməsi
  status                TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','approved','published','rejected','defunct')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, code)
);
CREATE INDEX IF NOT EXISTS idx_internal_policies_org ON internal_policies(org_id);
ALTER TABLE internal_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_internal_policies" ON internal_policies;
CREATE POLICY "org_internal_policies" ON internal_policies
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
