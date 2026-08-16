// ============================================================================
// RCSA methodology — SINGLE SOURCE OF TRUTH.
// English rendering of "Risk Policy 30.04.2026.xlsx" (the official methodology).
// The numeric thresholds, percentages and structure are kept exactly as in the
// source; only the surrounding wording is translated. The AZ source document
// remains authoritative for regulatory interpretation.
// ============================================================================

export interface ScaleOption {
  value: number
  label: string
  desc: string
}

// 5-level impact scale labels (the 6th "Critical/force-majeure" column is excluded by design)
export const IMPACT_LEVEL_LABELS = ['Minimal', 'Low', 'Medium', 'High', 'Maximum'] as const

function impactOptions(descs: [string, string, string, string, string]): ScaleOption[] {
  return descs.map((desc, i) => ({ value: i + 1, label: IMPACT_LEVEL_LABELS[i], desc }))
}

export interface ImpactDomain {
  key: string
  label: string
  group?: string // e.g. IT, Operational
  field: string // Risk field name
  options: ScaleOption[]
}

// 9 impact dimensions (IT = 3 sub: Confidentiality/Integrity/Availability) — Excel "1-Impact Scale" + "2-Impact for IT"
export const IMPACT_DOMAINS: ImpactDomain[] = [
  {
    key: 'financial', label: 'Financial', field: 'financial_impact',
    options: impactOptions([
      'Up to 1,000 AZN',
      '1,001–10,000 AZN',
      '10,001–100,000 AZN',
      '100,001–1,000,000 AZN',
      '1,000,000–1,500,000 AZN',
    ]),
  },
  {
    key: 'compliance', label: 'Compliance / Legal', field: 'compliance_impact',
    options: impactOptions([
      '1. No legal violations, no claims 2. Documentation is up to date and free of errors',
      'A breach of legal requirements in the work process that carries no risk of a fine or reputational harm.',
      '1. Legal violations that may result in a fine 2. Impact on business processes from breaches of legislation and member complaints 3. Breach of the requirements of internally drafted structural documents',
      '1. Legal actions taken against the Bureau due to breaches of legal requirements (application of sanctions, restriction of operations, etc.) 2. Breach of the requirements of mandatory documents approved by the executive body',
      '1. Restriction of the Bureau’s operations 2. Delay of COB requirements 3. Breach of the governing body’s documents 4. Failure to maintain documentation 5. Remarks from the regulator 6. Risk of BCP activation',
    ]),
  },
  {
    key: 'strategy', label: 'Strategy', field: 'strategy_impact',
    options: impactOptions([
      'No negative impact identified during execution of the strategy',
      'Deviations or delays at the milestone level of strategy activity (up to 1 month)',
      'Delays arise in realizing strategic initiatives (failure to complete the task planned for the current year).',
      'Failure of the strategy in one core activity',
      'Failure across several core activities or below-50% execution of the strategy',
    ]),
  },
  {
    key: 'reputation', label: 'Reputation', field: 'reputation_impact',
    options: impactOptions([
      'No reputational damage.',
      '1. Civil complaints (more than 3, with no reputational/financial-loss risk) 2. Cases under court review and comments on social media for over 1 week',
      '1. Publication of negative, reputation-damaging information in the national press 2. Letter/warning from the Central Bank 3. Inaccurate/outdated information in the media',
      '1. Cyber incidents due to compliance gaps, high impact, loss of 10% of members 2. Urgent meeting and restrictions by the CBA 3. Conflicting information on social media',
      '1. Restriction by COB 2. Loss of key members from the portfolio 3. Restriction of operations with reputational damage (loss of the Bureau’s image and its dissolution)',
    ]),
  },
  {
    key: 'hse', label: 'HSE', group: 'Operational', field: 'hse_impact',
    options: impactOptions([
      '1. No HSE-related incident has occurred.',
      '1. An HSE event occurred; minor injury (no medical intervention needed). First aid is sufficient.',
      '1. Serious illnesses/injuries (requiring a doctor’s examination) 2. Inadequacy of occupational-safety assets 3. Events that do not result in asset damage',
      '1. Severe injury, disability (first degree) 2. Damage to Bureau assets/the administrative building 3. Absence of critical occupational-safety assets',
      '1. Permanent disability (degrees 2, 3, 4) or probability of death 2. Inadequacy of fire-protection measures 3. Restrictions on the use of the administrative building (death/building unusable)',
    ]),
  },
  {
    key: 'business_process', label: 'Business process', group: 'Operational', field: 'business_process_impact',
    options: impactOptions([
      '1. 10% of the work affecting the operational process was not completed. 2. No negative impact on processes.',
      '1. 20% of the work affecting the operational process was not completed. 2. Minor (less than 50%) negative impact on processes, process deviation (less than 10%).',
      '1. Failure to complete 50% of the work making up the process 2. 50% non-achievement of key targets or 10% deviation 3. Business processes not maintained for 1 day / 3-day delay',
      '1. Failure to complete 50%–80% of the work 2. Breach of 50%–70% of key targets / 20% deviation 3. Business processes not maintained for 2 days / 4–7-day delay',
      '1. Process halt (80%–100% not executed) 2. Breach of 80% of key objectives / 50% deviation 3. Business processes not maintained for 3–7 days / 8–29-day delay',
    ]),
  },
  {
    key: 'confidentiality', label: 'Confidentiality', group: 'IT', field: 'confidentiality',
    options: impactOptions([
      'Leaked data ≤ 10% (not PII).',
      'Leaked data 10–20% (limited internal data). No legal requirement.',
      'A cyberattack occurs. Leaked data 21%–50% (personal data). Disclosure of internal and confidential data. Investigation required.',
      'A cyberattack/phishing occurs. Leaked data 51%–70% (PII, financial documents). Notification to the regulator required.',
      'A cyberattack/phishing occurs. Leaked data 71%+ or highly sensitive/sector data. Legal sanction, reputational loss, media exposure.',
    ]),
  },
  {
    key: 'integrity', label: 'Integrity', group: 'IT', field: 'integrity',
    options: impactOptions([
      'Altered data ≤ 10% and does not cause errors in processes. Correction time ≤ 10 minutes.',
      'Data changed by 10%–20%. Inconsistency in reports (10%–20%). Correction ≤ 1 hour.',
      'Data change of 21%–50%. Affects financial calculations. Correction ≤ 4 hours.',
      'Data change of 51%–70%. Operations are performed incorrectly. Correction ≤ 1 day.',
      'Data change of 71%+. Operations are halted or executed incorrectly. Correction time 1 day+.',
    ]),
  },
  {
    key: 'availability', label: 'Availability', group: 'IT', field: 'availability',
    options: impactOptions([
      'Service interruption ≤ 5 minutes. SLA not breached.',
      'Interruption 6–30 minutes. Delays in service and operational processes.',
      'Interruption 31 minutes – 2 hours. 21–50% of customers cannot receive service.',
      'Interruption 2 hours – 8 hours. Critical processes halted. SLA breached 51%–71%.',
      'Interruption over 12 hours. Core business functions halted. SLA breached 71%+. Notification to the regulator, media disclosure.',
    ]),
  },
]

