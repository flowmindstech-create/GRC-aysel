import type {
  Risk, Incident, Control, Audit, AuditFinding,
  Vendor, Activity, DashboardStats, UserProfile, OrgUnit, OrgUnitType,
  Policy, PolicyChangeEntry, RegulatoryChange
} from '@/types'

// ─── Users ───────────────────────────────────────────────────────────────────

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'u1', org_id: 'org1', full_name: 'Ali Hasanov', email: 'ali@acmecorp.az',
    role: 'admin', created_at: '2024-01-10T09:00:00Z',
  },
  {
    id: 'u2', org_id: 'org1', full_name: 'Leyla Mammadova', email: 'leyla@acmecorp.az',
    role: 'risk_manager', created_at: '2024-01-12T09:00:00Z',
  },
  {
    id: 'u3', org_id: 'org1', full_name: 'Rauf Quliyev', email: 'rauf@acmecorp.az',
    role: 'auditor', created_at: '2024-02-05T09:00:00Z',
  },
  {
    id: 'u4', org_id: 'org1', full_name: 'Nigar Aliyeva', email: 'nigar@acmecorp.az',
    role: 'employee', created_at: '2024-03-01T09:00:00Z',
  },
]

// ─── Organizational Structure (demo: isb.az org chart) ─────────────────────────

const ORG_T = '2024-01-01T00:00:00Z'
const ou = (
  id: string,
  name: string,
  type: OrgUnitType,
  parent_id: string | null,
  order_index: number,
  head_user_id: string | null = null,
  head_role: string | null = null,
  code?: string
): OrgUnit => ({
  id, org_id: 'org1', name, code, type, parent_id, head_user_id, head_role, order_index,
  created_at: ORG_T, updated_at: ORG_T,
})

export const SEED_ORG_UNITS: OrgUnit[] = [
  // Top level
  ou('ou-board', 'Board of Trustees', 'executive', null, 0),
  ou('ou-exec', 'Executive Director', 'executive', 'ou-board', 1),
  ou('ou-audit-svc', 'Internal Audit Service', 'division', 'ou-board', 2),
  ou('ou-audit-com', 'Audit Committee', 'committee', 'ou-board', 3),
  ou('ou-strat-com', 'Strategy Committee', 'committee', 'ou-board', 4),
  ou('ou-risk-com', 'Risk Committee', 'committee', 'ou-board', 5),

  // Executive line
  ou('ou-dep1', 'Deputy Executive Director (Corporate)', 'executive', 'ou-exec', 10),
  ou('ou-dep2', 'Deputy Executive Director (Business)', 'executive', 'ou-exec', 11),
  ou('ou-cio', 'Chief Information Officer', 'executive', 'ou-exec', 12),
  ou('ou-ciso', 'Chief Information Security Officer', 'executive', 'ou-exec', 13),

  // Departments (selectable as Owner Department) — each carries a Risk ID code
  ou('ou-corp', 'Corporate Services Department', 'department', 'ou-dep1', 20, 'u1', 'Head of the Corporate Services Department', 'CORP'),
  ou('ou-bizdev', 'Business Development Department', 'department', 'ou-dep2', 21, 'u2', 'Head of the Business Development Department', 'BIZ'),
  ou('ou-digital', 'Digital Solutions Development Department', 'department', 'ou-cio', 22, 'u3', 'Head of the Digital Solutions Development Department', 'DIG'),
  ou('ou-itinfra', 'IT Infrastructure and Operations Management Department', 'department', 'ou-cio', 23, 'u4', 'Head of the IT Infrastructure Department', 'IT'),
  ou('ou-ops', 'Operations Department', 'department', 'ou-exec', 24, 'u2', 'Head of the Operations Department', 'OPS'),

  // Corporate Services → divisions
  ou('ou-legal', 'Legal Division', 'division', 'ou-corp', 30),
  ou('ou-hr', 'Human Resources Management Division', 'division', 'ou-corp', 31),
  ou('ou-general', 'General Division', 'division', 'ou-corp', 32),
  ou('ou-facilities', 'Facilities Division', 'division', 'ou-corp', 33),
  ou('ou-pr', 'Public Relations and Communications Division', 'division', 'ou-corp', 34),
  ou('ou-finance', 'Finance Division', 'division', 'ou-dep1', 35),

  // Business Development → divisions
  ou('ou-ba', 'Business Analytics Division', 'division', 'ou-bizdev', 40),
  ou('ou-method', 'Methodology Division', 'division', 'ou-bizdev', 41),
  ou('ou-data', 'Data and Reporting Division', 'division', 'ou-dep2', 42),
  ou('ou-greencard', 'Green Card and International Relations Division', 'division', 'ou-dep2', 43),
  ou('ou-actuary', 'Actuary', 'division', 'ou-dep2', 44),

  // Digital Solutions → divisions
  ou('ou-appdev', 'Application Programming Division', 'division', 'ou-digital', 50),
  ou('ou-diganalysis', 'Digital Solutions Analysis and Implementation Division', 'division', 'ou-digital', 51),

  // IT Infrastructure → divisions
  ou('ou-sysnet', 'System and Network Administration Division', 'division', 'ou-itinfra', 60),
  ou('ou-dbops', 'Operations Automation and Databases Division', 'division', 'ou-itinfra', 61),

  // CIO standalone roles
  ou('ou-arch', 'Software Architect', 'division', 'ou-cio', 62),
  ou('ou-uxui', 'UX/UI Designer', 'division', 'ou-cio', 63),
  ou('ou-ai', 'Artificial Intelligence Engineer', 'division', 'ou-cio', 64),

  // CISO
  ou('ou-infosec', 'Information Security Division', 'division', 'ou-ciso', 70),

  // Operations → divisions
  ou('ou-requests', 'Requests Management Division', 'division', 'ou-ops', 80),
  ou('ou-callcenter', 'Call Center Division', 'division', 'ou-ops', 81),
  ou('ou-appeals', 'Appeals Management Division', 'division', 'ou-ops', 82),

  // Reporting directly to executive director
  ou('ou-riskmgmt', 'Risk Management Division', 'division', 'ou-exec', 90),
  ou('ou-projects', 'Project Management Division', 'division', 'ou-exec', 91),
  ou('ou-hse', 'Occupational Safety Engineer', 'division', 'ou-exec', 92),
  ou('ou-procurement', 'Procurement Manager', 'division', 'ou-exec', 93),
  ou('ou-intsec', 'Internal Security Manager', 'division', 'ou-exec', 94),
  ou('ou-strategy', 'Strategy Manager', 'division', 'ou-exec', 95),
]

