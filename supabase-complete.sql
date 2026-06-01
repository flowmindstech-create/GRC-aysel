-- ============================================================
-- RiskShield IRM — Complete Supabase Database Schema
-- Run this in your Supabase SQL Editor for a fresh database setup
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Profiles (extends auth.users) ───────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','risk_manager','auditor','employee')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, org_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'admin',
    '00000000-0000-0000-0000-000000000001'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── Risks (with Workflow & RCSA Fields) ───────────────────────
CREATE TABLE IF NOT EXISTS risks (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  category                TEXT NOT NULL CHECK (category IN ('cybersecurity','financial','operational','legal','hr','strategic','compliance')),
  level                   TEXT NOT NULL CHECK (level IN ('low','medium','high','critical')),
  status                  TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','mitigated','accepted','closed')),
  owner_id                UUID REFERENCES profiles(id),
  due_date                DATE,
  likelihood              INT NOT NULL DEFAULT 2 CHECK (likelihood BETWEEN 1 AND 5),
  impact                  INT NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  mitigation              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  jira_issue_key          TEXT,
  jira_issue_status       TEXT,
  jira_last_sync          TIMESTAMPTZ,
  jira_project_key        TEXT,
  
  -- GRC Workflow Fields
  workflow_step           TEXT DEFAULT 'registered',
  inherent_likelihood     INT,
  inherent_impact         INT,
  control_mapped_ids      UUID[] DEFAULT '{}',
  control_effectiveness   TEXT,
  residual_likelihood     INT,
  residual_impact         INT,
  treatment_plan          TEXT,
  action_plan             TEXT,
  validation_evidence     TEXT,
  escalation_level        TEXT DEFAULT 'none',

  -- Expanded RCSA Fields (Excel Policy Integration)
  sub_category                         TEXT,
  owner_dept                           TEXT,
  owner_role                           TEXT,
  notes                                TEXT,
  implementation_date                  TEXT,
  revision_changes                     TEXT,
  confidentiality                      INT,
  integrity                            INT,
  availability                         INT,
  operational_impact                   INT,
  financial_impact                     INT,
  reputation_impact                    INT,
  compliance_impact                    INT,
  target_residual_risk                 TEXT,
  control_design                       INT,
  control_implementation               INT,
  control_design_compliance            INT,
  control_design_strength              INT,
  control_design_timeliness            INT,
  control_implementation_relevance     INT,
  control_implementation_sustainability  INT,
  control_implementation_traceability  INT
);

CREATE INDEX IF NOT EXISTS idx_risks_org_id ON risks(org_id);
CREATE INDEX IF NOT EXISTS idx_risks_level ON risks(level);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);

