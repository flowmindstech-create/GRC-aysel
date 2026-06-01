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

export interface Control {
  id: string
  org_id: string
  framework: ControlFramework
  control_id: string   // e.g. "A.5.1"
  title: string
  description: string
  status: ControlStatus
  evidence_url?: string
  evidence_note?: string
  reviewed_at?: string
  reviewed_by?: string
  created_at: string
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
  status: 'draft' | 'under_review' | 'compliant' | 'non_compliant' | 'closed'
  step: GRCIntakeStep
  gap_identified?: boolean
  risk_creation_required?: boolean
  risk_created_id?: string
  created_at: string
}

