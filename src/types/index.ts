// ─── Auth & Users ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'risk_manager' | 'auditor' | 'employee'

export interface UserProfile {
  id: string
  org_id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Organization {
  id: string
  name: string
  plan: 'starter' | 'professional' | 'enterprise'
  created_at: string
}

// ─── Organizational Structure ──────────────────────────────────────────────────

export type OrgUnitType = 'executive' | 'committee' | 'department' | 'division'

export interface OrgUnit {
  id: string
  org_id: string
  name: string
  code?: string // short department code, used as the Risk ID prefix (e.g. IT, CORP)
  type: OrgUnitType
  parent_id?: string | null
  head_user_id?: string | null // resolves to Risk Owner
  head_role?: string | null // resolves to owner_role
  order_index?: number
  created_at: string
  updated_at: string
}

// ─── Risks ───────────────────────────────────────────────────────────────────

export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical'
// RiskStatus is the single source of truth in lib/risk-status.ts
export type { RiskStatus } from '@/lib/risk-status'
import type { RiskStatus } from '@/lib/risk-status'
// RiskCategory is the single source of truth in lib/risk-categories.ts
export type { RiskCategory } from '@/lib/risk-categories'
import type { RiskCategory } from '@/lib/risk-categories'

// A control activity that mitigates a specific risk trigger. Hybrid: it may
// reference a library control (control_ref_id) or be free-text. Each control
// carries its own RCSA 6 sub-criteria so effectiveness is assessed per control.
export interface RiskControlActivity {
  id: string
  description: string
  control_ref_id?: string // optional link to controls.id (library)
  // Excel methodology: control effectiveness = Design (Dizayn) + Implementation (Tətbiqi), each 1-5 (1=Güclü best)
  design?: number
  implementation?: number
  // legacy 6 sub-criteria (kept for old data)
  design_compliance?: number
  design_strength?: number
  design_timeliness?: number
  impl_relevance?: number
  impl_sustainability?: number
  impl_traceability?: number
  score?: number // derived, persisted for display
  rating?: string // derived ControlRating, persisted for display
}

// A trigger (cause/threat) of a risk, with the controls that address it.
export interface RiskTrigger {
  id: string
  description: string
  controls: RiskControlActivity[]
}

export interface Risk {
  id: string
  risk_code?: string // human-readable, department-based unique id (e.g. IT-2026-001)
  org_id: string
  title: string
  description: string
  category: RiskCategory
  triggers?: RiskTrigger[]
  level: RiskLevel
  status: RiskStatus
  owner_id?: string
  owner_name?: string
  due_date?: string
  mitigation?: string
  likelihood: number   // 1-5
  impact: number       // 1-5
  created_at: string
  updated_at: string
  jira_issue_key?: string
  jira_issue_status?: string
  jira_last_sync?: string
  jira_project_key?: string
  workflow_step?: string
  inherent_likelihood?: number
  inherent_impact?: number
  control_mapped_ids?: string[]
  control_effectiveness?: 'effective' | 'partially_effective' | 'ineffective' | 'strong' | 'relatively_strong' | 'adequate' | 'relatively_adequate' | 'weak'
  residual_likelihood?: number
  residual_impact?: number
  residual_level?: RiskLevel
  treatment_plan?: string
  // Executive-director approval for a treatment that the matrix forbids
  treatment_approved?: boolean
  treatment_approval_note?: string
  treatment_approved_by?: string
  treatment_approved_at?: string
  action_plan?: string
  validation_evidence?: string
  escalation_level?: 'none' | 'committee' | 'board'
  
