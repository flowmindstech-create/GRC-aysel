-- ============================================================
-- RiskShield IRM — Supabase Database Update Schema
-- Run this in your Supabase SQL Editor to support GRC Workflows & RCSA
-- ============================================================

-- 1. Alter "risks" table to add new workflow and RCSA columns
ALTER TABLE risks 
  ADD COLUMN IF NOT EXISTS workflow_step TEXT DEFAULT 'registered',
  ADD COLUMN IF NOT EXISTS inherent_likelihood INT,
  ADD COLUMN IF NOT EXISTS inherent_impact INT,
  ADD COLUMN IF NOT EXISTS control_mapped_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS control_effectiveness TEXT,
  ADD COLUMN IF NOT EXISTS residual_likelihood INT,
  ADD COLUMN IF NOT EXISTS residual_impact INT,
  ADD COLUMN IF NOT EXISTS treatment_plan TEXT,
  ADD COLUMN IF NOT EXISTS action_plan TEXT,
  ADD COLUMN IF NOT EXISTS validation_evidence TEXT,
  ADD COLUMN IF NOT EXISTS escalation_level TEXT DEFAULT 'none',
  
  -- Expanded RCSA Fields (Excel Policy Integration)
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS owner_dept TEXT,
  ADD COLUMN IF NOT EXISTS owner_role TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS implementation_date TEXT,
  ADD COLUMN IF NOT EXISTS revision_changes TEXT,
  ADD COLUMN IF NOT EXISTS confidentiality INT,
  ADD COLUMN IF NOT EXISTS integrity INT,
  ADD COLUMN IF NOT EXISTS availability INT,
  ADD COLUMN IF NOT EXISTS operational_impact INT,
  ADD COLUMN IF NOT EXISTS financial_impact INT,
  ADD COLUMN IF NOT EXISTS reputation_impact INT,
  ADD COLUMN IF NOT EXISTS compliance_impact INT,
  ADD COLUMN IF NOT EXISTS target_residual_risk TEXT,
  ADD COLUMN IF NOT EXISTS control_design INT,
  ADD COLUMN IF NOT EXISTS control_implementation INT,
  ADD COLUMN IF NOT EXISTS control_design_compliance INT,
  ADD COLUMN IF NOT EXISTS control_design_strength INT,
  ADD COLUMN IF NOT EXISTS control_design_timeliness INT,
  ADD COLUMN IF NOT EXISTS control_implementation_relevance INT,
  ADD COLUMN IF NOT EXISTS control_implementation_sustainability INT,
  ADD COLUMN IF NOT EXISTS control_implementation_traceability INT;

-- 2. Create the "grc_intake_items" table
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

-- Create index for organization scoping
CREATE INDEX IF NOT EXISTS idx_grc_intake_items_org_id ON grc_intake_items(org_id);

-- 3. Enable Row Level Security (RLS) on the new table
ALTER TABLE grc_intake_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for organization-scoped access
DROP POLICY IF EXISTS "org_grc_intake_items" ON grc_intake_items;
CREATE POLICY "org_grc_intake_items" ON grc_intake_items
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- 5. Seed Controls
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

-- 6. Seed Risks
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
