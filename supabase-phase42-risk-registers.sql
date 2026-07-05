-- ============================================================
-- GRCell — Phase 42 Migration (Risk Register alt-reyestrləri)
-- 1) compliance_risks: Compliance Risk Register (Risk Register tab 2)
-- 2) infosec_risks: Information Security Risk Register (tab 3) —
--    impacts JSONB (9 RCSA təsir ölçüsü üzrə), inherent = probability×max(impacts);
--    deadline/responsible sahələri yalnız yaradılanda təyin olunur (UI kilidləyir)
-- ============================================================

-- ── compliance_risks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_risks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code             TEXT NOT NULL,              -- CRR-YYYY-NNN
  obligation_id    UUID REFERENCES compliance_obligations(id) ON DELETE SET NULL,
  requirement      TEXT,
  risk_description TEXT NOT NULL,
  likelihood       INT CHECK (likelihood BETWEEN 1 AND 5),
  impact           INT CHECK (impact BETWEEN 1 AND 5),
  inherent_score   INT,
  risk_trigger     TEXT,
  control_id       UUID REFERENCES controls(id) ON DELETE SET NULL,
  mitigation_plan  TEXT,
  treatment_plan   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, code)
);
CREATE INDEX IF NOT EXISTS idx_compliance_risks_org ON compliance_risks(org_id);
ALTER TABLE compliance_risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_compliance_risks" ON compliance_risks;
CREATE POLICY "org_compliance_risks" ON compliance_risks
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── infosec_risks ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS infosec_risks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                  TEXT NOT NULL,          -- ISR-YYYY-NNN
  process               TEXT,
  asset                 TEXT NOT NULL,
  threat                TEXT NOT NULL,
  vulnerability         TEXT NOT NULL,
  risk_description      TEXT NOT NULL,
  risk_trigger          TEXT,
  probability           INT CHECK (probability BETWEEN 1 AND 5),
  impacts               JSONB DEFAULT '{}',     -- RCSA təsir ölçüsü key → 1-5
  inherent_score        INT,
  current_control_id    UUID REFERENCES controls(id) ON DELETE SET NULL,
  residual_probability  INT CHECK (residual_probability BETWEEN 1 AND 5),
  residual_impact       INT CHECK (residual_impact BETWEEN 1 AND 5),
  residual_score        INT,
  treatment_plan        TEXT,
  mitigation_plan       TEXT,
  deadline              DATE,
  responsible_structure TEXT,
  responsible_person    TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, code)
);
CREATE INDEX IF NOT EXISTS idx_infosec_risks_org ON infosec_risks(org_id);
ALTER TABLE infosec_risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_infosec_risks" ON infosec_risks;
CREATE POLICY "org_infosec_risks" ON infosec_risks
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
