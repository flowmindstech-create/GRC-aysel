-- ============================================================
-- RiskShield IRM — Phase 1 Foundation Migration
-- Run ONCE in Supabase SQL Editor (idempotent — safe to re-run)
-- ============================================================

-- ── 1. ALTER controls — Expanded Control Card ────────────────────────────────

ALTER TABLE controls
  ADD COLUMN IF NOT EXISTS req_id               TEXT,
  ADD COLUMN IF NOT EXISTS control_type         TEXT
    CHECK (control_type IN ('preventive','detective','corrective','directive')),
  ADD COLUMN IF NOT EXISTS classification       TEXT
    CHECK (classification IN ('manual','automated','hybrid')),
  ADD COLUMN IF NOT EXISTS objective            TEXT,
  ADD COLUMN IF NOT EXISTS owner_id             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_dept           TEXT,
  ADD COLUMN IF NOT EXISTS systems_tools        TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS execution_frequency  TEXT
    CHECK (execution_frequency IN ('continuous','daily','weekly','monthly','quarterly','annual','ad_hoc')),
  ADD COLUMN IF NOT EXISTS execution_detail     TEXT,
  ADD COLUMN IF NOT EXISTS evidence_requirements TEXT,
  ADD COLUMN IF NOT EXISTS kci_definition       TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_rating TEXT     DEFAULT 'na'
    CHECK (effectiveness_rating IN ('effective','partially_effective','ineffective','na')),
  ADD COLUMN IF NOT EXISTS design_effectiveness TEXT     DEFAULT 'not_tested'
    CHECK (design_effectiveness IN ('pass','fail','partial','not_tested')),
  ADD COLUMN IF NOT EXISTS operating_effectiveness TEXT  DEFAULT 'not_tested'
    CHECK (operating_effectiveness IN ('pass','fail','partial','not_tested')),
  ADD COLUMN IF NOT EXISTS last_tested_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_test_date       DATE,
  ADD COLUMN IF NOT EXISTS approval_status      TEXT     DEFAULT 'draft'
    CHECK (approval_status IN ('draft','pending_review','approved','retired')),
  ADD COLUMN IF NOT EXISTS approved_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_live              BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS live_date            DATE,
  ADD COLUMN IF NOT EXISTS version              INT      DEFAULT 1,
  ADD COLUMN IF NOT EXISTS change_history       JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW();