// ── Likelihood / Probability (Excel "3-Probability")
export const LIKELIHOOD_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Rare (<5%)', desc: '<5% · Events occur at intervals longer than 10+ years' },
  { value: 2, label: 'Unlikely (5%-10%)', desc: '5%–10% · Likely to occur once every 61 months–10 years' },
  { value: 3, label: 'Possible (11-20%)', desc: '11%–20% · Likely to occur once every 25 months–5 years' },
  { value: 4, label: 'Likely (21-50%)', desc: '21–50% · Likely to occur once every 13 months–2 years' },
  { value: 5, label: 'Frequent (>50%)', desc: '>50% · Likely to occur once or more within 1 year' },
]

// ── Control effectiveness: 6 sub-criteria — Design (3) + Implementation (3).
// value 1 = Strong (best) … 5 = Weak (worst). Each criterion has its own 1-5 description.
const CONTROL_RATING_LABELS = ['Strong', 'Relatively strong', 'Adequate', 'Relatively adequate', 'Weak'] as const
function ctrlOptions(descs: [string, string, string, string, string]): ScaleOption[] {
  return descs.map((desc, i) => ({ value: i + 1, label: CONTROL_RATING_LABELS[i], desc }))
}

export interface ControlSubCriterion {
  key:
    | 'design_compliance' | 'design_strength' | 'design_timeliness'
    | 'impl_relevance' | 'impl_sustainability' | 'impl_traceability'
  group: 'design' | 'implementation'
  label: string
  options: ScaleOption[]
}

