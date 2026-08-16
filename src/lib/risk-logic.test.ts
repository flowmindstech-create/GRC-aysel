import { describe, it, expect } from 'vitest'
import { validateRiskConsistency } from './risk-logic'

// Test plan 1. Funksional testlər — Nəzarət tədbirlərinin risklə əlaqələndirilməsi
describe('risk-logic — validateRiskConsistency', () => {
  it('trigger yoxdursa xəbərdarlıq qaytarır', () => {
    const issues = validateRiskConsistency(undefined, 'medium')
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].message).toContain('trigger')
  })

  it('boş trigger siyahısı da xəbərdarlıq verir', () => {
    const issues = validateRiskConsistency([], 'low')
    expect(issues.length).toBeGreaterThan(0)
  })

  it('boş təsvirli trigger xəbərdarlıq verir', () => {
    const issues = validateRiskConsistency(
      [{ id: 't1', description: '   ', controls: [{ id: 'c1', description: 'Ctrl' } as any] } as any],
      'medium'
    )
    expect(issues.some((i) => i.message.includes('description is empty'))).toBe(true)
  })

  it('controls-u olmayan trigger xəbərdarlıq verir', () => {
    const issues = validateRiskConsistency(
      [{ id: 't1', description: 'Trigger 1', controls: [] } as any],
      'medium'
    )
    expect(issues.some((i) => i.message.includes('control'))).toBe(true)
  })

  it('tam dolu trigger/control cütlüyü üçün warning yoxdur (info ola bilər)', () => {
    const issues = validateRiskConsistency(
      [
        {
          id: 't1',
          description: 'Xarici fırıldaqçılıq',
          controls: [{ id: 'c1', description: 'İki nəfərlik imza' } as any],
        } as any,
      ],
      'low'
    )
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes('Trigger 1'))).toBe(false)
  })

  it('yüksək inherent + zəif nəzarət warning verir', () => {
    const issues = validateRiskConsistency(
      [
        {
          id: 't1',
          description: 'Trigger',
          controls: [
            { id: 'c1', description: 'Ctrl', design_compliance: 5, design_strength: 5, design_timeliness: 5, impl_relevance: 5, impl_sustainability: 5, impl_traceability: 5 } as any,
          ],
        } as any,
      ],
      'critical'
    )
    expect(issues.some((i) => i.message.includes('weak'))).toBe(true)
  })
})