// ─── Risks ───────────────────────────────────────────────────────────────────

// Demo risks removed — the register starts empty so risks can be added manually.
export const MOCK_RISKS: Risk[] = []

// ─── Incidents ────────────────────────────────────────────────────────────────

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'i1', org_id: 'org1', title: 'Phishing Attack — Finance Team',
    description: '3 finance team members clicked a credential-harvesting phishing link. One credential was compromised before MFA blocked access.',
    severity: 'high', status: 'review_by_risk_manager', workflow_stage: 'investigation',
    assigned_to: 'u2', assigned_name: 'Leyla Mammadova',
    reported_by: 'u4', reporter_name: 'Nigar Aliyeva',
    created_at: '2025-01-18T08:30:00Z', updated_at: '2025-01-18T12:00:00Z',
  },
  {
    id: 'i2', org_id: 'org1', title: 'Production Database Outage — 2.5 Hours',
    description: 'Primary PostgreSQL database became unresponsive due to a runaway query from a recent deployment. Caused 2.5 hour service outage.',
    severity: 'critical', status: 'done', workflow_stage: 'resolution',
    assigned_to: 'u3', assigned_name: 'Rauf Quliyev',
    reported_by: 'u1', reporter_name: 'Ali Hasanov',
    created_at: '2025-01-10T02:15:00Z',
    resolved_at: '2025-01-10T04:45:00Z',
    updated_at: '2025-01-10T05:00:00Z',
  },
  {
    id: 'i3', org_id: 'org1', title: 'Unauthorized Data Access by Former Employee',
    description: 'IT audit revealed a terminated employee retained active VPN credentials and accessed the customer database 11 days post-termination.',
    severity: 'critical', status: 'review_by_risk_manager', workflow_stage: 'investigation',
    assigned_to: 'u2', assigned_name: 'Leyla Mammadova',
    reported_by: 'u3', reporter_name: 'Rauf Quliyev',
    created_at: '2025-01-15T11:00:00Z', updated_at: '2025-01-16T09:00:00Z',
  },
  {
    id: 'i4', org_id: 'org1', title: 'DDoS Attack on Web Application',
    description: 'Volumetric DDoS attack at 28 Gbps targeting public API. Cloudflare WAF mitigated in 18 minutes. No data exfiltration detected.',
    severity: 'medium', status: 'done', workflow_stage: 'resolution',
    assigned_to: 'u1', assigned_name: 'Ali Hasanov',
    reported_by: 'u2', reporter_name: 'Leyla Mammadova',
    created_at: '2025-01-07T19:00:00Z',
    resolved_at: '2025-01-07T19:18:00Z',
    updated_at: '2025-01-07T20:00:00Z',
  },
]