export const CONTROL_SUBCRITERIA: ControlSubCriterion[] = [
  {
    key: 'design_compliance', group: 'design', label: 'Compliance (coverage)',
    options: ctrlOptions([
      'All critical risks are fully covered; the design is proportional to the risk and meets standards. Preventive/immediate.',
      'Risk-based approach, ~90% coverage. Minimal gaps. Mostly timely.',
      '50–89% of risks are covered, with some design gaps. Noticeable delay.',
      'Only 25–49% coverage; the design does not cover the risk map. Execution is reactive/unstable.',
      '0–24% coverage; critical design gaps. The control is not applied in a timely manner.',
    ]),
  },
  {
    key: 'design_strength', group: 'design', label: 'Strength',
    options: ctrlOptions([
      'The design fully meets test standards and best practices.',
      'Adequate in most aspects, minimal improvement needed (up to 90% of the standard).',
      'Inadequate in some areas, moderate improvement needed (up to 70%).',
      'Inadequate in several aspects, significant improvement needed (up to 50%).',
      'Inadequate in many aspects; urgent expansion required.',
    ]),
  },
  {
    key: 'design_timeliness', group: 'design', label: 'Timeliness',
    options: ctrlOptions([
      'Real-time/immediate execution. No delay. Preventive.',
      'Preventive, timely, minor delays (<10%).',
      'Mostly timely, delays (11–49%). Detective/preventive.',
      'Frequent delays (50–90%). Detective/directive.',
      'Not executed in time (91–100%) or not applied.',
    ]),
  },
  {
    key: 'impl_relevance', group: 'implementation', label: 'Relevance (currency)',
    options: ctrlOptions([
      'Fully current (91–100% aligned with risk/business changes).',
      'Highly current (~90%), aligned with business requirements.',
      'Covers key risks (50–89%), moderately aligned. Has not changed with processes.',
      'Partially current (25–49%), aligned only with some business needs.',
      'Outdated (0–24%), not aligned/not working.',
    ]),
  },
  {
    key: 'impl_sustainability', group: 'implementation', label: 'Sustainability',
    options: ctrlOptions([
      'Fully automated and applied continuously.',
      'Almost continuous, stable application.',
      'Regular application, but with some interruptions.',
      'Occasional, unsystematic application.',
      'Not applied or applied very rarely.',
    ]),
  },
  {
    key: 'impl_traceability', group: 'implementation', label: 'Traceability',
    options: ctrlOptions([
      'Real-time monitoring, full audit trail, full evidence of execution.',
      'Systematic tracking and an audit trail exist.',
      'Partially documented tracking and evidence.',
      'Only manual and incomplete tracking.',
      'No monitoring, tracking, or documentation.',
    ]),
  },
]

// Overall control rating descriptions (Excel "Description") — keyed by ControlRating
export const CONTROL_RATING_INFO: Record<string, { label: string; desc: string }> = {
  strong: { label: 'Strong', desc: 'Controls and management strengthen safeguards and create the conditions to protect against risks. Reduces the acceleration/impact of risks (this does not mean the risk is 0).' },
  relatively_strong: { label: 'Relatively strong', desc: 'The control tools are adequate and reduce the likelihood/impact of the risk. There are opportunities to improve effectiveness.' },
  adequate: { label: 'Adequate', desc: 'The control tools are effective in managing risks, but risks may still occur. Improvements and additional compensating controls can reduce residual risk.' },
  relatively_adequate: { label: 'Relatively adequate', desc: 'The control tools bring the risk down to a low level. Key gaps and control deficiencies have been identified.' },
  weak: { label: 'Weak or none', desc: 'The control tools do not allow risks to be managed effectively. There is no reduction in the frequency or impact of risks.' },
}

// ── Risk treatment (Excel "5-Risk treatment")
export interface TreatmentOption { value: string; label: string; desc: string }
export const TREATMENT_OPTIONS: TreatmentOption[] = [
  { value: 'accept', label: 'Accept', desc: 'Keep under control and review (tolerate)' },
  { value: 'transfer', label: 'Transfer', desc: 'Insure the risk or transfer it to another party/partner' },
  { value: 'mitigate', label: 'Mitigate', desc: 'Reduce the likelihood of the risk occurring, or take measures to eliminate the risk' },
  { value: 'avoid', label: 'Avoid', desc: 'Isolate from the area, or do not provide the service until the risk decreases' },
]

// ── Level wording: inherent (natural risk) vs residual (Excel differs!)
import type { RiskLevel } from '@/types'
const INHERENT_WORD: Record<RiskLevel, string> = { minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', critical: 'Maximum' }
const RESIDUAL_WORD: Record<RiskLevel, string> = { minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', critical: 'Very High' }
export function inherentLevelWord(l: RiskLevel): string { return INHERENT_WORD[l] }
export function residualLevelWord(l: RiskLevel): string { return RESIDUAL_WORD[l] }

// ── SLA due-date budget per level (kept from prior phase)
export const SLA_DAYS: Record<RiskLevel, number> = { critical: 30, high: 90, medium: 120, low: 240, minimal: 365 }
export function computeDueDate(level: RiskLevel, fromISO?: string): string {
  const base = fromISO ? new Date(fromISO) : new Date()
  const due = new Date(base)
  due.setDate(due.getDate() + SLA_DAYS[level])
  return due.toISOString().slice(0, 10)
}
