-- ═══════════════════════════════════════════════════════════
-- GRCell (maliyye) — FULL MIGRATION: tables + RLS policies
-- Idempotent: safe to run multiple times.
-- ═══════════════════════════════════════════════════════════

-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── risks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  risk_code text,
  title text,
  description text,
  category text,
  triggers jsonb,
  level text,
  status text,
  owner_id text,
  owner_name text,
  due_date text,
  mitigation text,
  likelihood numeric,
  impact numeric,
  jira_issue_key text,
  jira_issue_status text,
  jira_last_sync text,
  jira_project_key text,
  workflow_step text,
  approval_status text,
  created_by text,
  created_by_name text,
  inherent_likelihood numeric,
  inherent_impact numeric,
  control_mapped_ids jsonb,
  control_effectiveness text,
  residual_likelihood numeric,
  residual_impact numeric,
  residual_level text,
  treatment_plan text,
  treatment_approved boolean,
  treatment_approval_note text,
  treatment_approved_by text,
  treatment_approved_at text,
  action_plan text,
  validation_evidence text,
  escalation_level text,
  sub_category text,
  owner_dept text,
  owner_role text,
  notes text,
  implementation_date text,
  revision_changes text,
  confidentiality numeric,
  integrity numeric,
  availability numeric,
  operational_impact numeric,
  financial_impact numeric,
  reputation_impact numeric,
  compliance_impact numeric,
  business_process_impact numeric,
  hse_impact numeric,
  strategy_impact numeric,
  target_residual_risk text,
  control_design numeric,
  control_implementation numeric,
  control_design_compliance numeric,
  control_design_strength numeric,
  control_design_timeliness numeric,
  control_implementation_relevance numeric,
  control_implementation_sustainability numeric,
  control_implementation_traceability numeric
);

ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "risks_insert" ON public.risks;
CREATE POLICY "risks_insert" ON public.risks
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "risks_select_org" ON public.risks;
CREATE POLICY "risks_select_org" ON public.risks
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "risks_update_org" ON public.risks;
CREATE POLICY "risks_update_org" ON public.risks
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "risks_delete_org" ON public.risks;
CREATE POLICY "risks_delete_org" ON public.risks
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── incidents ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text,
  description text,
  severity text,
  status text,
  workflow_stage text,
  assigned_to text,
  assigned_name text,
  reported_by text,
  reporter_name text,
  reporter_email text,
  reporter_structure text,
  occurrence_datetime text,
  discovery_datetime text,
  likelihood numeric,
  impact numeric,
  loss_effect text,
  loss_amount numeric,
  loss_currency text,
  attached_files jsonb,
  root_cause text,
  root_cause_category text,
  investigation_notes text,
  investigation_lead text,
  investigation_members jsonb,
  investigation_start text,
  investigation_end text,
  affected_systems jsonb,
  affected_departments jsonb,
  acknowledged_at text,
  sla_due_date text,
  forwarded_at text,
  forwarded_to text,
  assigned_dept text,
  resolution_assignee text,
  resolution_assignee_name text,
  ero_note text,
  risk_id text,
  control_id text,
  process_id text,
  reporter_person text,
  risk_category text,
  incident_category text,
  incident_control_assessment jsonb
);

ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incidents_insert" ON public.incidents;
CREATE POLICY "incidents_insert" ON public.incidents
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "incidents_select_org" ON public.incidents;
CREATE POLICY "incidents_select_org" ON public.incidents
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "incidents_update_org" ON public.incidents;
CREATE POLICY "incidents_update_org" ON public.incidents
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "incidents_delete_org" ON public.incidents;
CREATE POLICY "incidents_delete_org" ON public.incidents
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── controls ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  framework text,
  control_id text,
  title text,
  description text,
  status text,
  evidence_url text,
  evidence_note text,
  reviewed_at text,
  reviewed_by text,
  req_id text,
  control_type text,
  classification text,
  objective text,
  owner_id text,
  owner_dept text,
  systems_tools jsonb,
  execution_frequency text,
  execution_detail text,
  evidence_requirements text,
  kci_definition text,
  effectiveness_rating text,
  design_effectiveness text,
  operating_effectiveness text,
  last_tested_at text,
  next_test_date text,
  approval_status text,
  approved_by text,
  approved_at text,
  is_live boolean,
  live_date text,
  version numeric,
  change_history jsonb
);

ALTER TABLE public.controls ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.controls ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.controls ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.controls ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "controls_insert" ON public.controls;
CREATE POLICY "controls_insert" ON public.controls
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "controls_select_org" ON public.controls;
CREATE POLICY "controls_select_org" ON public.controls
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "controls_update_org" ON public.controls;
CREATE POLICY "controls_update_org" ON public.controls
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "controls_delete_org" ON public.controls;
CREATE POLICY "controls_delete_org" ON public.controls
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── audits ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text,
  scope text,
  status text,
  auditor_id text,
  auditor_name text,
  start_date text,
  end_date text
);

ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audits_insert" ON public.audits;
CREATE POLICY "audits_insert" ON public.audits
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "audits_select_org" ON public.audits;
CREATE POLICY "audits_select_org" ON public.audits
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "audits_update_org" ON public.audits;
CREATE POLICY "audits_update_org" ON public.audits
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "audits_delete_org" ON public.audits;
CREATE POLICY "audits_delete_org" ON public.audits
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── audit_findings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  audit_id text,
  title text,
  description text,
  severity text,
  recommendation text,
  status text
);

