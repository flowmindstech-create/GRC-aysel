import type {
  Risk, Incident, Control, Audit, AuditFinding,
  Vendor, Activity, DashboardStats, UserProfile, AiInsight, OrgUnit, OrgUnitType
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
  head_role: string | null = null
): OrgUnit => ({
  id, org_id: 'org1', name, type, parent_id, head_user_id, head_role, order_index,
  created_at: ORG_T, updated_at: ORG_T,
})

export const SEED_ORG_UNITS: OrgUnit[] = [
  // Top level
  ou('ou-board', 'Himayəçilər Şurası', 'executive', null, 0),
  ou('ou-exec', 'İcraçı direktor', 'executive', 'ou-board', 1),
  ou('ou-audit-svc', 'Daxili audit xidməti', 'division', 'ou-board', 2),
  ou('ou-audit-com', 'Audit komitəsi', 'committee', 'ou-board', 3),
  ou('ou-strat-com', 'Strategiya komitəsi', 'committee', 'ou-board', 4),
  ou('ou-risk-com', 'Risk komitəsi', 'committee', 'ou-board', 5),

  // Executive line
  ou('ou-dep1', 'İcraçı direktorun müavini (Korporativ)', 'executive', 'ou-exec', 10),
  ou('ou-dep2', 'İcraçı direktorun müavini (Biznes)', 'executive', 'ou-exec', 11),
  ou('ou-cio', 'Baş informasiya inzibatçısı', 'executive', 'ou-exec', 12),
  ou('ou-ciso', 'İnformasiya təhlükəsizliyi üzrə baş inzibatçı', 'executive', 'ou-exec', 13),

  // Departments (selectable as Owner Department)
  ou('ou-corp', 'Korporativ xidmətlər departamenti', 'department', 'ou-dep1', 20, 'u1', 'Korporativ xidmətlər departamentinin rəhbəri'),
  ou('ou-bizdev', 'Biznesin inkişafı departamenti', 'department', 'ou-dep2', 21, 'u2', 'Biznesin inkişafı departamentinin rəhbəri'),
  ou('ou-digital', 'Rəqəmsal həllərin inkişafı departamenti', 'department', 'ou-cio', 22, 'u3', 'Rəqəmsal həllərin inkişafı departamentinin rəhbəri'),
  ou('ou-itinfra', 'İT infrastruktur və əməliyyatların idarəedilməsi departamenti', 'department', 'ou-cio', 23, 'u4', 'İT infrastruktur departamentinin rəhbəri'),
  ou('ou-ops', 'Əməliyyatlar departamenti', 'department', 'ou-exec', 24, 'u2', 'Əməliyyatlar departamentinin rəhbəri'),

  // Korporativ xidmətlər → şöbələr
  ou('ou-legal', 'Hüquq şöbəsi', 'division', 'ou-corp', 30),
  ou('ou-hr', 'İnsan resurslarının idarəedilməsi şöbəsi', 'division', 'ou-corp', 31),
  ou('ou-general', 'Ümumi şöbə', 'division', 'ou-corp', 32),
  ou('ou-facilities', 'Təsərrüfat şöbəsi', 'division', 'ou-corp', 33),
  ou('ou-pr', 'İctimaiyyətlə əlaqələr və kommunikasiya şöbəsi', 'division', 'ou-corp', 34),
  ou('ou-finance', 'Maliyyə şöbəsi', 'division', 'ou-dep1', 35),

  // Biznesin inkişafı → şöbələr
  ou('ou-ba', 'Biznes analitika şöbəsi', 'division', 'ou-bizdev', 40),
  ou('ou-method', 'Metodologiya şöbəsi', 'division', 'ou-bizdev', 41),
  ou('ou-data', 'Data və hesabatlılıq şöbəsi', 'division', 'ou-dep2', 42),
  ou('ou-greencard', 'Yaşıl Kart və beynəlxalq əlaqələr şöbəsi', 'division', 'ou-dep2', 43),
  ou('ou-actuary', 'Aktuari', 'division', 'ou-dep2', 44),

  // Rəqəmsal həllər → şöbələr
  ou('ou-appdev', 'Tətbiqi proqramlaşdırma şöbəsi', 'division', 'ou-digital', 50),
  ou('ou-diganalysis', 'Rəqəmsal həllərin analizi və tətbiqi şöbəsi', 'division', 'ou-digital', 51),

  // İT infrastruktur → şöbələr
  ou('ou-sysnet', 'Sistem və şəbəkə inzibatçılığı şöbəsi', 'division', 'ou-itinfra', 60),
  ou('ou-dbops', 'Əməliyyatların avtomatlaşdırılması və məlumat bazaları şöbəsi', 'division', 'ou-itinfra', 61),

  // CIO standalone roles
  ou('ou-arch', 'Proqram təminatı üzrə arxitektor', 'division', 'ou-cio', 62),
  ou('ou-uxui', 'UX/UI dizayner', 'division', 'ou-cio', 63),
  ou('ou-ai', 'Süni intellekt üzrə mühəndis', 'division', 'ou-cio', 64),

  // CISO
  ou('ou-infosec', 'İnformasiya təhlükəsizliyi şöbəsi', 'division', 'ou-ciso', 70),

  // Əməliyyatlar → şöbələr
  ou('ou-requests', 'Tələblərin idarə edilməsi şöbəsi', 'division', 'ou-ops', 80),
  ou('ou-callcenter', 'Çağrı mərkəzi şöbəsi', 'division', 'ou-ops', 81),
  ou('ou-appeals', 'Müraciətlərin idarə edilməsi şöbəsi', 'division', 'ou-ops', 82),

  // Reporting directly to executive director
  ou('ou-riskmgmt', 'Risklərin idarəedilməsi şöbəsi', 'division', 'ou-exec', 90),
  ou('ou-projects', 'Layihələrin idarə olunması şöbəsi', 'division', 'ou-exec', 91),
  ou('ou-hse', 'Əməyin mühafizəsi üzrə mühəndis', 'division', 'ou-exec', 92),
  ou('ou-procurement', 'Satınalma üzrə menecer', 'division', 'ou-exec', 93),
  ou('ou-intsec', 'Daxili təhlükəsizlik üzrə menecer', 'division', 'ou-exec', 94),
  ou('ou-strategy', 'Strategiya üzrə menecer', 'division', 'ou-exec', 95),
]

