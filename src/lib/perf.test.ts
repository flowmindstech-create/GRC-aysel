import { describe, it, expect } from 'vitest'
import { calculateInherentLevel, calculateResidualLevel } from './rcsa'
import { can } from './permissions'
import type { UserRole } from '@/types'

// Test planı 4. Performans (smoke) — hesablama qatı böyük həcmdə məqbul müddətdə
// işləməlidir. Real yük/konkurrensiya testi k6/Playwright ilə ayrıca aparılır
// (bax TEST-PLAN.md) — bu, yalnız alqoritmik regresiya qoruyucusudur.

describe('performans smoke — hesablama qatı', () => {
  it('50k risk üçün inherent+residual < 250ms', () => {
    const t0 = performance.now()
    let acc = 0
    for (let i = 0; i < 50_000; i++) {
      const l = (i % 5) + 1
      const im = ((i * 3) % 5) + 1
      const inherent = calculateInherentLevel(l, im)
      const residual = calculateResidualLevel(inherent, 'adequate')
      acc += residual.length
    }
    const ms = performance.now() - t0
    expect(acc).toBeGreaterThan(0)
    expect(ms).toBeLessThan(250)
  })

  it('100k RBAC yoxlaması < 100ms', () => {
    const roles: UserRole[] = ['super_admin', 'admin', 'risk_manager', 'auditor', 'employee']
    const t0 = performance.now()
    let allowed = 0
    for (let i = 0; i < 100_000; i++) {
      if (can({ role: roles[i % roles.length] }, 'delete')) allowed++
    }
    const ms = performance.now() - t0
    expect(allowed).toBeGreaterThan(0)
    expect(ms).toBeLessThan(100)
  })
})