ALTER TABLE public.audit_findings ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.audit_findings ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.audit_findings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.audit_findings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_findings_insert" ON public.audit_findings;
CREATE POLICY "audit_findings_insert" ON public.audit_findings
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "audit_findings_select_org" ON public.audit_findings;
CREATE POLICY "audit_findings_select_org" ON public.audit_findings
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "audit_findings_update_org" ON public.audit_findings;
CREATE POLICY "audit_findings_update_org" ON public.audit_findings
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "audit_findings_delete_org" ON public.audit_findings;
CREATE POLICY "audit_findings_delete_org" ON public.audit_findings
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── vendors ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text,
  category text,
  risk_score numeric,
  contract_renewal text,
  contact_email text,
  contact_name text,
  status text,
  ai_summary text
);

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_insert" ON public.vendors;
CREATE POLICY "vendors_insert" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vendors_select_org" ON public.vendors;
CREATE POLICY "vendors_select_org" ON public.vendors
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "vendors_update_org" ON public.vendors;
CREATE POLICY "vendors_update_org" ON public.vendors
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "vendors_delete_org" ON public.vendors;
CREATE POLICY "vendors_delete_org" ON public.vendors
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── activities ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id text,
  user_name text,
  action text,
  entity_type text,
  entity_id text,
  entity_title text
);

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_insert" ON public.activities;
CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "activities_select_org" ON public.activities;
CREATE POLICY "activities_select_org" ON public.activities
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "activities_update_org" ON public.activities;
CREATE POLICY "activities_update_org" ON public.activities
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "activities_delete_org" ON public.activities;
CREATE POLICY "activities_delete_org" ON public.activities
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── policies ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  policy_id text,
  title text,
  description text,
  category text,
  version text,
  status text,
  owner_id text,
  owner_dept text,
  sponsor_id text,
  effective_date text,
  review_date text,
  expiry_date text,
  last_reviewed_at text,
  submitted_at text,
  committee_reviewed_at text,
  approved_by text,
  approved_at text,
  published_at text,
  body text,
  document_url text,
  linked_framework text,
  linked_control_ids jsonb,
  linked_requirement_ids jsonb,
  change_summary text,
  change_history jsonb
);

ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policies_insert" ON public.policies;
CREATE POLICY "policies_insert" ON public.policies
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "policies_select_org" ON public.policies;
CREATE POLICY "policies_select_org" ON public.policies
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "policies_update_org" ON public.policies;
CREATE POLICY "policies_update_org" ON public.policies
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "policies_delete_org" ON public.policies;
CREATE POLICY "policies_delete_org" ON public.policies
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── policy_approvals ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.policy_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  policy_id text,
  stage text,
  action text,
  actor_id text,
  actor_name text,
  comments text
);

ALTER TABLE public.policy_approvals ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.policy_approvals ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.policy_approvals ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.policy_approvals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.policy_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_approvals_insert" ON public.policy_approvals;
CREATE POLICY "policy_approvals_insert" ON public.policy_approvals
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "policy_approvals_select_org" ON public.policy_approvals;
CREATE POLICY "policy_approvals_select_org" ON public.policy_approvals
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "policy_approvals_update_org" ON public.policy_approvals;
CREATE POLICY "policy_approvals_update_org" ON public.policy_approvals
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "policy_approvals_delete_org" ON public.policy_approvals;
CREATE POLICY "policy_approvals_delete_org" ON public.policy_approvals
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── audit_finding_workflow ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_finding_workflow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  audit_finding_id text,
  step text,
  status text,
  classification text,
  priority text,
  immediate_correction_required boolean,
  immediate_correction_note text,
  immediate_correction_by text,
  immediate_correction_at text,
  verification_note text,
  verified_by text,
  verified_at text,
  investigation_note text,
  evidence_review_note text,
  evidence_url text,
  root_cause text,
  root_cause_category text,
  root_cause_analyst_id text,
  compliance_impact_note text,
  compliance_frameworks_affected jsonb,
  corrective_action_required boolean,
  action_plan text,
  assigned_to text,
  due_date text,
  implementation_note text,
  implementation_evidence_url text,
  implemented_at text,
  validation_note text,
  validated_by text,
  validated_at text,
  risk_creation_required boolean,
  risk_created_id text,
  closed_at text,
  finding_title text,
  finding_severity text,
  finding_recommendation text
);