// ─── Controls ─────────────────────────────────────────────────────────────────

export const MOCK_CONTROLS: Control[] = [
  {
    id: 'c1',
    org_id: 'org1',
    framework: 'iso27001',
    control_id: 'A.5.1',
    title: 'Information Security Policies',
    description: 'A set of policies for information security shall be defined, approved by management, published and communicated to employees and relevant external parties.',
    status: 'pass',
    effectiveness_rating: 'effective',
    design_effectiveness: 'pass',
    operating_effectiveness: 'pass',
    classification: 'manual',
    execution_frequency: 'annual',
    approval_status: 'approved',
    version: 1,
    is_live: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    org_id: 'org1',
    framework: 'iso27001',
    control_id: 'A.6.1',
    title: 'Information Security Roles and Responsibilities',
    description: 'All information security responsibilities shall be defined and allocated.',
    status: 'pass',
    effectiveness_rating: 'effective',
    design_effectiveness: 'pass',
    operating_effectiveness: 'pass',
    classification: 'hybrid',
    execution_frequency: 'continuous',
    approval_status: 'approved',
    version: 1,
    is_live: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c3',
    org_id: 'org1',
    framework: 'iso27001',
    control_id: 'A.8.1',
    title: 'Inventory of Assets',
    description: 'Information, other assets associated with information and information processing facilities shall be identified and an inventory of these assets shall be drawn up and maintained.',
    status: 'partial',
    effectiveness_rating: 'partially_effective',
    design_effectiveness: 'pass',
    operating_effectiveness: 'partial',
    classification: 'automated',
    execution_frequency: 'monthly',
    approval_status: 'approved',
    version: 2,
    is_live: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c4',
    org_id: 'org1',
    framework: 'iso27001',
    control_id: 'A.9.1',
    title: 'Access Control Policy',
    description: 'An access control policy shall be established, documented and reviewed based on business and information security requirements.',
    status: 'fail',
    effectiveness_rating: 'ineffective',
    design_effectiveness: 'fail',
    operating_effectiveness: 'fail',
    classification: 'manual',
    execution_frequency: 'quarterly',
    approval_status: 'approved',
    version: 1,
    is_live: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c5',
    org_id: 'org1',
    framework: 'pci_dss',
    control_id: 'PCI-6.4.3',
    title: 'Production Environment Access Control',
    description: 'Ensure that access to the production environment is strictly restricted and audit logs are maintained.',
    status: 'pass',
    effectiveness_rating: 'effective',
    design_effectiveness: 'pass',
    operating_effectiveness: 'pass',
    classification: 'automated',
    execution_frequency: 'continuous',
    approval_status: 'approved',
    version: 1,
    is_live: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c6',
    org_id: 'org1',
    framework: 'soc2',
    control_id: 'CC6.1',
    title: 'Logical Access Controls',
    description: 'The entity restricts logical access to security assets to authorized users.',
    status: 'partial',
    effectiveness_rating: 'partially_effective',
    design_effectiveness: 'pass',
    operating_effectiveness: 'partial',
    classification: 'hybrid',
    execution_frequency: 'monthly',
    approval_status: 'approved',
    version: 1,
    is_live: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c7',
    org_id: 'org1',
    framework: 'gdpr',
    control_id: 'Art-32',
    title: 'Security of Personal Data Processing',
    description: 'Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk.',
    status: 'pass',
    effectiveness_rating: 'effective',
    design_effectiveness: 'pass',
    operating_effectiveness: 'pass',
    classification: 'hybrid',
    execution_frequency: 'continuous',
    approval_status: 'approved',
    version: 1,
    is_live: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }
]

