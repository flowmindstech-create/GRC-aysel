-- ============================================================
-- RiskShield IRM — Phase 3 Monitoring Migration
-- KRI, KCI, KPI tables + monitoring alerts
-- ============================================================

-- ── 1. kri_items ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kri_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kri_id              TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  related_risk_id     UUID REFERENCES risks(id) ON DELETE SET NULL,
  risk_category       TEXT CHECK (risk_category IN ('cybersecurity','financial','operational','legal','hr','strategic','compliance')),
  formula             TEXT,
  data_source         TEXT,
  frequency           TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('daily','weekly','monthly','quarterly')),
  current_value       DECIMAL,
  previous_value      DECIMAL,
  trend               TEXT DEFAULT 'flat' CHECK (trend IN ('up','down','flat')),
  threshold_green     TEXT,
  threshold_amber     TEXT,
  threshold_red       TEXT,
  current_status      TEXT DEFAULT 'green' CHECK (current_status IN ('green','amber','red')),
  appetite_limit      TEXT,
  appetite_breach     BOOLEAN DEFAULT FALSE,
  owner_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_owner_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_updated_at     TIMESTAMPTZ DEFAULT NOW(),
  next_review_date    DATE,
  ras_id              UUID REFERENCES risk_appetite_statements(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kri_org        ON kri_items(org_id);
CREATE INDEX IF NOT EXISTS idx_kri_status     ON kri_items(current_status);
CREATE INDEX IF NOT EXISTS idx_kri_risk       ON kri_items(related_risk_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kri_id_org ON kri_items(org_id, kri_id);

ALTER TABLE kri_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_kri_items" ON kri_items;
CREATE POLICY "org_kri_items" ON kri_items
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 2. kci_items ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kci_items (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id              UUID REFERENCES controls(id) ON DELETE SET NULL,
  name                    TEXT NOT NULL,
  description             TEXT,
  control_type            TEXT CHECK (control_type IN ('preventive','detective','corrective')),
  control_owner_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  objective               TEXT,
  test_method             TEXT DEFAULT 'manual' CHECK (test_method IN ('manual','automated','hybrid')),
  frequency               TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual')),
  current_value           DECIMAL,
  success_rate            DECIMAL CHECK (success_rate BETWEEN 0 AND 100),
  failure_rate            DECIMAL CHECK (failure_rate BETWEEN 0 AND 100),
  effectiveness_rating    INT CHECK (effectiveness_rating BETWEEN 1 AND 5),
  threshold_effective     TEXT,
  threshold_partial       TEXT,
  threshold_ineffective   TEXT,
  current_status          TEXT DEFAULT 'effective'
    CHECK (current_status IN ('effective','partially_effective','ineffective')),
  evidence_source         TEXT,
  last_test_date          DATE,
  next_test_date          DATE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kci_org     ON kci_items(org_id);
CREATE INDEX IF NOT EXISTS idx_kci_control ON kci_items(control_id);
CREATE INDEX IF NOT EXISTS idx_kci_status  ON kci_items(current_status);

ALTER TABLE kci_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_kci_items" ON kci_items;
CREATE POLICY "org_kci_items" ON kci_items
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 3. kpi_items ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  related_process     TEXT,
  process_owner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description         TEXT,
  formula             TEXT,
  target_value        DECIMAL,
  current_value       DECIMAL,
  previous_value      DECIMAL,
  trend               TEXT DEFAULT 'flat' CHECK (trend IN ('up','down','flat')),
  threshold_green     TEXT,
  threshold_amber     TEXT,
  threshold_red       TEXT,
  performance_status  TEXT DEFAULT 'green' CHECK (performance_status IN ('green','amber','red')),
  sla_target          TEXT,
  frequency           TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('daily','weekly','monthly','quarterly')),
  owner_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_updated_at     TIMESTAMPTZ DEFAULT NOW(),
  next_review_date    DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_org    ON kpi_items(org_id);
CREATE INDEX IF NOT EXISTS idx_kpi_status ON kpi_items(performance_status);

ALTER TABLE kpi_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_kpi_items" ON kpi_items;
CREATE POLICY "org_kpi_items" ON kpi_items
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 4. monitoring_alerts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type         TEXT NOT NULL CHECK (source_type IN ('kri','kci','kpi')),
  source_id           UUID NOT NULL,
  source_name         TEXT,
  alert_level         TEXT NOT NULL CHECK (alert_level IN ('amber','red')),
  message             TEXT NOT NULL,
  acknowledged        BOOLEAN DEFAULT FALSE,
  action_required     BOOLEAN DEFAULT TRUE,
  action_plan         TEXT,
  acknowledged_at     TIMESTAMPTZ,
  acknowledged_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_org    ON monitoring_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_alerts_ack    ON monitoring_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_source ON monitoring_alerts(source_type, source_id);

ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_monitoring_alerts" ON monitoring_alerts;
CREATE POLICY "org_monitoring_alerts" ON monitoring_alerts
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 5. Seed demo KRI/KCI/KPI data ────────────────────────────────────────────

INSERT INTO kri_items (id, org_id, kri_id, name, description, risk_category, formula, data_source, frequency,
  current_value, previous_value, trend, threshold_green, threshold_amber, threshold_red,
  current_status, appetite_limit, appetite_breach, next_review_date)
VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'KRI-001', 'Critical Vulnerability Count', 'Number of unpatched critical CVEs',
   'cybersecurity', 'COUNT(open_critical_cves)', 'Vulnerability Scanner', 'weekly',
   3, 7, 'down', '0-2', '3-5', '>5', 'amber', '2', FALSE, CURRENT_DATE + 7),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'KRI-002', 'Failed Login Attempts', 'Daily failed authentication rate',
   'cybersecurity', 'COUNT(failed_logins) / total_logins * 100', 'SIEM', 'daily',
   1.2, 0.8, 'up', '<2%', '2-5%', '>5%', 'green', '5%', FALSE, CURRENT_DATE + 1),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'KRI-003', 'Regulatory Breach Incidents', 'Number of compliance breach events',
   'compliance', 'COUNT(compliance_breaches)', 'GRC System', 'monthly',
   2, 0, 'up', '0', '1', '>1', 'red', '1', TRUE, CURRENT_DATE + 30),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'KRI-004', 'Vendor High-Risk Score Count', 'Vendors with risk score > 70',
   'operational', 'COUNT(vendors WHERE risk_score > 70)', 'Vendor Registry', 'monthly',
   1, 2, 'down', '0-1', '2-3', '>3', 'green', '3', FALSE, CURRENT_DATE + 30)