// ─── Risks ───────────────────────────────────────────────────────────────────

export const MOCK_RISKS: Risk[] = [
  {
    id: 'r1', org_id: 'org1', title: 'SQL Injection Vulnerability in Customer Portal',
    description: 'The customer-facing login portal has an unpatched SQL injection point that could expose all customer records.',
    category: 'cybersecurity', level: 'critical', status: 'open',
    owner_id: 'u2', owner_name: 'Leyla Mammadova',
    due_date: '2025-02-15', likelihood: 4, impact: 5,
    mitigation: 'Apply parameterized queries, conduct penetration test, deploy WAF rule.',
    created_at: '2025-01-05T10:00:00Z', updated_at: '2025-01-10T14:00:00Z',
  },
  {
    id: 'r2', org_id: 'org1', title: 'Third-Party Payroll Provider Insolvency Risk',
    description: 'Our payroll SaaS vendor is showing signs of financial instability which could disrupt monthly payroll operations.',
    category: 'financial', level: 'high', status: 'in_progress',
    owner_id: 'u1', owner_name: 'Ali Hasanov',
    due_date: '2025-03-01', likelihood: 3, impact: 4,
    mitigation: 'Identify backup payroll provider, maintain 3-month payroll reserve fund.',
    created_at: '2025-01-08T10:00:00Z', updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'r3', org_id: 'org1', title: 'GDPR Non-Compliance in Marketing Emails',
    description: 'Marketing team is sending promotional emails without a valid opt-in consent mechanism, violating GDPR Article 7.',
    category: 'legal_compliance', level: 'high', status: 'in_progress',
    owner_id: 'u2', owner_name: 'Leyla Mammadova',
    due_date: '2025-02-01', likelihood: 4, impact: 4,
    mitigation: 'Implement double opt-in flow, audit existing contact list, update privacy policy.',
    created_at: '2025-01-10T10:00:00Z', updated_at: '2025-01-18T10:00:00Z',
  },
  {
    id: 'r4', org_id: 'org1', title: 'Key Employee Dependency — CTO Single Point of Failure',
    description: 'Our CTO holds exclusive knowledge of critical system architecture. Their departure would create a major operational gap.',
    category: 'operational', level: 'medium', status: 'open',
    owner_id: 'u1', owner_name: 'Ali Hasanov',
    due_date: '2025-04-30', likelihood: 2, impact: 5,
    mitigation: 'Document all architecture decisions, implement knowledge transfer sessions, hire senior engineer.',
    created_at: '2025-01-12T10:00:00Z', updated_at: '2025-01-12T10:00:00Z',
  },
  {
    id: 'r5', org_id: 'org1', title: 'Cloud Storage Misconfiguration Exposes Internal Documents',
    description: 'AWS S3 bucket containing internal HR documents is publicly accessible due to policy misconfiguration.',
    category: 'cybersecurity', level: 'critical', status: 'mitigated',
    owner_id: 'u3', owner_name: 'Rauf Quliyev',
    due_date: '2025-01-20', likelihood: 5, impact: 5,
    mitigation: 'Enabled S3 Block Public Access, implemented bucket policy, set up AWS Config rules for auto-remediation.',
    created_at: '2025-01-03T10:00:00Z', updated_at: '2025-01-17T10:00:00Z',
  },
  {
    id: 'r6', org_id: 'org1', title: 'Operational Disruption from Outdated BCP',
    description: 'Business Continuity Plan has not been tested or updated since 2022, leaving the organization unprepared for major outages.',
    category: 'operational', level: 'medium', status: 'open',
    owner_id: 'u2', owner_name: 'Leyla Mammadova',
    due_date: '2025-05-01', likelihood: 3, impact: 3,
    mitigation: 'Schedule BCP tabletop exercise, update plan, assign departmental BCP owners.',
    created_at: '2025-01-14T10:00:00Z', updated_at: '2025-01-14T10:00:00Z',
  },
  {
    id: 'r7', org_id: 'org1', title: 'Software License Compliance Risk',
    description: 'Audit revealed 12 unlicensed software installations across developer workstations, risking vendor audit and fines.',
    category: 'legal_compliance', level: 'low', status: 'closed',
    owner_id: 'u4', owner_name: 'Nigar Aliyeva',
    due_date: '2025-01-31', likelihood: 2, impact: 2,
    mitigation: 'Deployed SIEM-based software inventory scanner, purchased required licenses.',
    created_at: '2024-12-20T10:00:00Z', updated_at: '2025-01-25T10:00:00Z',
  },
  {
    id: 'OS1', org_id: 'org1', title: 'Lack of First Aid Boxes',
    description: 'There are no standard first aid boxes or medical kits available on the company floors.',
    category: 'operational', level: 'low', status: 'closed',
    owner_id: 'u4', owner_name: 'Afaq Huseynova',
    due_date: '2025-09-30', likelihood: 2, impact: 3,
    mitigation: 'Purchase and placement of standard fully equipped first aid boxes for each floor.',
    created_at: '2024-12-20T10:00:00Z', updated_at: '2025-09-30T10:00:00Z',
    sub_category: 'Medical security and first aid process',
    owner_dept: 'HSE',
    owner_role: 'HSE Coordinator',
    notes: 'Sample RCSA record from company policy',
    implementation_date: '2025-09-30',
    confidentiality: 3,
    integrity: 2,
    availability: 1,
    operational_impact: 3,
    financial_impact: 2,
    reputation_impact: 1,
    compliance_impact: 2,
    target_residual_risk: 'low',
    workflow_step: 'closed',
    control_design_compliance: 3,
    control_design_strength: 3,
    control_design_timeliness: 3,
    control_implementation_relevance: 3,
    control_implementation_sustainability: 3,
    control_implementation_traceability: 3,
    control_design: 3,
    control_implementation: 3,
    control_effectiveness: 'adequate',
  },
]