ALTER TABLE public.audit_finding_workflow ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.audit_finding_workflow ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.audit_finding_workflow ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.audit_finding_workflow ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.audit_finding_workflow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_finding_workflow_insert" ON public.audit_finding_workflow;
CREATE POLICY "audit_finding_workflow_insert" ON public.audit_finding_workflow
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "audit_finding_workflow_select_org" ON public.audit_finding_workflow;
CREATE POLICY "audit_finding_workflow_select_org" ON public.audit_finding_workflow
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "audit_finding_workflow_update_org" ON public.audit_finding_workflow;
CREATE POLICY "audit_finding_workflow_update_org" ON public.audit_finding_workflow
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "audit_finding_workflow_delete_org" ON public.audit_finding_workflow;
CREATE POLICY "audit_finding_workflow_delete_org" ON public.audit_finding_workflow
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── nirap_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nirap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  nirap_id text,
  title text,
  description text,
  type text,
  step text,
  status text,
  classification text,
  business_unit text,
  urgency text,
  initial_screening_note text,
  screening_outcome text,
  impact_assessment text,
  affected_systems jsonb,
  affected_processes jsonb,
  control_gap_summary text,
  gaps_identified boolean,
  risk_assessment_note text,
  compliance_note text,
  linked_risk_id text,
  approval_required boolean,
  approver_id text,
  approved_at text,
  committee_decision text,
  committee_notes text,
  implementation_plan text,
  implementation_owner text,
  implementation_due text,
  implementation_note text,
  validation_note text,
  closed_at text
);

ALTER TABLE public.nirap_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.nirap_items ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.nirap_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.nirap_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.nirap_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nirap_items_insert" ON public.nirap_items;
CREATE POLICY "nirap_items_insert" ON public.nirap_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "nirap_items_select_org" ON public.nirap_items;
CREATE POLICY "nirap_items_select_org" ON public.nirap_items
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "nirap_items_update_org" ON public.nirap_items;
CREATE POLICY "nirap_items_update_org" ON public.nirap_items
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "nirap_items_delete_org" ON public.nirap_items;
CREATE POLICY "nirap_items_delete_org" ON public.nirap_items
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── grc_intake_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grc_intake_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  type text,
  title text,
  description text,
  classification text,
  mapped_control_ids jsonb,
  evidence_url text,
  evidence_note text,
  status text,
  step text,
  gap_identified boolean,
  risk_creation_required boolean,
  risk_created_id text,
  inherent_likelihood numeric,
  inherent_impact numeric,
  inherent_risk_level text,
  control_effectiveness text,
  residual_likelihood numeric,
  residual_impact numeric,
  residual_risk_level text,
  risk_owner_id text,
  risk_owner_reviewed_at text,
  mgt_reviewed_at text,
  mgt_reviewer_id text,
  appetite_decision text,
  action_plan text,
  assigned_to text,
  implementation_due text,
  implementation_evidence_url text,
  validation_note text,
  validated_at text,
  validated_by text,
  post_treatment_appetite text,
  escalated_at text,
  committee_decision text,
  closed_at text
);

ALTER TABLE public.grc_intake_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.grc_intake_items ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.grc_intake_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.grc_intake_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.grc_intake_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grc_intake_items_insert" ON public.grc_intake_items;
CREATE POLICY "grc_intake_items_insert" ON public.grc_intake_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "grc_intake_items_select_org" ON public.grc_intake_items;
CREATE POLICY "grc_intake_items_select_org" ON public.grc_intake_items
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "grc_intake_items_update_org" ON public.grc_intake_items;
CREATE POLICY "grc_intake_items_update_org" ON public.grc_intake_items
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "grc_intake_items_delete_org" ON public.grc_intake_items;
CREATE POLICY "grc_intake_items_delete_org" ON public.grc_intake_items
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  full_name text,
  email text,
  role text,
  avatar_url text,
  is_active boolean
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_select_org" ON public.profiles;
CREATE POLICY "profiles_select_org" ON public.profiles
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "profiles_update_org" ON public.profiles;
CREATE POLICY "profiles_update_org" ON public.profiles
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "profiles_delete_org" ON public.profiles;
CREATE POLICY "profiles_delete_org" ON public.profiles
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── organizations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text,
  plan text,
  subscription_status text,
  subscription_expires_at text,
  is_active boolean,
  contact_email text,
  seats text
);

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "organizations_select_org" ON public.organizations;
CREATE POLICY "organizations_select_org" ON public.organizations
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "organizations_update_org" ON public.organizations;
CREATE POLICY "organizations_update_org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "organizations_delete_org" ON public.organizations;
CREATE POLICY "organizations_delete_org" ON public.organizations
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── org_units ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text,
  code text,
  type text,
  parent_id text,
  head_user_id text,
  head_role text,
  order_index numeric
);

ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_units_insert" ON public.org_units;
CREATE POLICY "org_units_insert" ON public.org_units
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "org_units_select_org" ON public.org_units;
CREATE POLICY "org_units_select_org" ON public.org_units
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_units_update_org" ON public.org_units;
CREATE POLICY "org_units_update_org" ON public.org_units
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_units_delete_org" ON public.org_units;
CREATE POLICY "org_units_delete_org" ON public.org_units
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── access_exceptions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id text,
  user_name text,
  entity_type text,
  entity_label text,
  permission text,
  reason text,
  starts_at text,
  expires_at text,
  revoked boolean
);

