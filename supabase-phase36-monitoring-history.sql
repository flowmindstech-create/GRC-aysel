-- ============================================================
-- RiskShield IRM — Phase 36 Migration (Compliance Assessment history)
-- Per-assessment status-change history for the timeline / History Log.
-- ============================================================

CREATE TABLE IF NOT EXISTS compliance_assessment_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES compliance_assessments(id) ON DELETE CASCADE,
  result        TEXT,
  observed_state TEXT,
  changed_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cah_assessment ON compliance_assessment_history(assessment_id);
CREATE INDEX IF NOT EXISTS idx_cah_org ON compliance_assessment_history(org_id);

ALTER TABLE compliance_assessment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_compliance_assessment_history" ON compliance_assessment_history;
CREATE POLICY "org_compliance_assessment_history" ON compliance_assessment_history
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