// ─── Incidents ────────────────────────────────────────────────────────────────

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'i1', org_id: 'org1', title: 'Phishing Attack — Finance Team',
    description: '3 finance team members clicked a credential-harvesting phishing link. One credential was compromised before MFA blocked access.',
    severity: 'high', status: 'investigating',
    assigned_to: 'u2', assigned_name: 'Leyla Mammadova',
    reported_by: 'u4', reporter_name: 'Nigar Aliyeva',
    created_at: '2025-01-18T08:30:00Z', updated_at: '2025-01-18T12:00:00Z',
  },
  {
    id: 'i2', org_id: 'org1', title: 'Production Database Outage — 2.5 Hours',
    description: 'Primary PostgreSQL database became unresponsive due to a runaway query from a recent deployment. Caused 2.5 hour service outage.',
    severity: 'critical', status: 'resolved',
    assigned_to: 'u3', assigned_name: 'Rauf Quliyev',
    reported_by: 'u1', reporter_name: 'Ali Hasanov',
    created_at: '2025-01-10T02:15:00Z',
    resolved_at: '2025-01-10T04:45:00Z',
    updated_at: '2025-01-10T05:00:00Z',
  },
  {
    id: 'i3', org_id: 'org1', title: 'Unauthorized Data Access by Former Employee',
    description: 'IT audit revealed a terminated employee retained active VPN credentials and accessed the customer database 11 days post-termination.',
    severity: 'critical', status: 'investigating',
    assigned_to: 'u2', assigned_name: 'Leyla Mammadova',
    reported_by: 'u3', reporter_name: 'Rauf Quliyev',
    created_at: '2025-01-15T11:00:00Z', updated_at: '2025-01-16T09:00:00Z',
  },
  {
    id: 'i4', org_id: 'org1', title: 'DDoS Attack on Web Application',
    description: 'Volumetric DDoS attack at 28 Gbps targeting public API. Cloudflare WAF mitigated in 18 minutes. No data exfiltration detected.',
    severity: 'medium', status: 'resolved',
    assigned_to: 'u1', assigned_name: 'Ali Hasanov',
    reported_by: 'u2', reporter_name: 'Leyla Mammadova',
    created_at: '2025-01-07T19:00:00Z',
    resolved_at: '2025-01-07T19:18:00Z',
    updated_at: '2025-01-07T20:00:00Z',
  },
]