ALTER TABLE public.access_exceptions ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.access_exceptions ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.access_exceptions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.access_exceptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.access_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_exceptions_insert" ON public.access_exceptions;
CREATE POLICY "access_exceptions_insert" ON public.access_exceptions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "access_exceptions_select_org" ON public.access_exceptions;
CREATE POLICY "access_exceptions_select_org" ON public.access_exceptions
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "access_exceptions_update_org" ON public.access_exceptions;
CREATE POLICY "access_exceptions_update_org" ON public.access_exceptions
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "access_exceptions_delete_org" ON public.access_exceptions;
CREATE POLICY "access_exceptions_delete_org" ON public.access_exceptions
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── processes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "processes_insert" ON public.processes;
CREATE POLICY "processes_insert" ON public.processes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "processes_select_org" ON public.processes;
CREATE POLICY "processes_select_org" ON public.processes
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "processes_update_org" ON public.processes;
CREATE POLICY "processes_update_org" ON public.processes
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "processes_delete_org" ON public.processes;
CREATE POLICY "processes_delete_org" ON public.processes
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── compliance_obligations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  obligation_code text,
  title text,
  description text,
  compliance_condition text,
  source text,
  source_type text,
  obligation_type text,
  source_reference text,
  source_url text,
  regulator text,
  accountable_owner text,
  responsible_party text,
  responsible_role text,
  responsible_structure text,
  applicable_depts jsonb,
  evidence text,
  status text,
  criticality text,
  primary_risk_id text,
  noncompliance_risk text,
  materialized_risk_id text,
  effective_date text,
  next_review_date text
);

ALTER TABLE public.compliance_obligations ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.compliance_obligations ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.compliance_obligations ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.compliance_obligations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.compliance_obligations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_obligations_insert" ON public.compliance_obligations;
CREATE POLICY "compliance_obligations_insert" ON public.compliance_obligations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "compliance_obligations_select_org" ON public.compliance_obligations;
CREATE POLICY "compliance_obligations_select_org" ON public.compliance_obligations
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "compliance_obligations_update_org" ON public.compliance_obligations;
CREATE POLICY "compliance_obligations_update_org" ON public.compliance_obligations
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "compliance_obligations_delete_org" ON public.compliance_obligations;
CREATE POLICY "compliance_obligations_delete_org" ON public.compliance_obligations
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── internal_documents ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.internal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  doc_uid text,
  name text,
  doc_type text,
  doc_number text,
  version text,
  effective_date text,
  approved_by text,
  author_dept text,
  participant_depts jsonb
);

ALTER TABLE public.internal_documents ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.internal_documents ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.internal_documents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.internal_documents ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.internal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internal_documents_insert" ON public.internal_documents;
CREATE POLICY "internal_documents_insert" ON public.internal_documents
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "internal_documents_select_org" ON public.internal_documents;
CREATE POLICY "internal_documents_select_org" ON public.internal_documents
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "internal_documents_update_org" ON public.internal_documents;
CREATE POLICY "internal_documents_update_org" ON public.internal_documents
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "internal_documents_delete_org" ON public.internal_documents;
CREATE POLICY "internal_documents_delete_org" ON public.internal_documents
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── internal_policies ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.internal_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  code text,
  policy_name text,
  document_type text,
  approving_body text,
  responsible_structure text,
  responsible_person text,
  version text,
  document_number text,
  publish_time text,
  validity_period text,
  status text
);

ALTER TABLE public.internal_policies ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.internal_policies ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.internal_policies ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.internal_policies ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.internal_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internal_policies_insert" ON public.internal_policies;
CREATE POLICY "internal_policies_insert" ON public.internal_policies
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "internal_policies_select_org" ON public.internal_policies;
CREATE POLICY "internal_policies_select_org" ON public.internal_policies
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "internal_policies_update_org" ON public.internal_policies;
CREATE POLICY "internal_policies_update_org" ON public.internal_policies
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "internal_policies_delete_org" ON public.internal_policies;
CREATE POLICY "internal_policies_delete_org" ON public.internal_policies
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── kci_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kci_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  control_id text,
  name text,
  description text,
  control_type text,
  control_owner_id text,
  objective text,
  test_method text,
  frequency text,
  current_value numeric,
  success_rate numeric,
  failure_rate numeric,
  effectiveness_rating numeric,
  threshold_effective text,
  threshold_partial text,
  threshold_ineffective text,
  current_status text,
  evidence_source text,
  last_test_date text,
  next_test_date text
);

