import type { RiskLevel, UserRole, RiskControlActivity, RiskTrigger } from '@/types'

// Inherent Risk 5x5 Matrix (Likelihood: 1-5, Impact: 1-5)
// Rows: Likelihood (1-5), Columns: Impact (1-5)
// Matches 'Risk metodologiyası' Row 035-039 from Excel policy
const INHERENT_MATRIX: RiskLevel[][] = [
  // L1 (Nadir)
  ['minimal', 'minimal', 'minimal', 'low', 'medium'],
  // L2 (Az ehtimal edilən)
  ['minimal', 'low', 'low', 'medium', 'medium'],
  // L3 (Mümkün)
  ['minimal', 'low', 'medium', 'high', 'high'],
  // L4 (Çox ehtimal edilən)
  ['low', 'medium', 'high', 'high', 'critical'],
  // L5 (Mütəmadi)
  ['low', 'medium', 'high', 'critical', 'critical']
]

export function calculateInherentLevel(likelihood: number, impact: number): RiskLevel {
  const lIdx = Math.max(1, Math.min(5, likelihood)) - 1
  const iIdx = Math.max(1, Math.min(5, impact)) - 1
  return INHERENT_MATRIX[lIdx][iIdx]
}

export type ControlRating = 'strong' | 'relatively_strong' | 'adequate' | 'relatively_adequate' | 'weak'

export interface ControlEvaluation {
  score: number
  rating: ControlRating
  label: string
  designAvg: number
  implementationAvg: number
}

export function evaluateControlEffectiveness(
  designCompliance: number,
  designStrength: number,
  designTimeliness: number,
  implementationRelevance: number,
  implementationSustainability: number,
  implementationTraceability: number
): ControlEvaluation {
  const dComp = Math.max(1, Math.min(5, designCompliance || 3))
  const dStren = Math.max(1, Math.min(5, designStrength || 3))
  const dTime = Math.max(1, Math.min(5, designTimeliness || 3))
  const iRel = Math.max(1, Math.min(5, implementationRelevance || 3))
  const iSust = Math.max(1, Math.min(5, implementationSustainability || 3))
  const iTrac = Math.max(1, Math.min(5, implementationTraceability || 3))

  const designAvg = (dComp + dStren + dTime) / 3
  const implementationAvg = (iRel + iSust + iTrac) / 3
  const score = (designAvg + implementationAvg) / 2

  let rating: ControlRating = 'weak'
  let label = 'Weak or None'

  if (score <= 1.5) {
    rating = 'strong'
    label = 'Strong'
  } else if (score <= 2.5) {
    rating = 'relatively_strong'
    label = 'Relatively Strong'
  } else if (score <= 3.5) {
    rating = 'adequate'
    label = 'Adequate'
  } else if (score <= 4.5) {
    rating = 'relatively_adequate'
    label = 'Relatively Adequate'
  }

  return { score, rating, label, designAvg, implementationAvg }
}

// Per-control effectiveness — Excel methodology: average of Design (Dizayn) + Implementation (Tətbiqi).
// Falls back to the legacy 6 sub-criteria if the new fields are absent.
export function ratingFromScore(score: number): { rating: ControlRating; label: string } {
  if (score <= 1.5) return { rating: 'strong', label: 'Strong' }
  if (score <= 2.5) return { rating: 'relatively_strong', label: 'Relatively Strong' }
  if (score <= 3.5) return { rating: 'adequate', label: 'Adequate' }
  if (score <= 4.5) return { rating: 'relatively_adequate', label: 'Relatively Adequate' }
  return { rating: 'weak', label: 'Weak or None' }
}

export function evaluateControlActivity(a: RiskControlActivity): ControlEvaluation {
  // 6 sub-criteria: Design (compliance/strength/timeliness) + Implementation (relevance/sustainability/traceability)
  return evaluateControlEffectiveness(
    a.design_compliance || 3,
    a.design_strength || 3,
    a.design_timeliness || 3,
    a.impl_relevance || 3,
    a.impl_sustainability || 3,
    a.impl_traceability || 3
  )
}

