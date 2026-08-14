import { describe, it, expect } from 'vitest'
import {
  calculateInherentLevel,
  evaluateControlEffectiveness,
  ratingFromScore,
  aggregateControlEffectiveness,
  calculateResidualLevel,
  applyMaxImpactRule,
  getAllowedTreatmentStrategies,
  isTreatmentAllowed,
  getRoleAllowedStrategies,
  getRiskLevelNumber,
  calculateRiskGap,
} from './rcsa'

// Test plan 1. Funksional testlər — Risk qiymətləndirilməsi, RCSA, nəzarət tədbirləri
describe('rcsa — inherent risk matrix (5x5)', () => {
  it('5x5 matrisin künc dəyərləri düzgündür', () => {
    expect(calculateInherentLevel(1, 1)).toBe('minimal')
    expect(calculateInherentLevel(5, 5)).toBe('critical')
    expect(calculateInherentLevel(1, 5)).toBe('medium')
    expect(calculateInherentLevel(5, 1)).toBe('low')
  })

  it('diapazondan kənar dəyərlər clamp olunur', () => {
    expect(calculateInherentLevel(0, 0)).toBe('minimal')
    expect(calculateInherentLevel(99, 99)).toBe('critical')
  })

  it('orta dəyərlər gözlənilən səviyyəni verir', () => {
    expect(calculateInherentLevel(3, 3)).toBe('medium')
    expect(calculateInherentLevel(4, 4)).toBe('high')
    expect(calculateInherentLevel(3, 5)).toBe('high')
  })
})

describe('rcsa — control effectiveness', () => {
  it('güclü nəzarətlər (1-lər) strong rating verir', () => {
    const r = evaluateControlEffectiveness(1, 1, 1, 1, 1, 1)
    expect(r.rating).toBe('strong')
    expect(r.score).toBeLessThanOrEqual(1.5)
  })

  it('zəif nəzarətlər (5-lər) weak rating verir', () => {
    const r = evaluateControlEffectiveness(5, 5, 5, 5, 5, 5)
    expect(r.rating).toBe('weak')
    expect(r.score).toBeGreaterThan(4.5)
  })

  it('default qiymətlər (boş → 3) adequate verir', () => {
    const r = evaluateControlEffectiveness(0, 0, 0, 0, 0, 0)
    expect(r.rating).toBe('adequate')
  })

  it('diapazondan kənar dəyərlər clamp olunur', () => {
    const r = evaluateControlEffectiveness(10, -5, 99, 1, 1, 1)
    expect(r.score).toBeGreaterThanOrEqual(1)
    expect(r.score).toBeLessThanOrEqual(5)
  })

  it('ratingFromScore sərhəd qiymətləri düzgün xəritələyir', () => {
    expect(ratingFromScore(1.5).rating).toBe('strong')
    expect(ratingFromScore(2.5).rating).toBe('relatively_strong')
    expect(ratingFromScore(3.5).rating).toBe('adequate')
    expect(ratingFromScore(4.5).rating).toBe('relatively_adequate')
    expect(ratingFromScore(5).rating).toBe('weak')
  })
})

describe('rcsa — aggregate effectiveness & residual', () => {
  it('nəzarət olmayan triggerlər weak qaytarır', () => {
    const r = aggregateControlEffectiveness([])
    expect(r.rating).toBe('weak')
    expect(r.score).toBe(5)
  })

  it('güclü nəzarətli triggerlər residual riski azaldır', () => {
    const triggers = [
      {
        id: 't1',
        description: 'Trigger',
        controls: [
          { id: 'c1', description: 'Ctrl', design_compliance: 1, design_strength: 1, design_timeliness: 1, impl_relevance: 1, impl_sustainability: 1, impl_traceability: 1 } as any,
        ],
      } as any,
    ]
    const agg = aggregateControlEffectiveness(triggers)
    expect(agg.rating).toBe('strong')
    const residual = calculateResidualLevel('high', agg.rating)
    expect(residual).toBe('low')
  })

  it('residual matris əsas cədvələ uyğundur', () => {
    expect(calculateResidualLevel('critical', 'weak')).toBe('critical')
    expect(calculateResidualLevel('critical', 'strong')).toBe('medium')
    expect(calculateResidualLevel('minimal', 'weak')).toBe('minimal')
    expect(calculateResidualLevel('medium', 'adequate')).toBe('low')
  })
})

describe('rcsa — max impact rule & treatments', () => {
  it('maksimum təsir 5 olarsa risk ən azı medium olur', () => {
    expect(applyMaxImpactRule('low', 5)).toBe('medium')
    expect(applyMaxImpactRule('high', 5)).toBe('high')
    expect(applyMaxImpactRule('minimal', 4)).toBe('minimal')
  })

  it('yüksək risklərdə accept qadağandır', () => {
    expect(isTreatmentAllowed('high', 'accept')).toBe(false)
    expect(isTreatmentAllowed('critical', 'accept')).toBe(false)
    expect(isTreatmentAllowed('low', 'accept')).toBe(true)
  })

  it('allowed treatment strategiyaları risk səviyyəsinə görə dəyişir', () => {
    expect(getAllowedTreatmentStrategies('high')).toContain('mitigate')
    expect(getAllowedTreatmentStrategies('high')).not.toContain('accept')
    expect(getAllowedTreatmentStrategies('minimal')).toContain('accept')
  })

  it('rola görə treatment seçimi məhdudlaşır', () => {
    expect(getRoleAllowedStrategies('admin')).toHaveLength(4)
    expect(getRoleAllowedStrategies('employee')).toEqual(['mitigate'])
    expect(getRoleAllowedStrategies('auditor')).toEqual([])
  })
})

describe('rcsa — risk gap', () => {
  it('target səviyyəyə çatanda gap yoxdur', () => {
    expect(calculateRiskGap('low', 'low').gap).toBe(0)
    expect(calculateRiskGap('low', 'low').text).toBe('On Target')
  })

  it('targetsiz də On Target qaytarır', () => {
    expect(calculateRiskGap('critical', undefined).gap).toBe(0)
  })

  it('residual targetdən yüksəkdirsə gap müsbətdir', () => {
    const r = calculateRiskGap('high', 'low')
    expect(r.gap).toBe(2)
    expect(r.text).toContain('Gap')
  })

  it('getRiskLevelNumber sıralamanı düzgün verir', () => {
    expect(getRiskLevelNumber('minimal')).toBe(1)
    expect(getRiskLevelNumber('critical')).toBe(5)
  })
})