// ─── Audits ───────────────────────────────────────────────────────────────────

export const MOCK_AUDITS: Audit[] = [
  {
    id: 'a1', org_id: 'org1', title: 'Q1 2025 — IT Security Audit',
    scope: 'Full review of network security controls, endpoint protection, and access management policies.',
    status: 'in_progress', auditor_id: 'u3', auditor_name: 'Rauf Quliyev',
    start_date: '2025-01-15', end_date: '2025-02-15',
    created_at: '2025-01-10T00:00:00Z',
  },
  {
    id: 'a2', org_id: 'org1', title: 'Annual GDPR Compliance Audit',
    scope: 'Assessment of data processing activities, consent mechanisms, data subject rights fulfilment, and DPA agreements.',
    status: 'planned', auditor_id: 'u3', auditor_name: 'Rauf Quliyev',
    start_date: '2025-03-01', end_date: '2025-03-31',
    created_at: '2025-01-20T00:00:00Z',
  },
  {
    id: 'a3', org_id: 'org1', title: 'Vendor Onboarding Security Review — CloudSync Inc.',
    scope: 'Technical and contractual security assessment of new cloud storage vendor.',
    status: 'completed', auditor_id: 'u2', auditor_name: 'Leyla Mammadova',
    start_date: '2024-12-01', end_date: '2024-12-20',
    created_at: '2024-11-25T00:00:00Z',
  },
]

export const MOCK_FINDINGS: AuditFinding[] = [
  {
    id: 'f1', audit_id: 'a1', title: 'Weak Password Policy on Admin Accounts',
    description: '6 admin accounts have passwords shorter than 12 characters with no rotation policy enforced.',
    severity: 'high', recommendation: 'Enforce minimum 16-character passwords with 90-day rotation using AD Group Policy.',
    status: 'open', created_at: '2025-01-20T00:00:00Z',
  },
  {
    id: 'f2', audit_id: 'a1', title: 'Missing Patch on 3 Production Servers',
    description: 'CVE-2024-21413 (CVSS 9.8) patch missing on web-prod-01, web-prod-02, and api-prod-01.',
    severity: 'critical', recommendation: 'Apply security patches immediately during next maintenance window. Enable auto-patching for critical CVEs.',
    status: 'in_progress', created_at: '2025-01-22T00:00:00Z',
  },
  {
    id: 'f3', audit_id: 'a3', title: 'CloudSync DPA Requires Update',
    description: 'Data Processing Agreement with CloudSync Inc. lacks Standard Contractual Clauses for EU-US data transfers.',
    severity: 'medium', recommendation: 'Renegotiate DPA to include SCCs per GDPR Chapter V requirements.',
    status: 'resolved', created_at: '2024-12-10T00:00:00Z',
  },
]

// ─── Vendors ─────────────────────────────────────────────────────────────────

export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'v1', org_id: 'org1', name: 'CloudSync Inc.', category: 'cloud_services',
    risk_score: 72, contract_renewal: '2025-06-30', contact_email: 'enterprise@cloudsync.io',
    contact_name: 'James Wright', status: 'active',
    ai_summary: 'CloudSync presents a moderate-high risk profile. SOC2 Type II certified but has 2 open findings from last security review. Contract renewal is in 6 months — recommend renegotiation of DPA and SLA terms.',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'v2', org_id: 'org1', name: 'PayrollPro Systems', category: 'software',
    risk_score: 85, contract_renewal: '2025-03-01', contact_email: 'sales@payrollpro.com',
    contact_name: 'Sarah Chen', status: 'under_review',
    ai_summary: 'PayrollPro has an elevated risk score due to recent financial instability reports. No SOC2 certification. Recommended: obtain latest financial statements, conduct security questionnaire, identify backup provider.',
    created_at: '2023-06-10T00:00:00Z',
  },
  {
    id: 'v3', org_id: 'org1', name: 'SecureNet Consulting', category: 'professional_services',
    risk_score: 28, contract_renewal: '2025-12-31', contact_email: 'info@securenet.az',
    contact_name: 'Kamran Babayev', status: 'active',
    ai_summary: 'SecureNet Consulting maintains a low risk profile. ISO 27001 certified, NDA and master service agreement in place. Background checks completed for all personnel with access to our systems.',
    created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'v4', org_id: 'org1', name: 'LogiFreight Partners', category: 'logistics',
    risk_score: 45, contract_renewal: '2026-01-15', contact_email: 'contracts@logifreight.com',
    contact_name: 'Maria Santos', status: 'active',
    ai_summary: 'LogiFreight presents a medium risk level. Limited cybersecurity posture but low data access. Primary risks are operational — supply chain disruption and delivery SLA compliance.',
    created_at: '2023-11-20T00:00:00Z',
  },
]