  // Expanded RCSA Fields (Excel Policy Integration)
  sub_category?: string
  owner_dept?: string
  owner_role?: string
  notes?: string
  implementation_date?: string
  revision_changes?: string
  confidentiality?: number
  integrity?: number
  availability?: number
  operational_impact?: number
  financial_impact?: number
  reputation_impact?: number
  compliance_impact?: number
  business_process_impact?: number
  hse_impact?: number
  strategy_impact?: number
  target_residual_risk?: string
  // Aggregate control effectiveness (derived from per-control triggers assessment)
  control_design?: number
  control_implementation?: number
  /** @deprecated superseded by per-control RCSA on RiskControlActivity (triggers). Kept for legacy data. */
  control_design_compliance?: number
  /** @deprecated see triggers[].controls */
  control_design_strength?: number
  /** @deprecated see triggers[].controls */
  control_design_timeliness?: number
  /** @deprecated see triggers[].controls */
  control_implementation_relevance?: number
  /** @deprecated see triggers[].controls */
  control_implementation_sustainability?: number
  /** @deprecated see triggers[].controls */
  control_implementation_traceability?: number
}

// ─── Incidents ───────────────────────────────────────────────────────────────

export type IncidentSeverity = 'minimal' | 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'
export type IncidentWorkflowStage = 'intake' | 'investigation' | 'resolution'
export type IncidentPriority = 'P1_critical' | 'P2_high' | 'P3_medium' | 'P4_low' | 'P5_minimal'

export interface AttachedFile {
  id: string
  name: string
  size: number
  type: string
  data_url?: string  // base64 for IndexedDB storage
  uploaded_at: string
}

export interface CorrectiveAction {
  id: string
  title: string
  description?: string
  assignee?: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'done'
  // CAPA branching (phase 27)
  kind?: 'collective' | 'preventive'        // immediate fix vs root-cause prevention
  control_mode?: 'improve_existing' | 'new_control'
  control_id?: string                       // existing control being improved
  created_control_id?: string               // pending control created from this action
}

export interface Incident {
  id: string
  org_id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  workflow_stage: IncidentWorkflowStage
  assigned_to?: string
  assigned_name?: string
  reported_by?: string
  reporter_name?: string
  // ── Intake fields (Pəncərə 1) ──────────────────────────
  reporter_email?: string
  reporter_structure?: string         // auto from email/org
  occurrence_datetime?: string        // manual calendar pick
  discovery_datetime?: string         // auto when form opens
  priority?: IncidentPriority         // auto = likelihood × impact
  likelihood?: number                 // 1-5
  impact?: number                     // 1-5
  loss_effect?: string                // financial loss description
  loss_amount?: number                // amount
  loss_currency?: string              // AZN, USD, EUR
  attached_files?: AttachedFile[]     // file attachments
  // ── Investigation fields (Pəncərə 2) ───────────────────
  root_cause?: string
  root_cause_category?: 'process' | 'human' | 'control_gap' | 'procedure_gap' | 'third_party'
  investigation_notes?: string
  investigation_lead?: string
  investigation_members?: string[]    // investigation team members (phase 25)
  investigation_start?: string
  investigation_end?: string
  affected_systems?: string[]
  affected_departments?: string[]
  // ── SLA / handover (phase 25) ──────────────────────────
  acknowledged_at?: string            // when the risk team took it on (SLA clock start)
  sla_due_date?: string               // auto from priority on acknowledge
  forwarded_at?: string               // when the risk owner forwarded it
  forwarded_to?: string               // who it was forwarded to
  // GRC linkage
  risk_id?: string                    // linked risk register entry
  control_id?: string                 // linked control library entry
  process_id?: string                 // linked business process (control map, phase 24)
  reporter_person?: string            // person reporting (dependent on reporter_structure, phase 32)
  incident_category?: string          // incident category (control-aligned, phase 32)
  compliance_obligation_id?: string   // linked compliance obligation (flagged non-compliant, phase 32)
  root_cause_whys?: string[]          // 5-Why chain; last = final root cause (phase 32)
  // ── Resolution fields (Pəncərə 3) ──────────────────────
  resolution_summary?: string
  corrective_actions?: CorrectiveAction[]
  lessons_learned?: string
  reputation_impact?: string          // reputational effect
  incident_residual_level?: RiskLevel // residual after current controls (phase 26)
  resolved_at?: string
  closed_at?: string
  // ── Dates ──────────────────────────────────────────────
  created_at: string
  updated_at: string
  jira_issue_key?: string
  jira_issue_status?: string
  jira_last_sync?: string
  jira_project_key?: string
}

export interface IncidentTimelineEvent {
  id: string
  incident_id: string
  actor_name: string
  action: string
  detail?: string
  created_at: string
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export type ControlFramework = 'iso27001' | 'soc2' | 'gdpr' | 'pci_dss' | 'custom'
export type ControlStatus = 'pass' | 'fail' | 'partial' | 'na'
export type ControlType = 'preventive' | 'detective' | 'corrective' | 'directive'
export type ControlClassification = 'manual' | 'automated' | 'hybrid'
export type EffectivenessRating = 'effective' | 'partially_effective' | 'ineffective' | 'na'
export type DesignEffectiveness = 'pass' | 'fail' | 'partial' | 'not_tested'
export type OperatingEffectiveness = 'pass' | 'fail' | 'partial' | 'not_tested'
export type ExecutionFrequency = 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc'
export type ControlApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'retired'

export interface Control {
  id: string
  org_id: string
  framework: ControlFramework
  control_id: string
  title: string
  description: string
  status: ControlStatus
  evidence_url?: string
  evidence_note?: string
  reviewed_at?: string
  reviewed_by?: string
  created_at: string
  // Phase 1 additions — expanded control card
  req_id?: string
  control_type?: ControlType
  classification?: ControlClassification
  objective?: string
  owner_id?: string
  owner_dept?: string
  systems_tools?: string[]
  execution_frequency?: ExecutionFrequency
  execution_detail?: string
  evidence_requirements?: string
  kci_definition?: string
  effectiveness_rating?: EffectivenessRating
  design_effectiveness?: DesignEffectiveness
  operating_effectiveness?: OperatingEffectiveness
  last_tested_at?: string
  next_test_date?: string
  approval_status?: ControlApprovalStatus
  approved_by?: string
  approved_at?: string
  is_live?: boolean
  live_date?: string
  version?: number
  change_history?: ControlChangeEntry[]
  updated_at?: string
}

export interface ControlChangeEntry {
  version: number
  changed_by: string
  changed_at: string
  summary: string
}

// ─── Audits ──────────────────────────────────────────────────────────────────

export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface Audit {
  id: string
  org_id: string
  title: string
  scope: string
  status: AuditStatus
  auditor_id?: string
  auditor_name?: string
  start_date?: string
  end_date?: string
  created_at: string
}

export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type FindingStatus = 'open' | 'in_progress' | 'resolved' | 'accepted'

export interface AuditFinding {
  id: string
  audit_id: string
  title: string
  description: string
  severity: FindingSeverity
  recommendation: string
  status: FindingStatus
  created_at: string
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export type VendorStatus = 'active' | 'inactive' | 'under_review' | 'terminated'
export type VendorCategory =
  | 'cloud_services'
  | 'software'
  | 'hardware'
  | 'professional_services'
  | 'logistics'
  | 'financial'
  | 'other'

export interface Vendor {
  id: string
  org_id: string
  name: string
  category: VendorCategory
  risk_score: number    // 0-100
  contract_renewal?: string
  contact_email?: string
  contact_name?: string
  status: VendorStatus
  ai_summary?: string
  created_at: string
}

// ─── Evidence Files ───────────────────────────────────────────────────────────

export type EvidenceEntityType = 'risk' | 'incident' | 'control' | 'audit' | 'vendor'

export interface EvidenceFile {
  id: string
  entity_type: EvidenceEntityType
  entity_id: string
  file_url: string
  file_name: string
  file_size?: number
  uploaded_by: string
  created_at: string
}

// ─── Activities ───────────────────────────────────────────────────────────────

export interface Activity {
  id: string
  org_id: string
  user_id?: string
  user_name?: string
  action: string
  entity_type: string
  entity_id?: string
  entity_title?: string
  created_at: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_risks: number
  critical_risks: number
  open_incidents: number
  incidents_investigating: number
  compliance_score: number
  controls_failing: number
  active_vendors: number
  vendors_under_review: number
  risk_by_level: Record<RiskLevel, number>
  risk_by_category: Record<RiskCategory, number>
  monthly_risks: { month: string; count: number }[]
  monthly_incidents: { month: string; count: number }[]
}

// ─── Jira Integration ────────────────────────────────────────────────────────

export interface JiraConfig {
  instanceUrl: string
  email: string
  apiToken: string
  connected: boolean
  projectMapping: { risks: string; incidents: string }
  issueTypeMapping: { risks: string; incidents: string }
}

export interface JiraActivity {
  id: string
  key: string
  action: string
  actor: string
  created_at: string
}

export interface JiraComment {
  id: string
  author: string
  content: string
  created_at: string
}

// ─── GRC Intake Workflow ──────────────────────────────────────────────────────

export type GRCIntakeType = 'requirement' | 'risk' | 'finding' | 'incident'
export type GRCIntakeStep =
  | 'registration'
  | 'classification'
  | 'control_mapping'
  | 'evidence_collection'
  | 'compliance_assessment'
  | 'gap_assessment'
  | 'inherent_assessment'
  | 'control_effectiveness_review'
  | 'residual_assessment'
  | 'owner_review'
  | 'mgt_review'
  | 'appetite_gate'
  | 'action_plan'
  | 'assignment'
  | 'implementation'
  | 'evidence_upload'
  | 'validation'
  | 'reassessment'
  | 'escalation'
  | 'committee_review'
  | 'monitoring'
  | 'compliant_closed'
  | 'non_compliance'
  | 'risk_routing'
  | 'closed'

export type GRCIntakeStatus =
  | 'draft'
  | 'under_review'
  | 'compliant'
  | 'non_compliant'
  | 'escalated'
  | 'accepted'
  | 'closed'

export interface GRCIntakeItem {
  id: string
  org_id: string
  type: GRCIntakeType
  title: string
  description: string
  classification: string
  mapped_control_ids: string[]
  evidence_url?: string
  evidence_note?: string
  status: GRCIntakeStatus
  step: GRCIntakeStep
  gap_identified?: boolean
  risk_creation_required?: boolean
  risk_created_id?: string
  created_at: string
  // Phase 1 additions — full compliance workflow fields
  inherent_likelihood?: number
  inherent_impact?: number
  inherent_risk_level?: RiskLevel
  control_effectiveness?: EffectivenessRating
  residual_likelihood?: number
  residual_impact?: number
  residual_risk_level?: RiskLevel
  risk_owner_id?: string
  risk_owner_reviewed_at?: string
  mgt_reviewed_at?: string
  mgt_reviewer_id?: string
  appetite_decision?: 'accept' | 'treat'
  action_plan?: string
  assigned_to?: string
  implementation_due?: string
  implementation_evidence_url?: string
  validation_note?: string
  validated_at?: string
  validated_by?: string
  post_treatment_appetite?: 'within' | 'outside'
  escalated_at?: string
  committee_decision?: string
  closed_at?: string
}

// ─── Governance / Policies ────────────────────────────────────────────────────

export type PolicyStatus   = 'draft' | 'in_review' | 'committee_review' | 'approved' | 'published' | 'retired' | 'superseded'
export type PolicyCategory = 'information_security' | 'operational' | 'hr' | 'financial' | 'compliance' | 'risk' | 'other'
export type PolicyApprovalStage  = 'internal_review' | 'committee_review' | 'final_approval'
export type PolicyApprovalAction = 'submitted' | 'approved' | 'rejected' | 'returned_for_revision'

export interface Policy {
  id: string
  org_id: string
  policy_id: string
  title: string
  description?: string
  category: PolicyCategory
  version: string
  status: PolicyStatus
  owner_id?: string
  owner_dept?: string
  sponsor_id?: string
  effective_date?: string
  review_date?: string
  expiry_date?: string
  last_reviewed_at?: string
  submitted_at?: string
  committee_reviewed_at?: string
  approved_by?: string
  approved_at?: string
  published_at?: string
  body?: string
  document_url?: string
  linked_framework?: string
  linked_control_ids: string[]
  linked_requirement_ids: string[]
  change_summary?: string
  change_history: PolicyChangeEntry[]
  created_at: string
  updated_at: string
}

export interface PolicyChangeEntry {
  version: string
  changed_by: string
  changed_at: string
  summary: string
}

export interface PolicyApproval {
  id: string
  policy_id: string
  org_id: string
  stage: PolicyApprovalStage
  action: PolicyApprovalAction
  actor_id?: string
  actor_name?: string
  comments?: string
  created_at: string
}

// ─── Audit Finding Workflow ───────────────────────────────────────────────────

export type AuditFindingWorkflowStep =
  | 'registration' | 'classification' | 'severity_assessment'
  | 'immediate_correction' | 'verification'
  | 'investigation' | 'evidence_review' | 'root_cause_analysis'
  | 'compliance_impact_assessment' | 'corrective_action_gate'
  | 'action_plan' | 'implementation' | 'validation'
  | 'risk_creation_gate' | 'closure'

export type AuditFindingWorkflowStatus = 'open' | 'in_progress' | 'pending_review' | 'closed' | 'risk_created'

export interface AuditFindingWorkflow {
  id: string
  org_id: string
  audit_finding_id: string
  step: AuditFindingWorkflowStep
  status: AuditFindingWorkflowStatus
  classification?: string
  priority?: FindingSeverity
  immediate_correction_required: boolean
  immediate_correction_note?: string
  immediate_correction_by?: string
  immediate_correction_at?: string
  verification_note?: string
  verified_by?: string
  verified_at?: string
  investigation_note?: string
  evidence_review_note?: string
  evidence_url?: string
  root_cause?: string
  root_cause_category?: 'process' | 'technology' | 'people' | 'external'
  root_cause_analyst_id?: string
  compliance_impact_note?: string
  compliance_frameworks_affected?: ControlFramework[]
  corrective_action_required: boolean
  action_plan?: string
  assigned_to?: string
  due_date?: string
  implementation_note?: string
  implementation_evidence_url?: string
  implemented_at?: string
  validation_note?: string
  validated_by?: string
  validated_at?: string
  risk_creation_required: boolean
  risk_created_id?: string
  closed_at?: string
  created_at: string
  updated_at: string
  // joined fields (from audit_findings)
  finding_title?: string
  finding_severity?: FindingSeverity
  finding_recommendation?: string
}

// ─── NIRAP ────────────────────────────────────────────────────────────────────

export type NIRAPType = 'requirement' | 'change_request' | 'new_implementation' | 'policy_change'
export type NIRAPStep =
  | 'registration' | 'screening' | 'classification' | 'impact_assessment'
  | 'control_gap_analysis' | 'risk_assessment' | 'compliance_assessment'
  | 'approval_gate' | 'implementation_planning' | 'implementation'
  | 'validation' | 'closure'
export type NIRAPStatus = 'open' | 'in_progress' | 'approved' | 'rejected' | 'closed'

export interface NIRAPItem {
  id: string
  org_id: string
  nirap_id: string
  title: string
  description?: string
  type: NIRAPType
  step: NIRAPStep
  status: NIRAPStatus
  classification?: string
  business_unit?: string
  urgency?: FindingSeverity
  initial_screening_note?: string
  screening_outcome?: 'proceed' | 'reject' | 'defer'
  impact_assessment?: string
  affected_systems?: string[]
  affected_processes?: string[]
  control_gap_summary?: string
  gaps_identified?: boolean
  risk_assessment_note?: string
  compliance_note?: string
  linked_risk_id?: string
  approval_required: boolean
  approver_id?: string
  approved_at?: string
  committee_decision?: 'approve' | 'reject' | 'modify'
  committee_notes?: string
  implementation_plan?: string
  implementation_owner?: string
  implementation_due?: string
  implementation_note?: string
  validation_note?: string
  closed_at?: string
  created_at: string
  updated_at: string
}

// ─── Requirements ─────────────────────────────────────────────────────────────

export type RequirementSourceType = 'regulatory' | 'audit_finding' | 'risk_event' | 'internal_policy'
export type RequirementClassification = 'mandatory' | 'advisory' | 'best_practice'
export type RequirementStatus = 'open' | 'mapped' | 'compliant' | 'non_compliant' | 'waived' | 'closed'

export interface Requirement {
  id: string
  org_id: string
  req_id: string
  source_type: RequirementSourceType
  source_ref?: string
  framework?: ControlFramework | 'custom' | 'none'
  title: string
  description?: string
  classification: RequirementClassification
  status: RequirementStatus
  due_date?: string
  owner_id?: string
  created_at: string
  updated_at: string
}

// ─── Control Mapping ──────────────────────────────────────────────────────────

export type MappingType = 'compliance_only' | 'risk_mitigation_only' | 'dual_purpose'
export type MappingApprovalStatus = 'pending' | 'approved' | 'rejected'
export type MappingEntityType = 'risk' | 'requirement' | 'grc_intake_item' | 'audit_finding' | 'incident'

export interface ControlMapping {
  id: string
  org_id: string
  control_id: string
  entity_type: MappingEntityType
  entity_id: string
  mapping_type: MappingType
  mapped_by?: string
  mapped_at: string
  notes?: string
  approval_status: MappingApprovalStatus
  approved_by?: string
  approved_at?: string
  created_at: string
}

// ─── Control Test Runs ────────────────────────────────────────────────────────

export type TestType = 'design' | 'operating' | 'combined'
export type TestResult = 'pass' | 'fail' | 'partial'

export interface ControlTestRun {
  id: string
  org_id: string
  control_id: string
  run_date: string
  tested_by?: string
  test_type: TestType
  result: TestResult
  sample_size?: number
  exceptions_found: number
  evidence_urls: string[]
  notes?: string
  created_at: string
}

// ─── Control Issues ───────────────────────────────────────────────────────────

export type ControlIssueSource = 'control_test' | 'audit' | 'self_assessment' | 'incident' | 'monitoring'
export type ControlIssueStatus = 'open' | 'in_progress' | 'remediated' | 're_testing' | 'closed' | 'accepted'

export interface ControlIssue {
  id: string
  org_id: string
  issue_id: string
  control_id: string
  title: string
  description: string
  source: ControlIssueSource
  severity: FindingSeverity
  identified_at: string
  identified_by?: string
  root_cause?: string
  corrective_action?: string
  owner_id?: string
  due_date?: string
  status: ControlIssueStatus
  retest_date?: string
  retest_result?: TestResult
  closed_at?: string
  linked_risk_ids: string[]
  test_run_id?: string
  created_at: string
  updated_at: string
}

// ─── Monitoring (KRI / KCI / KPI) ────────────────────────────────────────────

export type MonitoringStatus  = 'green' | 'amber' | 'red'
export type MonitoringFreq    = 'daily' | 'weekly' | 'monthly' | 'quarterly'
export type Trend             = 'up' | 'down' | 'flat'
export type KCIStatus         = 'effective' | 'partially_effective' | 'ineffective'

export interface KRIItem {
  id: string
  org_id: string
  kri_id: string
  name: string
  description?: string
  related_risk_id?: string
  risk_category?: RiskCategory
  formula?: string
  data_source?: string
  frequency: MonitoringFreq
  current_value?: number
  previous_value?: number
  trend: Trend
  threshold_green?: string
  threshold_amber?: string
  threshold_red?: string
  current_status: MonitoringStatus
  appetite_limit?: string
  appetite_breach: boolean
  owner_id?: string
  data_owner_id?: string
  last_updated_at?: string
  next_review_date?: string
  ras_id?: string
  created_at: string
  updated_at: string
}

export interface KCIItem {
  id: string
  org_id: string
  control_id?: string
  name: string
  description?: string
  control_type?: 'preventive' | 'detective' | 'corrective'
  control_owner_id?: string
  objective?: string
  test_method: 'manual' | 'automated' | 'hybrid'
  frequency: MonitoringFreq | 'annual'
  current_value?: number
  success_rate?: number
  failure_rate?: number
  effectiveness_rating?: number
  threshold_effective?: string
  threshold_partial?: string
  threshold_ineffective?: string
  current_status: KCIStatus
  evidence_source?: string
  last_test_date?: string
  next_test_date?: string
  created_at: string
  updated_at: string
}

export interface KPIItem {
  id: string
  org_id: string
  name: string
  related_process?: string
  process_owner_id?: string
  description?: string
  formula?: string
  target_value?: number
  current_value?: number
  previous_value?: number
  trend: Trend
  threshold_green?: string
  threshold_amber?: string
  threshold_red?: string
  performance_status: MonitoringStatus
  sla_target?: string
  frequency: MonitoringFreq
  owner_id?: string
  last_updated_at?: string
  next_review_date?: string
  created_at: string
  updated_at: string
}

export interface MonitoringAlert {
  id: string
  org_id: string
  source_type: 'kri' | 'kci' | 'kpi'
  source_id: string
  source_name?: string
  alert_level: 'amber' | 'red'
  message: string
  acknowledged: boolean
  action_required: boolean
  action_plan?: string
  acknowledged_at?: string
  acknowledged_by?: string
  created_at: string
}

// ─── Risk Appetite Statement ──────────────────────────────────────────────────

export type AppetiteLevel = 'zero' | 'low' | 'moderate' | 'elevated' | 'high'
export type AppetiteStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'superseded'
export type AppetiteCategory = RiskCategory | 'overall'

export interface RiskAppetiteStatement {
  id: string
  org_id: string
  title: string
  risk_category: AppetiteCategory
  description?: string
  appetite_level: AppetiteLevel
  tolerance_level: AppetiteLevel
  threshold_green?: string
  threshold_amber?: string
  threshold_red?: string
  max_residual_score?: number
  status: AppetiteStatus
  effective_date?: string
  review_date?: string
  approved_by?: string
  approved_at?: string
  linked_kri_ids: string[]
  business_unit?: string
  version: number
  created_at: string
  updated_at: string
}

// ─── Compliance Obligation Register (ISO 37301) ──────────────────────────────

// Compliance status of the obligation (replaces the old lifecycle status)
export type ObligationStatus = 'compliant' | 'non_compliant' | 'under_review' | 'not_applicable'
// Category of the obligation source
export type ObligationSourceType = 'external' | 'internal' | 'contractual'
export type ObligationCriticality = 'minimal' | 'low' | 'medium' | 'high' | 'critical'
// ISO 37301: legally binding (requirement) vs voluntary/contractual (commitment)
export type ObligationType = 'requirement' | 'commitment'
// The framework / standard the obligation derives from
export type ObligationSource =
  | 'ISO 27001'
  | 'GDPR'
  | 'SOC 2'
  | 'PCI DSS'
  | 'Local Regulation'
  | 'Internal Policy'
  | 'Contractual'
  | 'Other'

export interface ComplianceObligation {
  id: string
  org_id: string
  obligation_code: string
  title: string // compliance requirement name
  description: string // what must be fulfilled
  compliance_condition?: string // the condition/criterion for compliance
  // Source
  source: ObligationSource
  source_type: ObligationSourceType
  obligation_type?: ObligationType // ISO 37301: requirement (mandatory) vs commitment (voluntary)
  source_reference?: string // law article / clause text
  source_url?: string
  regulator?: string // enforcing / auditing authority (e.g. Tax Authority, Central Bank)
  // Accountability
  accountable_owner?: string // C-level / manager
  responsible_party?: string // responsible person (executing compliance officer)
  responsible_role?: string // role/position of the responsible person (auto from structure)
  responsible_structure?: string // responsible department / structure
  applicable_depts?: string[]
  evidence?: string // documentation / proof of compliance
  // Status & risk
  status: ObligationStatus
  criticality: ObligationCriticality
  primary_risk_id?: string // related risk (risk register) — drives degree/likelihood/initial
  noncompliance_risk?: string // the risk of NOT fulfilling this obligation
  materialized_risk_id?: string // active risk created when the non-compliance risk materialized
  // Dates
  effective_date?: string
  next_review_date?: string
  created_at: string
  updated_at: string
}

// ─── Regulatory Change Management (ISO 37301) ────────────────────────────────
export type RegulatoryChangeStatus = 'new' | 'under_assessment' | 'implemented' | 'closed'

export interface RegulatoryChange {
  id: string
  org_id: string
  change_code: string // RCM-YYYY-NNN
  title: string
  source: ObligationSource // framework / regulator family
  regulator?: string // issuing body
  change_date?: string // date the change was published
  effective_date?: string // official law enforcement date
  description: string
  impact_assessment?: string // gap analysis / detailed assessment
  business_effect?: string // how it impacts business operations
  assessor?: string // person who evaluated the change
  action_plan?: string // steps/tasks to take due to this change
  responsible_structure?: string
  responsible_person?: string
  requirement_link_id?: string // linked top-level obligation (compliance_obligations.id)
  status: RegulatoryChangeStatus
  created_at: string
  updated_at: string
}

// Affected obligations of a regulatory change
export interface RegulatoryChangeLink {
  id: string
  org_id: string
  change_id: string
  obligation_id: string
  created_at: string
}

// ─── Interested Parties (ISO 37301/37001 stakeholders) ───────────────────────
export type PartyType = 'internal' | 'external' | 'regulator' | 'customer' | 'supplier' | 'employee' | 'community'
export type PartyInfluence = 'low' | 'medium' | 'high'

export interface InterestedParty {
  id: string
  org_id: string
  party_code: string // IP-YYYY-NNN
  name: string
  party_type: PartyType
  needs_expectations?: string
  influence: PartyInfluence
  owner?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Many-to-many link: obligation ↔ risk register entry
export interface ObligationRiskLink {
  id: string
  org_id: string
  obligation_id: string
  risk_id: string
  created_at: string
}

// Many-to-many link: obligation ↔ control library entry
export interface ObligationControlLink {
  id: string
  org_id: string
  obligation_id: string
  control_id: string
  created_at: string
}

// Many-to-many link: obligation ↔ internal policy
export interface ObligationPolicyLink {
  id: string
  org_id: string
  obligation_id: string
  policy_id: string
  created_at: string
}

// Many-to-many link: interested party ↔ obligation
export interface PartyObligationLink {
  id: string
  org_id: string
  party_id: string
  obligation_id: string
  created_at: string
}

// ─── New dashboard modules (phase 30) ────────────────────────────────────────
export type AppetiteEntryStatus = 'within' | 'warning' | 'breached'
export interface AppetiteEntry {
  id: string
  org_id: string
  code: string // RA-YYYY-NNN
  category?: string
  statement: string
  tolerance?: string
  measure?: string
  status: AppetiteEntryStatus
  owner?: string
  created_at: string
  updated_at: string
}

export type FinancialRiskKind = 'portfolio' | 'investment'
export interface FinancialRisk {
  id: string
  org_id: string
  code: string // FR-YYYY-NNN
  title: string
  kind: FinancialRiskKind
  exposure_amount?: number
  currency?: string
  likelihood: number
  impact: number
  level?: RiskLevel
  notes?: string
  owner?: string
  created_at: string
  updated_at: string
}

export type StressTestOutcome = 'pass' | 'attention' | 'fail'
export interface StressTest {
  id: string
  org_id: string
  code: string // ST-YYYY-NNN
  scenario: string
  description?: string
  assumption?: string
  result_impact?: string
  outcome: StressTestOutcome
  tested_at?: string
  owner?: string
  created_at: string
  updated_at: string
}

export type WhistleblowStatus = 'new' | 'under_review' | 'substantiated' | 'dismissed' | 'closed'
export interface WhistleblowReport {
  id: string
  org_id: string
  code: string // WB-YYYY-NNN
  source: 'manual' | 'email'
  subject?: string
  body_iv?: string       // AES-GCM IV (base64)
  body_cipher?: string   // encrypted complaint body (base64)
  status: WhistleblowStatus
  risk_id?: string
  received_at?: string
  created_at: string
  updated_at: string
}

// ─── Business Process (Control Map) ──────────────────────────────────────────
export type ProcessStatus = 'active' | 'draft' | 'archived'

export interface Process {
  id: string
  org_id: string
  code: string // PRC-YYYY-NNN
  name: string
  owner_dept?: string
  owner_id?: string          // process owner person (auto from owner_dept head)
  owner_name?: string
  status?: ProcessStatus
  criticality?: ObligationCriticality // tier: minimal..critical
  description?: string
  created_at: string
  updated_at: string
}

// Many-to-many link: process ↔ control
export interface ProcessControlLink {
  id: string
  org_id: string
  process_id: string
  control_id: string
  created_at: string
}

// Many-to-many links: process ↔ policy / risk / obligation
export interface ProcessPolicyLink {
  id: string; org_id: string; process_id: string; policy_id: string; created_at: string
}
export interface ProcessRiskLink {
  id: string; org_id: string; process_id: string; risk_id: string; created_at: string
}
export interface ProcessObligationLink {
  id: string; org_id: string; process_id: string; obligation_id: string; created_at: string
}

// ISO 37301 traceability — change history of an obligation
export interface ObligationAuditLog {
  id: string
  org_id: string
  obligation_id: string
  changed_by: string
  action: string // 'created' | 'updated' | 'status_changed' | 'deleted'
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
  created_at: string
}