// ─── Controls ─────────────────────────────────────────────────────────────────

export const MOCK_CONTROLS: Control[] = [
  // ISO 27001
  { id: 'c1', org_id: 'org1', framework: 'iso27001', control_id: 'A.5.1', title: 'Information Security Policies', description: 'Policies for information security shall be defined, approved by management, published and communicated.', status: 'pass', reviewed_at: '2025-01-10T00:00:00Z', reviewed_by: 'Rauf Quliyev', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c2', org_id: 'org1', framework: 'iso27001', control_id: 'A.6.1', title: 'Roles and Responsibilities', description: 'All information security responsibilities shall be defined and allocated.', status: 'pass', reviewed_at: '2025-01-10T00:00:00Z', reviewed_by: 'Rauf Quliyev', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c3', org_id: 'org1', framework: 'iso27001', control_id: 'A.8.1', title: 'Inventory of Assets', description: 'Assets associated with information and information processing facilities shall be identified.', status: 'partial', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c4', org_id: 'org1', framework: 'iso27001', control_id: 'A.9.1', title: 'Access Control Policy', description: 'An access control policy shall be established, documented and reviewed based on business requirements.', status: 'pass', reviewed_at: '2025-01-08T00:00:00Z', reviewed_by: 'Ali Hasanov', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c5', org_id: 'org1', framework: 'iso27001', control_id: 'A.10.1', title: 'Cryptographic Policy', description: 'A policy on the use of cryptographic controls for protection of information shall be developed and implemented.', status: 'fail', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c6', org_id: 'org1', framework: 'iso27001', control_id: 'A.12.1', title: 'Operational Procedures', description: 'Operating procedures shall be documented and made available to all users who need them.', status: 'pass', reviewed_at: '2025-01-05T00:00:00Z', reviewed_by: 'Leyla Mammadova', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c7', org_id: 'org1', framework: 'iso27001', control_id: 'A.14.2', title: 'Secure Development Policy', description: 'Rules for the development of software and systems shall be established and applied to developments.', status: 'partial', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c8', org_id: 'org1', framework: 'iso27001', control_id: 'A.16.1', title: 'Management of Security Events', description: 'Responsibilities and procedures shall be established to ensure a quick, effective and orderly response to security incidents.', status: 'pass', reviewed_at: '2025-01-12T00:00:00Z', reviewed_by: 'Rauf Quliyev', created_at: '2024-12-01T00:00:00Z' },
  // SOC2
  { id: 'c9', org_id: 'org1', framework: 'soc2', control_id: 'CC1.1', title: 'Control Environment — COSO Principles', description: 'The entity demonstrates a commitment to integrity and ethical values.', status: 'pass', reviewed_at: '2025-01-15T00:00:00Z', reviewed_by: 'Ali Hasanov', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c10', org_id: 'org1', framework: 'soc2', control_id: 'CC6.1', title: 'Logical Access Controls', description: 'The entity implements logical access security software, infrastructure, and architectures to protect against unauthorized access.', status: 'pass', reviewed_at: '2025-01-15T00:00:00Z', reviewed_by: 'Leyla Mammadova', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c11', org_id: 'org1', framework: 'soc2', control_id: 'CC7.1', title: 'Change Management', description: 'The entity uses detection and monitoring procedures to identify changes to configurations.', status: 'fail', created_at: '2024-12-01T00:00:00Z' },
  { id: 'c12', org_id: 'org1', framework: 'soc2', control_id: 'CC9.1', title: 'Risk Mitigation', description: 'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions.', status: 'partial', created_at: '2024-12-01T00:00:00Z' },
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
  compliance_score: 68,
  risk_by_level: { minimal: 0, low: 1, medium: 2, high: 2, critical: 2 },
  risk_by_category: {
    cybersecurity: 3, financial: 1, operational: 2,
    legal_compliance: 2, strategic: 0,
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

// ─── AI Insights ─────────────────────────────────────────────────────────────

export const MOCK_AI_INSIGHTS: AiInsight[] = [
  {
    title: 'Critical Cybersecurity Exposure',
    content: 'You have 2 unmitigated critical cybersecurity risks. The SQL Injection vulnerability in your customer portal poses immediate data breach risk. Recommend prioritizing remediation this sprint.',
    type: 'risk', severity: 'critical',
  },
  {
    title: 'Phishing Trend Detected',
    content: 'Recent phishing incident targeting Finance team correlates with a 340% spike in similar attacks across the financial sector in January 2025. Consider running an immediate security awareness training.',
    type: 'incident', severity: 'warning',
  },
  {
    title: 'Compliance Score Below Target',
    content: 'Your current compliance score of 68% is below the industry benchmark of 80%. Key gaps are in Cryptographic Policy (ISO A.10.1) and Change Management (SOC2 CC7.1). Addressing these 2 controls would raise your score to 76%.',
    type: 'compliance', severity: 'warning',
  },
  {
    title: 'Vendor Contract Renewals Approaching',
    content: 'PayrollPro Systems contract renews in 40 days and has an elevated risk score of 85/100. Recommend initiating renewal negotiations immediately or identifying an alternative vendor.',
    type: 'general', severity: 'warning',
  },
]
