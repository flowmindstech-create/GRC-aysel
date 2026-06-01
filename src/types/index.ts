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

// ─── Risks ───────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RiskStatus = 'open' | 'in_progress' | 'mitigated' | 'accepted' | 'closed'
export type RiskCategory =
  | 'cybersecurity'
  | 'financial'
  | 'operational'
  | 'legal'
  | 'hr'
  | 'strategic'
  | 'compliance'

export interface Risk {
  id: string
  org_id: string
  title: string
  description: string
  category: RiskCategory
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
  treatment_plan?: string
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
  target_residual_risk?: string
  control_design?: number
  control_implementation?: number
  control_design_compliance?: number
  control_design_strength?: number
  control_design_timeliness?: number
  control_implementation_relevance?: number
  control_implementation_sustainability?: number
  control_implementation_traceability?: number
}

// ─── Incidents ───────────────────────────────────────────────────────────────

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'

export interface Incident {
  id: string
  org_id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  assigned_to?: string
  assigned_name?: string
  reported_by?: string
  reporter_name?: string
  created_at: string
  resolved_at?: string
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

export type ControlFramework = 'iso27001' | 'soc2' | 'gdpr' | 'pci_dss'
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
  compliance_score: number
  risk_by_level: Record<RiskLevel, number>
  risk_by_category: Record<RiskCategory, number>
  monthly_risks: { month: string; count: number }[]
  monthly_incidents: { month: string; count: number }[]
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export interface AiInsight {
  title: string
  content: string
  type: 'risk' | 'incident' | 'compliance' | 'general'
  severity: 'info' | 'warning' | 'critical'
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