ALTER TABLE public.kci_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.kci_items ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kci_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.kci_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.kci_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kci_items_insert" ON public.kci_items;
CREATE POLICY "kci_items_insert" ON public.kci_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "kci_items_select_org" ON public.kci_items;
CREATE POLICY "kci_items_select_org" ON public.kci_items
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "kci_items_update_org" ON public.kci_items;
CREATE POLICY "kci_items_update_org" ON public.kci_items
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "kci_items_delete_org" ON public.kci_items;
CREATE POLICY "kci_items_delete_org" ON public.kci_items
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── kpi_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kpi_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text,
  related_process text,
  process_owner_id text,
  description text,
  formula text,
  target_value numeric,
  current_value numeric,
  previous_value numeric,
  trend text,
  threshold_green text,
  threshold_amber text,
  threshold_red text,
  performance_status text,
  sla_target text,
  frequency text,
  owner_id text,
  last_updated_at text,
  next_review_date text
);

ALTER TABLE public.kpi_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.kpi_items ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kpi_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.kpi_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.kpi_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kpi_items_insert" ON public.kpi_items;
CREATE POLICY "kpi_items_insert" ON public.kpi_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "kpi_items_select_org" ON public.kpi_items;
CREATE POLICY "kpi_items_select_org" ON public.kpi_items
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "kpi_items_update_org" ON public.kpi_items;
CREATE POLICY "kpi_items_update_org" ON public.kpi_items
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "kpi_items_delete_org" ON public.kpi_items;
CREATE POLICY "kpi_items_delete_org" ON public.kpi_items
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── kri_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kri_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  kri_id text,
  name text,
  description text,
  related_risk_id text,
  risk_category text,
  formula text,
  data_source text,
  unit text,
  frequency text,
  current_value numeric,
  previous_value numeric,
  trend text,
  threshold_green text,
  threshold_amber text,
  threshold_red text,
  current_status text,
  appetite_limit text,
  appetite_breach boolean,
  risk_owner text,
  note text,
  owner_id text,
  data_owner_id text,
  last_updated_at text,
  next_review_date text,
  ras_id text
);

ALTER TABLE public.kri_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.kri_items ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kri_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.kri_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.kri_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kri_items_insert" ON public.kri_items;
CREATE POLICY "kri_items_insert" ON public.kri_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "kri_items_select_org" ON public.kri_items;
CREATE POLICY "kri_items_select_org" ON public.kri_items
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "kri_items_update_org" ON public.kri_items;
CREATE POLICY "kri_items_update_org" ON public.kri_items
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "kri_items_delete_org" ON public.kri_items;
CREATE POLICY "kri_items_delete_org" ON public.kri_items
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── monitoring_alerts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  source_type text,
  source_id text,
  source_name text,
  alert_level text,
  message text,
  acknowledged boolean,
  action_required boolean,
  action_plan text,
  acknowledged_at text,
  acknowledged_by text
);

ALTER TABLE public.monitoring_alerts ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.monitoring_alerts ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.monitoring_alerts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.monitoring_alerts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monitoring_alerts_insert" ON public.monitoring_alerts;
CREATE POLICY "monitoring_alerts_insert" ON public.monitoring_alerts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "monitoring_alerts_select_org" ON public.monitoring_alerts;
CREATE POLICY "monitoring_alerts_select_org" ON public.monitoring_alerts
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "monitoring_alerts_update_org" ON public.monitoring_alerts;
CREATE POLICY "monitoring_alerts_update_org" ON public.monitoring_alerts
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "monitoring_alerts_delete_org" ON public.monitoring_alerts;
CREATE POLICY "monitoring_alerts_delete_org" ON public.monitoring_alerts
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── whistleblow_reports ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whistleblow_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  code text,
  source text,
  subject text,
  body_iv text,
  body_cipher text,
  status text,
  risk_id text,
  received_at text
);

ALTER TABLE public.whistleblow_reports ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.whistleblow_reports ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.whistleblow_reports ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.whistleblow_reports ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.whistleblow_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whistleblow_reports_insert" ON public.whistleblow_reports;
CREATE POLICY "whistleblow_reports_insert" ON public.whistleblow_reports
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "whistleblow_reports_select_org" ON public.whistleblow_reports;
CREATE POLICY "whistleblow_reports_select_org" ON public.whistleblow_reports
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "whistleblow_reports_update_org" ON public.whistleblow_reports;
CREATE POLICY "whistleblow_reports_update_org" ON public.whistleblow_reports
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "whistleblow_reports_delete_org" ON public.whistleblow_reports;
CREATE POLICY "whistleblow_reports_delete_org" ON public.whistleblow_reports
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── stress_tests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stress_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  code text,
  scenario text,
  description text,
  assumption text,
  result_impact text,
  outcome text,
  tested_at text,
  owner text
);

