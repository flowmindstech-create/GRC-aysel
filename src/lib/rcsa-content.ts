// Selection options + explanations for the RCSA matrix, SLA day map, and
// residual-level wording. Single source so the form and the workflow page stay
// in sync (DRY). Explanation texts mirror the Excel risk methodology.

import type { RiskLevel } from '@/types'
import type { ControlRating } from './rcsa'

export interface ScaleOption {
  value: number
  label: string
  desc: string
}

// ── Impact rating (1-5). The 6th "Kritik / fors-major" column is intentionally removed.
export const IMPACT_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Minimal', desc: 'Cüzi təsir; əməliyyatlara və maliyyəyə demək olar ki, təsir yoxdur.' },
  { value: 2, label: 'Aşağı', desc: 'Kiçik təsir; məhdud, asanlıqla idarə olunan nəticələr.' },
  { value: 3, label: 'Orta', desc: 'Hiss olunan təsir; bölmə səviyyəsində pozulma və əlavə xərc.' },
  { value: 4, label: 'Yüksək', desc: 'Ciddi təsir; əhəmiyyətli maliyyə və reputasiya zərəri.' },
  { value: 5, label: 'Maksimum', desc: 'Kritik təsir; geniş miqyaslı, uzunmüddətli ağır nəticələr.' },
]

// ── Likelihood / probability (1-5)
export const LIKELIHOOD_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Rare', desc: 'Nadir hal (<5%).' },
  { value: 2, label: 'Unlikely', desc: 'Az ehtimal olunan (5-10%).' },
  { value: 3, label: 'Possible', desc: 'Mümkün (11-20%).' },
  { value: 4, label: 'Likely', desc: 'Çox ehtimal olunan (21-50%).' },
  { value: 5, label: 'Almost Certain', desc: 'Demək olar ki, qəti (>50%).' },
]

// ── Control effectiveness sub-criteria (1 = strong/best, 5 = weak/worst)
export interface ControlCriterion {
  name:
    | 'control_design_compliance'
    | 'control_design_strength'
    | 'control_design_timeliness'
    | 'control_implementation_relevance'
    | 'control_implementation_sustainability'
    | 'control_implementation_traceability'
  group: 'design' | 'implementation'
  label: string
  options: ScaleOption[]
}

const opt = (descs: [string, string, string, string, string]): ScaleOption[] =>
  descs.map((desc, i) => ({ value: i + 1, label: `${i + 1}`, desc }))

export const CONTROL_CRITERIA: ControlCriterion[] = [
  {
    name: 'control_design_compliance',
    group: 'design',
    label: 'Compliance & Coverage',
    options: opt([
      'Critical risks fully covered; design proportional to risk; standards met. Preventive/immediate.',
      'Risk-based approach, ~90% coverage. Minimal gaps. Mostly timely.',
      'Covers 50-89% of risks, but some design gaps exist. Notable latency.',
      'Covers only 25-49% of risks; design does not cover map. Execution is reactive/unstable.',
      'Covers 0-24% of risks; critical design gaps. Control not timely/applied.',
    ]),
  },
  {
    name: 'control_design_strength',
    group: 'design',
    label: 'Control Strength',
    options: opt([
      'Control design meets testing standards & best practices.',
      'Adequate in most aspects, minimal improvement needed (up to 90% standards addressed).',
      'Inadequate in some areas, moderate improvement needed (up to 70% standards addressed).',
      'Inadequate in several aspects, significant improvement needed (up to 50% standards addressed).',
      'Inadequate in multiple aspects; urgent expansion required.',
    ]),
  },
  {
    name: 'control_design_timeliness',
    group: 'design',
    label: 'Execution Timeliness',
    options: opt([
      'Executed in real-time or immediately. No delay. Preventive.',
      'Preventive, executed on time, minor delays (<10% volume).',
      'Mostly on time, but delays observed (11-49% volume). Detective/preventive.',
      'Frequent delays (50-90% delay). Detective/directive.',
      'Not executed on time (91-100% delay) or not applied at all.',
    ]),
  },
  {
    name: 'control_implementation_relevance',
    group: 'implementation',
    label: 'Relevance & Currency',
    options: opt([
      'Fully relevant (91-100% aligned with risk/business changes).',
      'Highly relevant (~90% aligned), meets business requirements.',
      'Covers key risks (50-89%), moderately aligned. Control has not changed with processes.',
      'Partially relevant (25-49%), meets only some business needs.',
      'Outdated (0-24%), irrelevant/non-functional.',
    ]),
  },
  {
    name: 'control_implementation_sustainability',
    group: 'implementation',
    label: 'Sustainability / Frequency',
    options: opt([
      'Fully automated and applied continuously.',
      'Almost continuously applied, stable.',
      'Applied regularly, but with some interruptions.',
      'Applied occasionally, unsystematic.',
      'Not applied or very rare.',
    ]),
  },
  {
    name: 'control_implementation_traceability',
    group: 'implementation',
    label: 'Traceability / Audit Trail',
    options: opt([
      'Real-time monitoring, full audit trail, complete execution evidence.',
      'Systematic tracking and audit trail exist.',
      'Partially documented tracking and evidence.',
      'Only manual and incomplete tracking.',
      'No monitoring, tracking, or documentation.',
    ]),
  },
]

// ── Control effectiveness result wording
export const CONTROL_RATING_INFO: Record<ControlRating, { label: string; desc: string }> = {
  strong: { label: 'Strong', desc: 'Nəzarət güclüdür; risk effektiv şəkildə azaldılır, qalıq risk minimuma enir.' },
  relatively_strong: { label: 'Relatively Strong', desc: 'Nəzarət nisbətən güclüdür; əhəmiyyətli azalma, kiçik təkmilləşmə imkanı.' },
  adequate: { label: 'Adequate', desc: 'Nəzarət adekvatdır; risk qismən azalır, monitorinq tələb olunur.' },
  relatively_adequate: { label: 'Relatively Adequate', desc: 'Nəzarət zəif-adekvatdır; risk az azalır, təkmilləşmə vacibdir.' },
  weak: { label: 'Weak or None', desc: 'Nəzarət zəifdir və ya yoxdur; risk demək olar ki, azalmır.' },
}

// ── Residual level expressed as a word (AZ degree)
const RESIDUAL_WORD: Record<RiskLevel, string> = {
  minimal: 'Minimal',
  low: 'Aşağı',
  medium: 'Orta',
  high: 'Yüksək',
  critical: 'Kritik',
}

export function residualLevelWord(level: RiskLevel): string {
  return RESIDUAL_WORD[level]
}

// ── SLA: due date day budget per risk level (very high = critical)
export const SLA_DAYS: Record<RiskLevel, number> = {
  critical: 30,
  high: 90,
  medium: 120,
  low: 240,
  minimal: 365,
}

export function slaDaysForLevel(level: RiskLevel): number {
  return SLA_DAYS[level]
}

/** Returns an ISO yyyy-mm-dd due date = fromDate + SLA days for the given level. */
export function computeDueDate(level: RiskLevel, fromISO?: string): string {
  const base = fromISO ? new Date(fromISO) : new Date()
  const due = new Date(base)
  due.setDate(due.getDate() + slaDaysForLevel(level))
  return due.toISOString().slice(0, 10)
}