-- ── 2. requirements ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS requirements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  req_id           TEXT NOT NULL,
  source_type      TEXT NOT NULL
    CHECK (source_type IN ('regulatory','audit_finding','risk_event','internal_policy')),
  source_ref       TEXT,
  framework        TEXT
    CHECK (framework IN ('iso27001','soc2','gdpr','pci_dss','custom','none')),
  title            TEXT NOT NULL,
  description      TEXT,
  classification   TEXT NOT NULL DEFAULT 'mandatory'
    CHECK (classification IN ('mandatory','advisory','best_practice')),
  status           TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','mapped','compliant','non_compliant','waived','closed')),
  due_date         DATE,
  owner_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requirements_org_id  ON requirements(org_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status  ON requirements(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_requirements_req_id_org ON requirements(org_id, req_id);

ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_requirements" ON requirements;
CREATE POLICY "org_requirements" ON requirements
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 3. control_mappings ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_mappings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id      UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL
    CHECK (entity_type IN ('risk','requirement','grc_intake_item','audit_finding','incident')),
  entity_id       UUID NOT NULL,
  mapping_type    TEXT NOT NULL DEFAULT 'dual_purpose'
    CHECK (mapping_type IN ('compliance_only','risk_mitigation_only','dual_purpose')),
  mapped_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  mapped_at       TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_control_mappings_org        ON control_mappings(org_id);
CREATE INDEX IF NOT EXISTS idx_control_mappings_control    ON control_mappings(control_id);
CREATE INDEX IF NOT EXISTS idx_control_mappings_entity     ON control_mappings(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_control_mappings_unique
  ON control_mappings(control_id, entity_type, entity_id);

ALTER TABLE control_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_control_mappings" ON control_mappings;
CREATE POLICY "org_control_mappings" ON control_mappings
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 4. control_test_runs ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_test_runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id       UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  run_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tested_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  test_type        TEXT NOT NULL
    CHECK (test_type IN ('design','operating','combined')),
  result           TEXT NOT NULL
    CHECK (result IN ('pass','fail','partial')),
  sample_size      INT,
  exceptions_found INT DEFAULT 0,
  evidence_urls    TEXT[]  DEFAULT '{}',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_runs_org       ON control_test_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_control   ON control_test_runs(control_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_date      ON control_test_runs(run_date DESC);

ALTER TABLE control_test_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_control_test_runs" ON control_test_runs;
CREATE POLICY "org_control_test_runs" ON control_test_runs
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 5. control_issues ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_issues (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  issue_id          TEXT NOT NULL,
  control_id        UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  source            TEXT NOT NULL
    CHECK (source IN ('control_test','audit','self_assessment','incident','monitoring')),
  severity          TEXT NOT NULL
    CHECK (severity IN ('info','low','medium','high','critical')),
  identified_at     TIMESTAMPTZ DEFAULT NOW(),
  identified_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  root_cause        TEXT,
  corrective_action TEXT,
  owner_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date          DATE,
  status            TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','remediated','re_testing','closed','accepted')),
  retest_date       DATE,
  retest_result     TEXT
    CHECK (retest_result IN ('pass','fail','partial')),
  closed_at         TIMESTAMPTZ,
  linked_risk_ids   UUID[]   DEFAULT '{}',
  test_run_id       UUID REFERENCES control_test_runs(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_control_issues_org      ON control_issues(org_id);
CREATE INDEX IF NOT EXISTS idx_control_issues_control  ON control_issues(control_id);
CREATE INDEX IF NOT EXISTS idx_control_issues_status   ON control_issues(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_control_issues_id_org ON control_issues(org_id, issue_id);

ALTER TABLE control_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_control_issues" ON control_issues;
CREATE POLICY "org_control_issues" ON control_issues
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 6. risk_appetite_statements ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_appetite_statements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  risk_category     TEXT NOT NULL
    CHECK (risk_category IN ('cybersecurity','financial','operational','legal','hr','strategic','compliance','overall')),
  description       TEXT,
  appetite_level    TEXT NOT NULL DEFAULT 'low'
    CHECK (appetite_level IN ('zero','low','moderate','elevated','high')),
  tolerance_level   TEXT NOT NULL DEFAULT 'low'
    CHECK (tolerance_level IN ('zero','low','moderate','elevated','high')),
  threshold_green   TEXT,
  threshold_amber   TEXT,
  threshold_red     TEXT,
  max_residual_score INT,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','active','superseded')),
  effective_date    DATE,
  review_date       DATE,
  approved_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  linked_kri_ids    UUID[]   DEFAULT '{}',
  business_unit     TEXT,
  version           INT      DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ras_org      ON risk_appetite_statements(org_id);
CREATE INDEX IF NOT EXISTS idx_ras_status   ON risk_appetite_statements(status);
CREATE INDEX IF NOT EXISTS idx_ras_category ON risk_appetite_statements(risk_category);

ALTER TABLE risk_appetite_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_ras" ON risk_appetite_statements;
CREATE POLICY "org_ras" ON risk_appetite_statements
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 7. Seed default RAS entries ───────────────────────────────────────────────

INSERT INTO risk_appetite_statements (
  id, org_id, title, risk_category, appetite_level, tolerance_level,
  threshold_green, threshold_amber, threshold_red, max_residual_score,
  status, effective_date
) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Cybersecurity Risk Appetite', 'cybersecurity',
   'low', 'low', '1-4', '5-9', '10-25', 6, 'active', CURRENT_DATE),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Financial Risk Appetite', 'financial',
   'moderate', 'low', '1-6', '7-12', '13-25', 9, 'active', CURRENT_DATE),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Operational Risk Appetite', 'operational',
   'moderate', 'moderate', '1-6', '7-12', '13-25', 9, 'active', CURRENT_DATE),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Compliance Risk Appetite', 'compliance',
   'zero', 'zero', '1-2', '3-4', '5-25', 3, 'active', CURRENT_DATE),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Legal Risk Appetite', 'legal',
   'zero', 'low', '1-3', '4-6', '7-25', 4, 'active', CURRENT_DATE)
ON CONFLICT DO NOTHING;