// ─── Activities ───────────────────────────────────────────────────────────────

export const MOCK_ACTIVITIES: Activity[] = [
  { id: 'ac1', org_id: 'org1', user_id: 'u2', user_name: 'Leyla Mammadova', action: 'created risk', entity_type: 'risk', entity_id: 'r1', entity_title: 'SQL Injection Vulnerability in Customer Portal', created_at: '2025-01-05T10:00:00Z' },
  { id: 'ac2', org_id: 'org1', user_id: 'u4', user_name: 'Nigar Aliyeva', action: 'reported incident', entity_type: 'incident', entity_id: 'i1', entity_title: 'Phishing Attack — Finance Team', created_at: '2025-01-18T08:30:00Z' },
  { id: 'ac3', org_id: 'org1', user_id: 'u3', user_name: 'Rauf Quliyev', action: 'completed control review', entity_type: 'control', entity_id: 'c8', entity_title: 'Management of Security Events', created_at: '2025-01-12T14:00:00Z' },
  { id: 'ac4', org_id: 'org1', user_id: 'u1', user_name: 'Ali Hasanov', action: 'resolved incident', entity_type: 'incident', entity_id: 'i2', entity_title: 'Production Database Outage — 2.5 Hours', created_at: '2025-01-10T04:45:00Z' },
  { id: 'ac5', org_id: 'org1', user_id: 'u3', user_name: 'Rauf Quliyev', action: 'created audit', entity_type: 'audit', entity_id: 'a1', entity_title: 'Q1 2025 — IT Security Audit', created_at: '2025-01-10T09:00:00Z' },
  { id: 'ac6', org_id: 'org1', user_id: 'u2', user_name: 'Leyla Mammadova', action: 'added vendor', entity_type: 'vendor', entity_id: 'v2', entity_title: 'PayrollPro Systems', created_at: '2025-01-08T11:00:00Z' },
  { id: 'ac7', org_id: 'org1', user_id: 'u1', user_name: 'Ali Hasanov', action: 'mitigated risk', entity_type: 'risk', entity_id: 'r5', entity_title: 'Cloud Storage Misconfiguration', created_at: '2025-01-17T16:00:00Z' },
]

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  total_risks: 7,
  critical_risks: 2,
  open_incidents: 2,
  incidents_investigating: 1,
  compliance_score: 68,
  controls_failing: 2,
  active_vendors: 4,
  vendors_under_review: 1,
  risk_by_level: { minimal: 0, low: 1, medium: 2, high: 2, critical: 2 },
  risk_by_category: {
    financial: 1, operational: 2, reputation: 0,
    information_security: 3, strategic: 0, compliance: 2, market: 0,
  },
  monthly_risks: [
    { month: 'Aug', count: 2 }, { month: 'Sep', count: 3 },
    { month: 'Oct', count: 1 }, { month: 'Nov', count: 4 },
    { month: 'Dec', count: 3 }, { month: 'Jan', count: 7 },
  ],
  monthly_incidents: [
    { month: 'Aug', count: 0 }, { month: 'Sep', count: 1 },
    { month: 'Oct', count: 2 }, { month: 'Nov', count: 1 },
    { month: 'Dec', count: 1 }, { month: 'Jan', count: 4 },
  ],
}

// ─── Policies ─────────────────────────────────────────────────────────────────