ALTER TABLE public.stress_tests ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.stress_tests ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.stress_tests ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.stress_tests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.stress_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stress_tests_insert" ON public.stress_tests;
CREATE POLICY "stress_tests_insert" ON public.stress_tests
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stress_tests_select_org" ON public.stress_tests;
CREATE POLICY "stress_tests_select_org" ON public.stress_tests
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "stress_tests_update_org" ON public.stress_tests;
CREATE POLICY "stress_tests_update_org" ON public.stress_tests
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "stress_tests_delete_org" ON public.stress_tests;
CREATE POLICY "stress_tests_delete_org" ON public.stress_tests
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── financial_risks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_risks ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.financial_risks ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.financial_risks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.financial_risks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.financial_risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_risks_insert" ON public.financial_risks;
CREATE POLICY "financial_risks_insert" ON public.financial_risks
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "financial_risks_select_org" ON public.financial_risks;
CREATE POLICY "financial_risks_select_org" ON public.financial_risks
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "financial_risks_update_org" ON public.financial_risks;
CREATE POLICY "financial_risks_update_org" ON public.financial_risks
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "financial_risks_delete_org" ON public.financial_risks;
CREATE POLICY "financial_risks_delete_org" ON public.financial_risks
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── infosec_risks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.infosec_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  code text,
  process text,
  asset text,
  threat text,
  vulnerability text,
  risk_description text,
  risk_trigger text,
  probability numeric,
  impacts jsonb,
  inherent_score numeric,
  current_control_id text,
  residual_probability numeric,
  residual_impact numeric,
  residual_score numeric,
  treatment_plan text,
  mitigation_plan text,
  deadline text,
  responsible_structure text,
  responsible_person text
);

ALTER TABLE public.infosec_risks ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.infosec_risks ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.infosec_risks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.infosec_risks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.infosec_risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "infosec_risks_insert" ON public.infosec_risks;
CREATE POLICY "infosec_risks_insert" ON public.infosec_risks
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "infosec_risks_select_org" ON public.infosec_risks;
CREATE POLICY "infosec_risks_select_org" ON public.infosec_risks
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "infosec_risks_update_org" ON public.infosec_risks;
CREATE POLICY "infosec_risks_update_org" ON public.infosec_risks
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "infosec_risks_delete_org" ON public.infosec_risks;
CREATE POLICY "infosec_risks_delete_org" ON public.infosec_risks
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── risk_appetite_statements ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.risk_appetite_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.risk_appetite_statements ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.risk_appetite_statements ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.risk_appetite_statements ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.risk_appetite_statements ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.risk_appetite_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "risk_appetite_statements_insert" ON public.risk_appetite_statements;
CREATE POLICY "risk_appetite_statements_insert" ON public.risk_appetite_statements
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "risk_appetite_statements_select_org" ON public.risk_appetite_statements;
CREATE POLICY "risk_appetite_statements_select_org" ON public.risk_appetite_statements
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "risk_appetite_statements_update_org" ON public.risk_appetite_statements;
CREATE POLICY "risk_appetite_statements_update_org" ON public.risk_appetite_statements
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "risk_appetite_statements_delete_org" ON public.risk_appetite_statements;
CREATE POLICY "risk_appetite_statements_delete_org" ON public.risk_appetite_statements
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── compliance_assessments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.compliance_assessments ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.compliance_assessments ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.compliance_assessments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.compliance_assessments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.compliance_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_assessments_insert" ON public.compliance_assessments;
CREATE POLICY "compliance_assessments_insert" ON public.compliance_assessments
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "compliance_assessments_select_org" ON public.compliance_assessments;
CREATE POLICY "compliance_assessments_select_org" ON public.compliance_assessments
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "compliance_assessments_update_org" ON public.compliance_assessments;
CREATE POLICY "compliance_assessments_update_org" ON public.compliance_assessments
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "compliance_assessments_delete_org" ON public.compliance_assessments;
CREATE POLICY "compliance_assessments_delete_org" ON public.compliance_assessments
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── compliance_assessment_history ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_assessment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  assessment_id text,
  result text,
  observed_state text,
  changed_by text
);

ALTER TABLE public.compliance_assessment_history ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.compliance_assessment_history ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.compliance_assessment_history ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.compliance_assessment_history ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.compliance_assessment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_assessment_history_insert" ON public.compliance_assessment_history;
CREATE POLICY "compliance_assessment_history_insert" ON public.compliance_assessment_history
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "compliance_assessment_history_select_org" ON public.compliance_assessment_history;
CREATE POLICY "compliance_assessment_history_select_org" ON public.compliance_assessment_history
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "compliance_assessment_history_update_org" ON public.compliance_assessment_history;
CREATE POLICY "compliance_assessment_history_update_org" ON public.compliance_assessment_history
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "compliance_assessment_history_delete_org" ON public.compliance_assessment_history;
CREATE POLICY "compliance_assessment_history_delete_org" ON public.compliance_assessment_history
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── compliance_risks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  code text,
  obligation_id text,
  requirement text,
  risk_description text,
  likelihood numeric,
  impact numeric,
  inherent_score numeric,
  risk_trigger text,
  control_id text,
  mitigation_plan text,
  treatment_plan text
);

