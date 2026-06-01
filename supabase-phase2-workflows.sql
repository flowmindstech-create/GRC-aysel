-- ============================================================
-- RiskShield IRM — Phase 2 Workflow Migration
-- Audit Finding Workflow + NIRAP + Incident workflow columns
-- ============================================================

-- ── 1. ALTER incidents — workflow columns ────────────────────────────────────

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS workflow_step         TEXT DEFAULT 'registration'
    CHECK (workflow_step IN (
      'registration','classification','priority_assessment',
      'immediate_actions','investigation','control_identified',
      'control_effectiveness','root_cause_analysis','correction_verified',
      'corrective_action_gate','action_plan','implementation',
      'validation','risk_creation_gate','closed'
    )),
  ADD COLUMN IF NOT EXISTS priority              TEXT
    CHECK (priority IN ('critical','high','medium','low')),
  ADD COLUMN IF NOT EXISTS containment_action    TEXT,
  ADD COLUMN IF NOT EXISTS containment_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS containment_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS investigation_note    TEXT,
  ADD COLUMN IF NOT EXISTS related_control_ids   UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS control_effectiveness TEXT
    CHECK (control_effectiveness IN ('effective','partially_effective','ineffective','na')),
  ADD COLUMN IF NOT EXISTS root_cause            TEXT,
  ADD COLUMN IF NOT EXISTS root_cause_category   TEXT
    CHECK (root_cause_category IN ('process','technology','people','external')),
  ADD COLUMN IF NOT EXISTS correction_verified   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS corrective_action_required BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS corrective_action     TEXT,
  ADD COLUMN IF NOT EXISTS action_plan_due       DATE,
  ADD COLUMN IF NOT EXISTS action_plan_assigned  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS implementation_note   TEXT,
  ADD COLUMN IF NOT EXISTS implementation_evidence TEXT,
  ADD COLUMN IF NOT EXISTS validation_note       TEXT,
  ADD COLUMN IF NOT EXISTS validated_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validated_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_creation_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS risk_created_id       UUID REFERENCES risks(id) ON DELETE SET NULL;

-- ── 2. audit_finding_workflow ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_finding_workflow (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audit_finding_id              UUID NOT NULL REFERENCES audit_findings(id) ON DELETE CASCADE,

  step                          TEXT NOT NULL DEFAULT 'registration'
    CHECK (step IN (
      'registration','classification','severity_assessment',
      'immediate_correction','verification',
      'investigation','evidence_review','root_cause_analysis',
      'compliance_impact_assessment','corrective_action_gate',
      'action_plan','implementation','validation',
      'risk_creation_gate','closure'
    )),
  status                        TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','pending_review','closed','risk_created')),

  -- Classification
  classification                TEXT,
  priority                      TEXT CHECK (priority IN ('critical','high','medium','low')),
  immediate_correction_required BOOLEAN DEFAULT FALSE,

  -- Immediate correction path
  immediate_correction_note     TEXT,
  immediate_correction_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  immediate_correction_at       TIMESTAMPTZ,
  verification_note             TEXT,
  verified_by                   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at                   TIMESTAMPTZ,

  -- Investigation path
  investigation_note            TEXT,
  evidence_review_note          TEXT,
  evidence_url                  TEXT,
  root_cause                    TEXT,
  root_cause_category           TEXT
    CHECK (root_cause_category IN ('process','technology','people','external')),
  root_cause_analyst_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Compliance impact
  compliance_impact_note        TEXT,
  compliance_frameworks_affected TEXT[] DEFAULT '{}',
  corrective_action_required    BOOLEAN DEFAULT TRUE,

  -- Action plan / implementation / validation
  action_plan                   TEXT,
  assigned_to                   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date                      DATE,
  implementation_note           TEXT,
  implementation_evidence_url   TEXT,
  implemented_at                TIMESTAMPTZ,
  validation_note               TEXT,
  validated_by                  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at                  TIMESTAMPTZ,

  -- Risk creation gate
  risk_creation_required        BOOLEAN DEFAULT FALSE,
  risk_created_id               UUID REFERENCES risks(id) ON DELETE SET NULL,

  closed_at                     TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_afw_org_id     ON audit_finding_workflow(org_id);
CREATE INDEX IF NOT EXISTS idx_afw_finding_id ON audit_finding_workflow(audit_finding_id);
CREATE INDEX IF NOT EXISTS idx_afw_status     ON audit_finding_workflow(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_afw_unique_finding ON audit_finding_workflow(audit_finding_id);

ALTER TABLE audit_finding_workflow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_audit_finding_workflow" ON audit_finding_workflow;
CREATE POLICY "org_audit_finding_workflow" ON audit_finding_workflow
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 3. nirap_items ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nirap_items (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nirap_id                TEXT NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  type                    TEXT NOT NULL DEFAULT 'requirement'
    CHECK (type IN ('requirement','change_request','new_implementation','policy_change')),
  step                    TEXT NOT NULL DEFAULT 'registration'
    CHECK (step IN (
      'registration','screening','classification','impact_assessment',
      'control_gap_analysis','risk_assessment','compliance_assessment',
      'approval_gate','implementation_planning','implementation',
      'validation','closure'
    )),
  status                  TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','approved','rejected','closed')),

  -- Classification
  classification          TEXT,
  business_unit           TEXT,
  urgency                 TEXT CHECK (urgency IN ('critical','high','medium','low')),

  -- Screening
  initial_screening_note  TEXT,
  screening_outcome       TEXT CHECK (screening_outcome IN ('proceed','reject','defer')),

  -- Impact assessment
  impact_assessment       TEXT,
  affected_systems        TEXT[] DEFAULT '{}',
  affected_processes      TEXT[] DEFAULT '{}',

  -- Control gap
  control_gap_summary     TEXT,
  gaps_identified         BOOLEAN DEFAULT FALSE,

  -- Risk / compliance
  risk_assessment_note    TEXT,
  compliance_note         TEXT,
  linked_risk_id          UUID REFERENCES risks(id) ON DELETE SET NULL,

  -- Approval
  approval_required       BOOLEAN DEFAULT TRUE,
  approver_id             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at             TIMESTAMPTZ,
  committee_decision      TEXT CHECK (committee_decision IN ('approve','reject','modify')),
  committee_notes         TEXT,

  -- Implementation
  implementation_plan     TEXT,
  implementation_owner    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  implementation_due      DATE,
  implementation_note     TEXT,
  validation_note         TEXT,

  closed_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nirap_org    ON nirap_items(org_id);
CREATE INDEX IF NOT EXISTS idx_nirap_status ON nirap_items(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nirap_id_org ON nirap_items(org_id, nirap_id);

ALTER TABLE nirap_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_nirap_items" ON nirap_items;
CREATE POLICY "org_nirap_items" ON nirap_items
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
