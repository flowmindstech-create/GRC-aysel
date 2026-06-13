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
    issues.push({ severity: 'warning', message: 'Risk üçün heç bir trigger təyin edilməyib. Ən azı bir səbəb əlavə edin.' })
    return issues
  }

  list.forEach((t, i) => {
    if (!t.description?.trim()) {
      issues.push({ severity: 'warning', message: `Trigger ${i + 1}: təsvir boşdur.` })
    }
    if (!t.controls || t.controls.length === 0) {
      issues.push({ severity: 'warning', message: `Trigger ${i + 1}: heç bir control yoxdur — hər trigger ən azı bir control tələb edir.` })
    } else {
      t.controls.forEach((c, j) => {
        if (!c.description?.trim()) {
          issues.push({ severity: 'warning', message: `Trigger ${i + 1} · Control ${j + 1}: təsvir boşdur.` })
        }
      })
    }
  })

  // Inherent vs residual consistency
  const agg = aggregateControlEffectiveness(list)
  const residual = calculateResidualLevel(inherentLevel, agg.rating)
  if (getRiskLevelNumber(inherentLevel) >= getRiskLevelNumber('high') && agg.rating === 'weak') {
    issues.push({ severity: 'warning', message: 'Yüksək/kritik inherent risk, lakin nəzarətlər zəifdir — residual risk yüksək qalır.' })
  }
  if (getRiskLevelNumber(residual) >= getRiskLevelNumber('high')) {
    issues.push({ severity: 'info', message: `Residual risk hələ də yüksəkdir (${residual}). Treatment planı tələb oluna bilər.` })
  }

  return issues
}
