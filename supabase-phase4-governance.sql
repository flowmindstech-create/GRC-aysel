-- ============================================================
-- RiskShield IRM — Phase 4 Governance Migration
-- Policies + Policy Approvals
-- ============================================================

-- ── 1. policies ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS policies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id           TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  category            TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('information_security','operational','hr','financial','compliance','risk','other')),
  version             TEXT NOT NULL DEFAULT '1.0',
  status              TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','committee_review','approved','published','retired','superseded')),
  owner_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_dept          TEXT,
  sponsor_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  effective_date      DATE,
  review_date         DATE,
  expiry_date         DATE,
  last_reviewed_at    DATE,
  submitted_at        TIMESTAMPTZ,
  committee_reviewed_at TIMESTAMPTZ,
  approved_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  body                TEXT,
  document_url        TEXT,
  linked_framework    TEXT,
  linked_control_ids  UUID[]  DEFAULT '{}',
  linked_requirement_ids UUID[] DEFAULT '{}',
  change_summary      TEXT,
  change_history      JSONB   DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_org    ON policies(org_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_id_org ON policies(org_id, policy_id);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_policies" ON policies;
CREATE POLICY "org_policies" ON policies
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 2. policy_approvals ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS policy_approvals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id   UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL
    CHECK (stage IN ('internal_review','committee_review','final_approval')),
  action      TEXT NOT NULL
    CHECK (action IN ('submitted','approved','rejected','returned_for_revision')),
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name  TEXT,
  comments    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_approvals_policy ON policy_approvals(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_approvals_org    ON policy_approvals(org_id);

ALTER TABLE policy_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_policy_approvals" ON policy_approvals;
CREATE POLICY "org_policy_approvals" ON policy_approvals
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 3. Seed demo policies ─────────────────────────────────────────────────────

INSERT INTO policies (id, org_id, policy_id, title, description, category, version, status,
  owner_dept, effective_date, review_date, body)
VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'POL-2024-001', 'Information Security Policy',
   'Defines the organisation-wide information security governance framework.',
   'information_security', '2.1', 'published',
   'IT Security', '2024-01-01', '2025-01-01',
   'This policy establishes the information security management framework...'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'POL-2024-002', 'Data Privacy & GDPR Policy',
   'Governs the collection, processing and storage of personal data.',
   'compliance', '1.3', 'approved',
   'Compliance', '2024-03-01', '2025-03-01',
   'This policy governs all personal data handling activities...'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'POL-2024-003', 'Business Continuity Policy',
   'Ensures continued operation of critical business functions during disruptions.',
   'operational', '1.0', 'committee_review',
   'Operations', NULL, NULL,
   'This policy defines our business continuity management approach...'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'POL-2024-004', 'Acceptable Use Policy',
   'Defines acceptable use of company IT resources and systems.',
   'information_security', '1.1', 'in_review',
   'IT', NULL, NULL, ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'POL-2024-005', 'Third-Party Risk Management Policy',
   'Framework for assessing and managing vendor and supplier risks.',
   'risk', '1.0', 'draft',
   'Risk Management', NULL, NULL, '')
ON CONFLICT DO NOTHING;
