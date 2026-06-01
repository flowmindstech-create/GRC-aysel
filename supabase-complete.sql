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
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── Risks (with Workflow Fields) ──────────────────────────────
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
  escalation_level        TEXT DEFAULT 'none'
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
CREATE POLICY "org_risks" ON risks
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_incidents" ON incidents
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_controls" ON controls
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_audits" ON audits
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_vendors" ON vendors
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_grc_intake_items" ON grc_intake_items
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_activities" ON activities
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "own_profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- ── Seed Demo Data ────────────────────────────────────────────
INSERT INTO organizations (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'professional')
ON CONFLICT DO NOTHING;