ON CONFLICT DO NOTHING;

INSERT INTO kci_items (id, org_id, name, description, control_type, test_method, frequency,
  current_value, success_rate, failure_rate, effectiveness_rating,
  threshold_effective, threshold_partial, threshold_ineffective,
  current_status, last_test_date, next_test_date)
VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Access Review Completion Rate', 'Quarterly user access reviews completed on time',
   'preventive', 'manual', 'quarterly',
   87, 87, 13, 4, '>90%', '70-90%', '<70%', 'partially_effective',
   CURRENT_DATE - 15, CURRENT_DATE + 75),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Patch Deployment SLA', '% of critical patches applied within 72 hours',
   'corrective', 'automated', 'weekly',
   95, 95, 5, 5, '>95%', '80-95%', '<80%', 'effective',
   CURRENT_DATE - 3, CURRENT_DATE + 4),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Backup Success Rate', 'Daily backup job completion rate',
   'detective', 'automated', 'daily',
   62, 62, 38, 2, '>99%', '90-99%', '<90%', 'ineffective',
   CURRENT_DATE - 1, CURRENT_DATE + 1)
ON CONFLICT DO NOTHING;

INSERT INTO kpi_items (id, org_id, name, related_process, description, formula,
  target_value, current_value, previous_value, trend,
  threshold_green, threshold_amber, threshold_red, performance_status,
  frequency, next_review_date)
VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Risk Closure Rate', 'Risk Management', '% of open risks closed within SLA',
   'closed_risks / total_open_risks * 100',
   80, 68, 72, 'down', '>80%', '60-80%', '<60%', 'amber', 'monthly', CURRENT_DATE + 30),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Incident MTTR', 'Incident Management', 'Mean time to resolve incidents (hours)',
   'AVG(resolved_at - created_at)',
   4, 3.2, 4.8, 'down', '<4h', '4-8h', '>8h', 'green', 'weekly', CURRENT_DATE + 7),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001',
   'Audit Finding Closure Rate', 'Audit Management', '% of findings closed within due date',
   'closed_findings / total_findings * 100',
   90, 55, 70, 'down', '>90%', '70-90%', '<70%', 'red', 'monthly', CURRENT_DATE + 30)
ON CONFLICT DO NOTHING;
