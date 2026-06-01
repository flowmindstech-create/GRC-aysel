import type { RiskLevel } from '@/types'

// Inherent Risk 5x5 Matrix (Likelihood: 1-5, Impact: 1-5)
// Rows: Likelihood (1-5), Columns: Impact (1-5)
const INHERENT_MATRIX: RiskLevel[][] = [
  // L1
  ['low', 'low', 'low', 'low', 'medium'],
  // L2
  ['low', 'low', 'low', 'medium', 'medium'],
  // L3
  ['low', 'low', 'medium', 'high', 'high'],
  // L4
  ['low', 'medium', 'high', 'high', 'critical'],
  // L5
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
    case 'low': return 1
    case 'medium': return 2
    case 'high': return 3
    case 'critical': return 4
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
  // If control is weak or relatively adequate, the risk level is unchanged
  if (controlRating === 'weak' || controlRating === 'relatively_adequate') {
    return inherentLevel
  }

  if (controlRating === 'adequate') {
    switch (inherentLevel) {
      case 'critical': return 'high'
      case 'high': return 'medium'
      case 'medium': return 'low'
      case 'low': return 'low'
    }
  }

  if (controlRating === 'relatively_strong') {
    switch (inherentLevel) {
      case 'critical': return 'medium'
      case 'high': return 'medium'
      case 'medium': return 'low'
      case 'low': return 'low'
    }
  }

  if (controlRating === 'strong') {
    switch (inherentLevel) {
      case 'critical': return 'medium' // Special Limit Rule: even with strong controls, critical inherent remains medium
      case 'high': return 'low'
      case 'medium': return 'low'
      case 'low': return 'low'
    }
  }

  return inherentLevel
}

export type TreatmentStrategy = 'accept' | 'mitigate' | 'transfer' | 'avoid'

export function getAllowedTreatmentStrategies(inherentLevel: RiskLevel): TreatmentStrategy[] {
  switch (inherentLevel) {
    case 'critical':
      return ['mitigate', 'avoid']
    case 'high':
    case 'medium':
      return ['mitigate', 'transfer', 'avoid']
    case 'low':
    default:
      return ['accept', 'transfer', 'mitigate']
  }
}
