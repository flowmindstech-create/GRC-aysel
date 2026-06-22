-- ============================================================
-- RiskShield IRM — Phase 34 Migration (Compliance Monitoring & Assessment)
-- A periodic compliance-check register: each row is a control × obligation
-- assessment with a result, observed state, evidence and remediation.
-- Non-compliant rows auto-create an incident; compliant rows roll the
-- next review date forward by the frequency.
-- ============================================================

CREATE TABLE IF NOT EXISTS compliance_assessments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                TEXT UNIQUE,            -- CMP-YYYY-NNN
  title               TEXT,
  control_id          UUID REFERENCES controls(id) ON DELETE SET NULL,
  obligation_id       UUID REFERENCES compliance_obligations(id) ON DELETE SET NULL,
  frequency           TEXT DEFAULT 'quarterly'
    CHECK (frequency IN ('monthly','quarterly','semiannual','annual','adhoc')),
  owner               TEXT,
  last_review_date    DATE,
  next_review_date    DATE,
  result              TEXT DEFAULT 'not_tested'
    CHECK (result IN ('compliant','partially_compliant','non_compliant','not_tested')),
  observed_state      TEXT,
  evidence_url        TEXT,
  evidence_file_name  TEXT,
  findings            TEXT,
  remediation_plan    TEXT,
  created_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_assessments_org ON compliance_assessments(org_id);

ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_compliance_assessments" ON compliance_assessments;
CREATE POLICY "org_compliance_assessments" ON compliance_assessments
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