ALTER TABLE public.compliance_risks ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.compliance_risks ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.compliance_risks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.compliance_risks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.compliance_risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_risks_insert" ON public.compliance_risks;
CREATE POLICY "compliance_risks_insert" ON public.compliance_risks
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "compliance_risks_select_org" ON public.compliance_risks;
CREATE POLICY "compliance_risks_select_org" ON public.compliance_risks
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "compliance_risks_update_org" ON public.compliance_risks;
CREATE POLICY "compliance_risks_update_org" ON public.compliance_risks
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "compliance_risks_delete_org" ON public.compliance_risks;
CREATE POLICY "compliance_risks_delete_org" ON public.compliance_risks
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── control_mappings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.control_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.control_mappings ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.control_mappings ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.control_mappings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.control_mappings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.control_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "control_mappings_insert" ON public.control_mappings;
CREATE POLICY "control_mappings_insert" ON public.control_mappings
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "control_mappings_select_org" ON public.control_mappings;
CREATE POLICY "control_mappings_select_org" ON public.control_mappings
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "control_mappings_update_org" ON public.control_mappings;
CREATE POLICY "control_mappings_update_org" ON public.control_mappings
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "control_mappings_delete_org" ON public.control_mappings;
CREATE POLICY "control_mappings_delete_org" ON public.control_mappings
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── interested_parties ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interested_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.interested_parties ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.interested_parties ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.interested_parties ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.interested_parties ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.interested_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interested_parties_insert" ON public.interested_parties;
CREATE POLICY "interested_parties_insert" ON public.interested_parties
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "interested_parties_select_org" ON public.interested_parties;
CREATE POLICY "interested_parties_select_org" ON public.interested_parties
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "interested_parties_update_org" ON public.interested_parties;
CREATE POLICY "interested_parties_update_org" ON public.interested_parties
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "interested_parties_delete_org" ON public.interested_parties;
CREATE POLICY "interested_parties_delete_org" ON public.interested_parties
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── regulatory_changes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.regulatory_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.regulatory_changes ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.regulatory_changes ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.regulatory_changes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.regulatory_changes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.regulatory_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regulatory_changes_insert" ON public.regulatory_changes;
CREATE POLICY "regulatory_changes_insert" ON public.regulatory_changes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "regulatory_changes_select_org" ON public.regulatory_changes;
CREATE POLICY "regulatory_changes_select_org" ON public.regulatory_changes
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "regulatory_changes_update_org" ON public.regulatory_changes;
CREATE POLICY "regulatory_changes_update_org" ON public.regulatory_changes
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "regulatory_changes_delete_org" ON public.regulatory_changes;
CREATE POLICY "regulatory_changes_delete_org" ON public.regulatory_changes
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── regulatory_change_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.regulatory_change_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.regulatory_change_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.regulatory_change_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.regulatory_change_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.regulatory_change_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.regulatory_change_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regulatory_change_links_insert" ON public.regulatory_change_links;
CREATE POLICY "regulatory_change_links_insert" ON public.regulatory_change_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "regulatory_change_links_select_org" ON public.regulatory_change_links;
CREATE POLICY "regulatory_change_links_select_org" ON public.regulatory_change_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "regulatory_change_links_update_org" ON public.regulatory_change_links;
CREATE POLICY "regulatory_change_links_update_org" ON public.regulatory_change_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "regulatory_change_links_delete_org" ON public.regulatory_change_links;
CREATE POLICY "regulatory_change_links_delete_org" ON public.regulatory_change_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── obligation_audit_logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.obligation_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.obligation_audit_logs ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.obligation_audit_logs ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.obligation_audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.obligation_audit_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.obligation_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obligation_audit_logs_insert" ON public.obligation_audit_logs;
CREATE POLICY "obligation_audit_logs_insert" ON public.obligation_audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "obligation_audit_logs_select_org" ON public.obligation_audit_logs;
CREATE POLICY "obligation_audit_logs_select_org" ON public.obligation_audit_logs
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "obligation_audit_logs_update_org" ON public.obligation_audit_logs;
CREATE POLICY "obligation_audit_logs_update_org" ON public.obligation_audit_logs
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "obligation_audit_logs_delete_org" ON public.obligation_audit_logs;
CREATE POLICY "obligation_audit_logs_delete_org" ON public.obligation_audit_logs
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── obligation_control_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.obligation_control_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.obligation_control_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.obligation_control_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.obligation_control_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.obligation_control_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.obligation_control_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obligation_control_links_insert" ON public.obligation_control_links;
CREATE POLICY "obligation_control_links_insert" ON public.obligation_control_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "obligation_control_links_select_org" ON public.obligation_control_links;
CREATE POLICY "obligation_control_links_select_org" ON public.obligation_control_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "obligation_control_links_update_org" ON public.obligation_control_links;
CREATE POLICY "obligation_control_links_update_org" ON public.obligation_control_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "obligation_control_links_delete_org" ON public.obligation_control_links;
CREATE POLICY "obligation_control_links_delete_org" ON public.obligation_control_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── obligation_policy_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.obligation_policy_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.obligation_policy_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.obligation_policy_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.obligation_policy_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.obligation_policy_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.obligation_policy_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obligation_policy_links_insert" ON public.obligation_policy_links;
CREATE POLICY "obligation_policy_links_insert" ON public.obligation_policy_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "obligation_policy_links_select_org" ON public.obligation_policy_links;
CREATE POLICY "obligation_policy_links_select_org" ON public.obligation_policy_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "obligation_policy_links_update_org" ON public.obligation_policy_links;
CREATE POLICY "obligation_policy_links_update_org" ON public.obligation_policy_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "obligation_policy_links_delete_org" ON public.obligation_policy_links;
CREATE POLICY "obligation_policy_links_delete_org" ON public.obligation_policy_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── obligation_risk_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.obligation_risk_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.obligation_risk_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.obligation_risk_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.obligation_risk_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.obligation_risk_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.obligation_risk_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obligation_risk_links_insert" ON public.obligation_risk_links;
CREATE POLICY "obligation_risk_links_insert" ON public.obligation_risk_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "obligation_risk_links_select_org" ON public.obligation_risk_links;
CREATE POLICY "obligation_risk_links_select_org" ON public.obligation_risk_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "obligation_risk_links_update_org" ON public.obligation_risk_links;
CREATE POLICY "obligation_risk_links_update_org" ON public.obligation_risk_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "obligation_risk_links_delete_org" ON public.obligation_risk_links;
CREATE POLICY "obligation_risk_links_delete_org" ON public.obligation_risk_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── party_obligation_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.party_obligation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.party_obligation_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.party_obligation_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.party_obligation_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.party_obligation_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.party_obligation_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "party_obligation_links_insert" ON public.party_obligation_links;
CREATE POLICY "party_obligation_links_insert" ON public.party_obligation_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "party_obligation_links_select_org" ON public.party_obligation_links;
CREATE POLICY "party_obligation_links_select_org" ON public.party_obligation_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "party_obligation_links_update_org" ON public.party_obligation_links;
CREATE POLICY "party_obligation_links_update_org" ON public.party_obligation_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "party_obligation_links_delete_org" ON public.party_obligation_links;
CREATE POLICY "party_obligation_links_delete_org" ON public.party_obligation_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── process_control_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.process_control_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.process_control_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.process_control_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.process_control_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.process_control_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.process_control_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "process_control_links_insert" ON public.process_control_links;
CREATE POLICY "process_control_links_insert" ON public.process_control_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "process_control_links_select_org" ON public.process_control_links;
CREATE POLICY "process_control_links_select_org" ON public.process_control_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_control_links_update_org" ON public.process_control_links;
CREATE POLICY "process_control_links_update_org" ON public.process_control_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_control_links_delete_org" ON public.process_control_links;
CREATE POLICY "process_control_links_delete_org" ON public.process_control_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── process_document_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.process_document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.process_document_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.process_document_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.process_document_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.process_document_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.process_document_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "process_document_links_insert" ON public.process_document_links;
CREATE POLICY "process_document_links_insert" ON public.process_document_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "process_document_links_select_org" ON public.process_document_links;
CREATE POLICY "process_document_links_select_org" ON public.process_document_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_document_links_update_org" ON public.process_document_links;
CREATE POLICY "process_document_links_update_org" ON public.process_document_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_document_links_delete_org" ON public.process_document_links;
CREATE POLICY "process_document_links_delete_org" ON public.process_document_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── process_obligation_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.process_obligation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.process_obligation_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.process_obligation_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.process_obligation_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.process_obligation_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.process_obligation_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "process_obligation_links_insert" ON public.process_obligation_links;
CREATE POLICY "process_obligation_links_insert" ON public.process_obligation_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "process_obligation_links_select_org" ON public.process_obligation_links;
CREATE POLICY "process_obligation_links_select_org" ON public.process_obligation_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_obligation_links_update_org" ON public.process_obligation_links;
CREATE POLICY "process_obligation_links_update_org" ON public.process_obligation_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_obligation_links_delete_org" ON public.process_obligation_links;
CREATE POLICY "process_obligation_links_delete_org" ON public.process_obligation_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── process_policy_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.process_policy_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.process_policy_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.process_policy_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.process_policy_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.process_policy_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.process_policy_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "process_policy_links_insert" ON public.process_policy_links;
CREATE POLICY "process_policy_links_insert" ON public.process_policy_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "process_policy_links_select_org" ON public.process_policy_links;
CREATE POLICY "process_policy_links_select_org" ON public.process_policy_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_policy_links_update_org" ON public.process_policy_links;
CREATE POLICY "process_policy_links_update_org" ON public.process_policy_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_policy_links_delete_org" ON public.process_policy_links;
CREATE POLICY "process_policy_links_delete_org" ON public.process_policy_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── process_risk_links ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.process_risk_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.process_risk_links ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.process_risk_links ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.process_risk_links ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.process_risk_links ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.process_risk_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "process_risk_links_insert" ON public.process_risk_links;
CREATE POLICY "process_risk_links_insert" ON public.process_risk_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "process_risk_links_select_org" ON public.process_risk_links;
CREATE POLICY "process_risk_links_select_org" ON public.process_risk_links
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_risk_links_update_org" ON public.process_risk_links;
CREATE POLICY "process_risk_links_update_org" ON public.process_risk_links
  FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "process_risk_links_delete_org" ON public.process_risk_links;
CREATE POLICY "process_risk_links_delete_org" ON public.process_risk_links
  FOR DELETE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
