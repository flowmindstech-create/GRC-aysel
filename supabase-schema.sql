-- ============================================================
-- RiskShield IRM — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations ────────────────────────────────────────────
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Profiles (extends auth.users) ───────────────────────
CREATE TABLE profiles (
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── Risks ────────────────────────────────────────────────────
CREATE TABLE risks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('cybersecurity','financial','operational','legal','hr','strategic','compliance')),
  level       TEXT NOT NULL CHECK (level IN ('minimal','low','medium','high','critical')),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','mitigated','accepted','closed')),
  owner_id    UUID REFERENCES profiles(id),
  due_date    DATE,
  likelihood  INT NOT NULL DEFAULT 2 CHECK (likelihood BETWEEN 1 AND 5),
  impact      INT NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  mitigation  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risks_org_id ON risks(org_id);
CREATE INDEX idx_risks_level ON risks(level);
CREATE INDEX idx_risks_status ON risks(status);

-- ── Incidents ─────────────────────────────────────────────────
CREATE TABLE incidents (
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
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_org_id ON incidents(org_id);
CREATE INDEX idx_incidents_status ON incidents(status);

-- ── Controls (Compliance) ─────────────────────────────────────
CREATE TABLE controls (
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

CREATE INDEX idx_controls_org_framework ON controls(org_id, framework);

-- ── Audits ────────────────────────────────────────────────────
CREATE TABLE audits (
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
CREATE TABLE audit_findings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id        UUID REFERENCES audits(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  recommendation  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','accepted')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_findings_audit_id ON audit_findings(audit_id);

-- ── Vendors ───────────────────────────────────────────────────
CREATE TABLE vendors (
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

-- ── Evidence Files ────────────────────────────────────────────
CREATE TABLE evidence_files (
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
CREATE TABLE activities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id),
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  entity_title  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_org_id ON activities(org_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors         ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "org_activities" ON activities;
CREATE POLICY "org_activities" ON activities
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "own_profile" ON profiles;
CREATE POLICY "own_profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- ── Seed Demo Data ────────────────────────────────────────────
INSERT INTO organizations (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'professional');
