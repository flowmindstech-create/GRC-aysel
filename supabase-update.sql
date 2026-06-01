-- ============================================================
-- RiskShield IRM — Supabase Database Update Schema
-- Run this in your Supabase SQL Editor to support GRC Workflows
-- ============================================================

-- 1. Alter "risks" table to add new workflow-related columns
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
  ADD COLUMN IF NOT EXISTS escalation_level TEXT DEFAULT 'none';

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
CREATE POLICY "org_grc_intake_items" ON grc_intake_items
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