-- ── Incidents ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  severity       TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','contained','resolved','closed')),
  assigned_to    UUID REFERENCES profiles(id),
  reported_by    UUID REFERENCES profiles(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  jira_issue_key          TEXT,
  jira_issue_status       TEXT,
  jira_last_sync          TIMESTAMPTZ,
  jira_project_key        TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_org_id ON incidents(org_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- ── Controls (Compliance) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS controls (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  framework     TEXT NOT NULL CHECK (framework IN ('iso27001','soc2','gdpr','pci_dss')),
  control_id    TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'na' CHECK (status IN ('pass','fail','partial','na')),
  evidence_url  TEXT,
  evidence_note TEXT,
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_controls_org_framework ON controls(org_id, framework);

-- ── Audits ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  scope       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  auditor_id  UUID REFERENCES profiles(id),
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit Findings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_findings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id        UUID REFERENCES audits(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  recommendation  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','accepted')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_audit_id ON audit_findings(audit_id);

-- ── Vendors ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (category IN ('cloud_services','software','hardware','professional_services','logistics','financial','other')),
  risk_score          INT NOT NULL DEFAULT 50 CHECK (risk_score BETWEEN 0 AND 100),
  contract_renewal    DATE,
  contact_email       TEXT,
  contact_name        TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','under_review','terminated')),
  ai_summary          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── GRC Intake Items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grc_intake_items (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type                    TEXT NOT NULL CHECK (type IN ('requirement','risk','finding','incident')),
  title                   TEXT NOT NULL,
  description             TEXT,
  classification          TEXT NOT NULL,
  mapped_control_ids      UUID[] DEFAULT '{}',
  evidence_url            TEXT,
  evidence_note           TEXT,
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','compliant','non_compliant','closed')),
  step                    TEXT NOT NULL DEFAULT 'registration',
  gap_identified          BOOLEAN DEFAULT FALSE,
  risk_creation_required  BOOLEAN DEFAULT TRUE,
  risk_created_id         UUID REFERENCES risks(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grc_intake_items_org_id ON grc_intake_items(org_id);

-- ── Evidence Files ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_files (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('risk','incident','control','audit','vendor')),
  entity_id    UUID NOT NULL,
  file_url     TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    INT,
  uploaded_by  UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Activities ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id),
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  entity_title  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_org_id ON activities(org_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE grc_intake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities      ENABLE ROW LEVEL SECURITY;

-- Org-scoped policies (users see only their org's data)
DROP POLICY IF EXISTS "org_risks" ON risks;
CREATE POLICY "org_risks" ON risks
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_incidents" ON incidents;
CREATE POLICY "org_incidents" ON incidents
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_controls" ON controls;
CREATE POLICY "org_controls" ON controls
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_audits" ON audits;
CREATE POLICY "org_audits" ON audits
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_vendors" ON vendors;
CREATE POLICY "org_vendors" ON vendors
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_grc_intake_items" ON grc_intake_items;
CREATE POLICY "org_grc_intake_items" ON grc_intake_items
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_activities" ON activities;
CREATE POLICY "org_activities" ON activities
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "own_profile" ON profiles;
CREATE POLICY "own_profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- ── Seed Demo Data ────────────────────────────────────────────

-- 1. Seed Organization
INSERT INTO organizations (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'professional')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Controls
INSERT INTO controls (id, org_id, framework, control_id, title, description, status, reviewed_at, created_at) VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'iso27001', 'A.5.1', 'Information Security Policies', 'Policies for information security shall be defined, approved by management, published and communicated.', 'pass', NOW(), NOW()),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'iso27001', 'A.6.1', 'Roles and Responsibilities', 'All information security responsibilities shall be defined and allocated.', 'pass', NOW(), NOW()),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'iso27001', 'A.8.1', 'Inventory of Assets', 'Assets associated with information and information processing facilities shall be identified.', 'partial', NULL, NOW()),
('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'iso27001', 'A.9.1', 'Access Control Policy', 'An access control policy shall be established, documented and reviewed based on business requirements.', 'pass', NOW(), NOW()),
('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'iso27001', 'A.10.1', 'Cryptographic Policy', 'A policy on the use of cryptographic controls for protection of information shall be developed and implemented.', 'fail', NULL, NOW()),
('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000001', 'iso27001', 'A.12.1', 'Operational Procedures', 'Operating procedures shall be documented and made available to all users who need them.', 'pass', NOW(), NOW()),
('00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000001', 'iso27001', 'A.14.2', 'Secure Development Policy', 'Rules for the development of software and systems shall be established and applied to developments.', 'partial', NULL, NOW()),
('00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000001', 'iso27001', 'A.16.1', 'Management of Security Events', 'Responsibilities and procedures shall be established to ensure a quick, effective and orderly response to security incidents.', 'pass', NOW(), NOW()),
('00000000-0000-0000-0000-000000000209', '00000000-0000-0000-0000-000000000001', 'soc2', 'CC1.1', 'Control Environment — COSO Principles', 'The entity demonstrates a commitment to integrity and ethical values.', 'pass', NOW(), NOW()),
('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000001', 'soc2', 'CC6.1', 'Logical Access Controls', 'The entity implements logical access security software, infrastructure, and architectures to protect against unauthorized access.', 'pass', NOW(), NOW()),
('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000001', 'soc2', 'CC7.1', 'Change Management', 'The entity uses detection and monitoring procedures to identify changes to configurations.', 'fail', NULL, NOW()),
('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000001', 'soc2', 'CC9.1', 'Risk Mitigation', 'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions.', 'partial', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Risks (with RCSA Details)
INSERT INTO risks (
  id, org_id, title, description, category, level, status, likelihood, impact, mitigation,
  workflow_step, inherent_likelihood, inherent_impact, control_mapped_ids, control_effectiveness,
  residual_likelihood, residual_impact, target_residual_risk,
  sub_category, owner_dept, owner_role, notes, implementation_date,
  confidentiality, integrity, availability, operational_impact, financial_impact, reputation_impact, compliance_impact,
  control_design, control_implementation,
  control_design_compliance, control_design_strength, control_design_timeliness,
  control_implementation_relevance, control_implementation_sustainability, control_implementation_traceability,
  created_at, updated_at
) VALUES
(
  '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
  'SQL Injection Vulnerability in Customer Portal', 'The customer-facing login portal has an unpatched SQL injection point that could expose all customer records.',
  'cybersecurity', 'critical', 'open', 4, 5, 'Apply parameterized queries, conduct penetration test, deploy WAF rule.',
  'identified', 4, 5, '{}', 'adequate', 3, 4, 'low',
  'Web application database access', 'IT Security', 'Security Architect', 'High vulnerability scan finding', '2025-02-15',
  1, 5, 2, 3, 4, 3, 4,
  3, 3,
  3, 3, 3,
  3, 3, 3,
  NOW(), NOW()
),
(
  '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
  'Third-Party Payroll Provider Insolvency Risk', 'Our payroll SaaS vendor is showing signs of financial instability which could disrupt monthly payroll operations.',
  'financial', 'high', 'in_progress', 3, 4, 'Identify backup payroll provider, maintain 3-month payroll reserve fund.',
  'identified', 3, 4, '{}', 'adequate', 2, 3, 'low',
  'Vendor relationship management', 'Finance', 'Financial Analyst', 'Strategic vendor dependency', '2025-03-01',
  1, 1, 3, 1, 5, 2, 2,
  3, 3,
  3, 3, 3,
  3, 3, 3,
  NOW(), NOW()
),
(
  '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001',
  'GDPR Non-Compliance in Marketing Emails', 'Marketing team is sending promotional emails without a valid opt-in consent mechanism, violating GDPR Article 7.',
  'legal', 'high', 'in_progress', 4, 4, 'Implement double opt-in flow, audit existing contact list, update privacy policy.',
  'identified', 4, 4, '{}', 'adequate', 3, 3, 'low',
  'Data privacy and consent', 'Compliance', 'Compliance Officer', 'Internal process audit finding', '2025-02-01',
  2, 2, 1, 2, 2, 2, 5,
  3, 3,
  3, 3, 3,
  3, 3, 3,
  NOW(), NOW()
),
(
  '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
  'Lack of First Aid Boxes', 'There are no standard first aid boxes or medical kits available on the company floors.',
  'operational', 'low', 'closed', 2, 3, 'Purchase and placement of standard fully equipped first aid boxes for each floor.',
  'closed', 2, 3, '{}', 'adequate', 1, 2, 'low',
  'Medical security and first aid process', 'HSE', 'HSE Coordinator', 'Sample RCSA record from company policy', '2025-09-30',
  3, 2, 1, 3, 2, 1, 2,
  3, 3,
  3, 3, 3,
  3, 3, 3,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Vendors
INSERT INTO vendors (id, org_id, name, category, risk_score, contract_renewal, contact_email, contact_name, status, ai_summary, created_at) VALUES
('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'CloudSync Inc.', 'cloud_services', 72, '2025-06-30', 'enterprise@cloudsync.io', 'James Wright', 'active', 'CloudSync presents a moderate-high risk profile. SOC2 Type II certified but has 2 open findings from last security review.', NOW()),
('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', 'PayrollPro Systems', 'software', 85, '2025-03-01', 'sales@payrollpro.com', 'Sarah Chen', 'under_review', 'PayrollPro has an elevated risk score due to recent financial instability reports. No SOC2 certification.', NOW())
ON CONFLICT (id) DO NOTHING;
