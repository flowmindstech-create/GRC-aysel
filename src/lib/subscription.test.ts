import { describe, it, expect } from 'vitest'
import { orgIsActive } from './permissions'
import type { Organization } from '@/types'

// Test planı 3. Təhlükəsizlik — abunə qıfılı (phase51 access gate).
// FAIL-OPEN: naməlum/boş → aktiv; blok yalnız açıq deaktivdə.

type SubOrg = Pick<Organization, 'is_active' | 'subscription_status' | 'subscription_expires_at'>
const NOW = new Date('2026-07-24T00:00:00Z')

describe('subscription gate — orgIsActive', () => {
  it('aktiv abunə (status active, müddət yoxdur) → true', () => {
    const org: SubOrg = { is_active: true, subscription_status: 'active', subscription_expires_at: null }
    expect(orgIsActive(org, NOW)).toBe(true)
  })

  it('suspended status → false (giriş kəsilir)', () => {
    expect(orgIsActive({ is_active: true, subscription_status: 'suspended', subscription_expires_at: null }, NOW)).toBe(false)
  })

  it('cancelled status → false', () => {
    expect(orgIsActive({ is_active: true, subscription_status: 'cancelled', subscription_expires_at: null }, NOW)).toBe(false)
  })

  it('past_due status hələ də işləyir (grace) → true', () => {
    expect(orgIsActive({ is_active: true, subscription_status: 'past_due', subscription_expires_at: null }, NOW)).toBe(true)
  })

  it('bitmə tarixi keçib → false', () => {
    expect(orgIsActive({ is_active: true, subscription_status: 'active', subscription_expires_at: '2026-01-01T00:00:00Z' }, NOW)).toBe(false)
  })

  it('gələcək bitmə tarixi + aktiv → true', () => {
    expect(orgIsActive({ is_active: true, subscription_status: 'active', subscription_expires_at: '2027-01-01T00:00:00Z' }, NOW)).toBe(true)
  })

  it('is_active=false → false (əl ilə söndürülüb)', () => {
    expect(orgIsActive({ is_active: false, subscription_status: 'active', subscription_expires_at: null }, NOW)).toBe(false)
  })

  it('FAIL-OPEN: org null → true (heç kim təsadüfən kilidlənmir)', () => {
    expect(orgIsActive(null, NOW)).toBe(true)
    expect(orgIsActive(undefined, NOW)).toBe(true)
  })

  it('FAIL-OPEN: bütün sahələr boş/undefined → true', () => {
    expect(orgIsActive({} as SubOrg, NOW)).toBe(true)
  })
})
