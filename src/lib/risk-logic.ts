import type { RiskLevel, RiskTrigger } from '@/types'
import { aggregateControlEffectiveness, getRiskLevelNumber, calculateResidualLevel } from './rcsa'

export interface ConsistencyIssue {
  severity: 'warning' | 'info'
  message: string
}

/**
 * Logical-consistency checks between triggers, controls and the risk level.
 * Returns human-readable issues to surface in the form (not hard blocks).
 */
export function validateRiskConsistency(
  triggers: RiskTrigger[] | undefined,
  inherentLevel: RiskLevel
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  const list = triggers ?? []

  if (list.length === 0) {
    issues.push({ severity: 'warning', message: 'No triggers defined for the risk. Add at least one cause.' })
    return issues
  }

  list.forEach((t, i) => {
    if (!t.description?.trim()) {
      issues.push({ severity: 'warning', message: `Trigger ${i + 1}: description is empty.` })
    }
    if (!t.controls || t.controls.length === 0) {
      issues.push({ severity: 'warning', message: `Trigger ${i + 1}: no controls — each trigger requires at least one control.` })
    } else {
      t.controls.forEach((c, j) => {
        if (!c.description?.trim()) {
          issues.push({ severity: 'warning', message: `Trigger ${i + 1} · Control ${j + 1}: description is empty.` })
        }
      })
    }
  })

  // Inherent vs residual consistency
  const agg = aggregateControlEffectiveness(list)
  const residual = calculateResidualLevel(inherentLevel, agg.rating)
  if (getRiskLevelNumber(inherentLevel) >= getRiskLevelNumber('high') && agg.rating === 'weak') {
    issues.push({ severity: 'warning', message: 'High/critical inherent risk, but the controls are weak — residual risk stays high.' })
  }
  if (getRiskLevelNumber(residual) >= getRiskLevelNumber('high')) {
    issues.push({ severity: 'info', message: `Residual risk is still high (${residual}). A treatment plan may be required.` })
  }

  return issues
}