export const MOCK_POLICIES: Policy[] = [
  {
    id: 'p1',
    org_id: 'org1',
    policy_id: 'POL-2026-101',
    title: 'Information Security Policy',
    description: 'Defines the protection of all information assets within the company, the management of user permissions, and security rules.',
    category: 'information_security',
    version: '2.1',
    status: 'published',
    owner_dept: 'Information Security Division',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    linked_control_ids: ['c1', 'c2'],
    linked_requirement_ids: [],
    change_summary: 'MFA requirements and remote-work rules updated.',
    change_history: [
      { version: '1.0', changed_by: 'Ali Hasanov', changed_at: '2024-01-01T08:00:00Z', summary: 'Initial version created.' },
      { version: '2.0', changed_by: 'Ali Hasanov', changed_at: '2025-01-01T09:00:00Z', summary: 'Password complexity requirements tightened.' },
      { version: '2.1', changed_by: 'Ali Hasanov', changed_at: '2026-01-01T10:00:00Z', summary: 'MFA requirements and remote-work rules updated.' }
    ],
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p2',
    org_id: 'org1',
    policy_id: 'POL-2026-102',
    title: 'Data Protection Policy',
    description: 'Regulation of the collection, processing, and storage of the personal data of customers and partners.',
    category: 'compliance',
    version: '1.0',
    status: 'approved',
    owner_dept: 'Legal Division',
    effective_date: '2026-03-01',
    review_date: '2027-03-01',
    linked_control_ids: [],
    linked_requirement_ids: [],
    change_history: [
      { version: '1.0', changed_by: 'Leyla Mammadova', changed_at: '2026-02-15T14:30:00Z', summary: 'Initial document based on GDPR and local legislation.' }
    ],
    created_at: '2026-02-15T14:30:00Z',
    updated_at: '2026-02-15T14:30:00Z'
  },
  {
    id: 'p3',
    org_id: 'org1',
    policy_id: 'POL-2026-103',
    title: 'Business Continuity Policy',
    description: 'Ensuring the recovery and continuity of critical business processes during emergencies and unexpected disruptions.',
    category: 'operational',
    version: '1.0',
    status: 'in_review',
    owner_dept: 'Risk Management Division',
    review_date: '2026-12-01',
    linked_control_ids: [],
    linked_requirement_ids: [],
    change_history: [
      { version: '1.0', changed_by: 'Leyla Mammadova', changed_at: '2026-05-10T11:00:00Z', summary: 'Initial draft submitted for review.' }
    ],
    created_at: '2026-05-10T11:00:00Z',
    updated_at: '2026-05-10T11:00:00Z'
  },
  {
    id: 'p4',
    org_id: 'org1',
    policy_id: 'POL-2026-104',
    title: 'HR Security Policy',
    description: 'Security requirements in hiring, termination, and internal disciplinary rules.',
    category: 'hr',
    version: '1.0',
    status: 'draft',
    owner_dept: 'Human Resources Management Division',
    linked_control_ids: [],
    linked_requirement_ids: [],
    change_history: [],
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-06-01T09:00:00Z'
  }
]

export const MOCK_REGULATORY_CHANGES: RegulatoryChange[] = [
  {
    id: 'rcm1',
    org_id: 'org1',
    change_code: 'RCM-2026-001',
    title: 'GDPR Amendment 2026 (Data Protection Update)',
    source: 'GDPR',
    regulator: 'European Data Protection Board',
    change_date: '2026-05-15',
    description: 'Updates to consent management and stricter penalties for automated decision-making breaches.',
    impact_assessment: 'Requires updates to customer consent checkboxes, revisions in Data Protection Policy, and retraining of front-facing staff.',
    status: 'under_assessment',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'rcm2',
    org_id: 'org1',
    change_code: 'RCM-2026-002',
    title: 'Local Data Protection Law Update (Amendments to the Personal Data Law)',
    source: 'Local Regulation',
    regulator: 'State Security Service / Ministry of Digital Development',
    change_date: '2026-07-01',
    description: 'Mandatory localization of storage for critical citizen identifiers and new breach notification SLA of 48 hours.',
    impact_assessment: 'Database migrations required to local hosting partners; incident workflow must be updated to trigger regulator alerts within 48h.',
    status: 'new',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'rcm3',
    org_id: 'org1',
    change_code: 'RCM-2026-003',
    title: 'PCI DSS v4.1 Update (Card Data Security Update)',
    source: 'PCI DSS',
    regulator: 'PCI SSC',
    change_date: '2026-09-30',
    description: 'New requirements for multi-factor authentication (MFA) and automated log reviews.',
    impact_assessment: 'MFA implementation on all administrative systems must support hardware keys. Log parsing routines need update.',
    status: 'new',
    created_at: '2026-06-10T00:00:00Z',
    updated_at: '2026-06-10T00:00:00Z',
  }
]