// Aggregate effectiveness across all control activities of all triggers.
// Averages the per-control scores; no controls → weakest rating (no reduction).
export function aggregateControlEffectiveness(triggers: RiskTrigger[] | undefined): ControlEvaluation {
  const controls = (triggers ?? []).flatMap((t) => t.controls ?? [])
  if (controls.length === 0) {
    return { score: 5, rating: 'weak', label: 'Weak or None', designAvg: 5, implementationAvg: 5 }
  }
  let scoreSum = 0
  let designSum = 0
  let implSum = 0
  for (const c of controls) {
    const e = evaluateControlActivity(c)
    scoreSum += e.score
    designSum += e.designAvg
    implSum += e.implementationAvg
  }
  const n = controls.length
  const score = scoreSum / n
  let rating: ControlRating = 'weak'
  let label = 'Weak or None'
  if (score <= 1.5) { rating = 'strong'; label = 'Strong' }
  else if (score <= 2.5) { rating = 'relatively_strong'; label = 'Relatively Strong' }
  else if (score <= 3.5) { rating = 'adequate'; label = 'Adequate' }
  else if (score <= 4.5) { rating = 'relatively_adequate'; label = 'Relatively Adequate' }
  return { score, rating, label, designAvg: designSum / n, implementationAvg: implSum / n }
}

export function getRiskLevelNumber(level: RiskLevel): number {
  switch (level) {
    case 'minimal': return 1
    case 'low': return 2
    case 'medium': return 3
    case 'high': return 4
    case 'critical': return 5
    default: return 1
  }
}

export function calculateRiskGap(residualLevel: RiskLevel, targetLevel: string | undefined): { gap: number; text: string } {
  if (!targetLevel) return { gap: 0, text: 'On Target' }
  const resNum = getRiskLevelNumber(residualLevel)
  const tarNum = getRiskLevelNumber(targetLevel as RiskLevel)
  const gap = resNum - tarNum
  
  if (gap <= 0) {
    return { gap: 0, text: 'On Target' }
  } else {
    return { gap, text: `${gap} Level Gap (Mitigation Required)` }
  }
}

// Residual matrix — verbatim from Excel "Qalıq Risk" table.
// Rows: control rating (strong=1 … weak=5). Cols: inherent level (minimal..critical).
// Residual "critical" is displayed as "Çox Yüksək" (see residualLevelWord).
const RESIDUAL_MATRIX: Record<ControlRating, RiskLevel[]> = {
  // inherent:        minimal     low         medium      high        critical
  strong:            ['minimal', 'minimal', 'low',      'low',      'medium'],
  relatively_strong: ['minimal', 'minimal', 'low',      'medium',   'medium'],
  adequate:          ['minimal', 'minimal', 'low',      'medium',   'high'],
  relatively_adequate:['minimal','low',     'medium',   'high',     'critical'],
  weak:              ['minimal', 'low',      'medium',   'high',     'critical'],
}

export function calculateResidualLevel(inherentLevel: RiskLevel, controlRating: ControlRating): RiskLevel {
  const col = getRiskLevelNumber(inherentLevel) - 1
  return RESIDUAL_MATRIX[controlRating]?.[col] ?? inherentLevel
}

// Excel special rule: if any impact dimension is 5 (Maksimum), the risk is at least Orta (Medium).
export function applyMaxImpactRule(level: RiskLevel, maxImpact: number): RiskLevel {
  if (maxImpact >= 5 && getRiskLevelNumber(level) < getRiskLevelNumber('medium')) return 'medium'
  return level
}

export type TreatmentStrategy = 'accept' | 'mitigate' | 'transfer' | 'avoid'

export function getAllowedTreatmentStrategies(inherentLevel: RiskLevel): TreatmentStrategy[] {
  switch (inherentLevel) {
    case 'critical':
    case 'high':
    case 'medium':
      return ['mitigate', 'transfer', 'avoid']
    case 'low':
    case 'minimal':
    default:
      return ['accept', 'transfer', 'mitigate']
  }
}

export const TREATMENT_STRATEGY_LABELS: Record<TreatmentStrategy, string> = {
  mitigate: 'Mitigate',
  accept: 'Accept',
  transfer: 'Transfer',
  avoid: 'Avoid',
}

// Role-based gating for who may choose a treatment strategy:
// admin & risk_manager → all; auditor → view only (none); employee → propose mitigate only.
export function getRoleAllowedStrategies(role: UserRole | undefined): TreatmentStrategy[] {
  switch (role) {
    case 'admin':
    case 'risk_manager':
      return ['mitigate', 'accept', 'transfer', 'avoid']
    case 'employee':
      return ['mitigate']
    case 'auditor':
    default:
      return []
  }
}
