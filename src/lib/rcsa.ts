import type { RiskLevel, UserRole } from '@/types'

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

export function calculateResidualLevel(inherentLevel: RiskLevel, controlRating: ControlRating): RiskLevel {
  // If control is weak or relatively adequate, the risk level is unchanged (Excel Rows 79 and 80)
  if (controlRating === 'weak' || controlRating === 'relatively_adequate') {
    return inherentLevel
  }

  // Excel Row 81: 3 Adekvat
  if (controlRating === 'adequate') {
    switch (inherentLevel) {
      case 'critical': return 'high'
      case 'high': return 'medium'
      case 'medium': return 'low'
      case 'low': return 'minimal'
      case 'minimal': return 'minimal'
    }
  }

  // Excel Row 82: 2 Nisbətən Güclü
  if (controlRating === 'relatively_strong') {
    switch (inherentLevel) {
      case 'critical': return 'medium'
      case 'high': return 'medium'
      case 'medium': return 'low'
      case 'low': return 'minimal'
      case 'minimal': return 'minimal'
    }
  }

  // Excel Row 83: 1 Güclü
  if (controlRating === 'strong') {
    switch (inherentLevel) {
      case 'critical': return 'medium' // Special Limit Rule: even with strong controls, critical inherent remains medium
      case 'high': return 'low'
      case 'medium': return 'low'
      case 'low': return 'minimal'
      case 'minimal': return 'minimal'
    }
  }

  return inherentLevel
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
