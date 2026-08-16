import { describe, it, expect } from 'vitest'
import { hasAccess, isExceptionActive } from './permissions'
import type { AccessException } from '@/types'

// Test planı — Xüsusi icazə (Access Exception) məntiqi (phase53)

const NOW = new Date('2026-08-16T00:00:00Z')
const ex = (over: Partial<AccessException>): AccessException => ({
  id: 'e1', org_id: 'o1', user_id: 'u1', entity_type: 'risk', entity_id: null,
  permission: 'view', reason: 'test', starts_at: '2026-01-01', expires_at: null,
  revoked: false, created_at: '2026-01-01', ...over,
})

describe('isExceptionActive', () => {
  it('başlanıb, bitməyib, ləğv olunmayıb → aktiv', () => {
    expect(isExceptionActive(ex({}), NOW)).toBe(true)
  })
  it('ləğv olunub → passiv', () => {
    expect(isExceptionActive(ex({ revoked: true }), NOW)).toBe(false)
  })
  it('müddəti keçib → passiv', () => {
    expect(isExceptionActive(ex({ expires_at: '2026-06-01' }), NOW)).toBe(false)
  })
  it('hələ başlamayıb → passiv', () => {
    expect(isExceptionActive(ex({ starts_at: '2026-12-01' }), NOW)).toBe(false)
  })
})

describe('hasAccess', () => {
  const user = { id: 'u1' }

  it('aktiv icazə uyğun obyekt növünə giriş verir', () => {
    expect(hasAccess(user, [ex({})], 'risk', 'r5', 'view', NOW)).toBe(true)
  })
  it('başqa istifadəçiyə giriş vermir', () => {
    expect(hasAccess({ id: 'u2' }, [ex({})], 'risk', 'r5', 'view', NOW)).toBe(false)
  })
  it('başqa obyekt növünə giriş vermir', () => {
    expect(hasAccess(user, [ex({ entity_type: 'audit' })], 'risk', 'r5', 'view', NOW)).toBe(false)
  })
  it("entity_type='all' bütün növləri əhatə edir", () => {
    expect(hasAccess(user, [ex({ entity_type: 'all' })], 'incident', 'i1', 'view', NOW)).toBe(true)
  })
  it('konkret entity_id yalnız həmin obyektə uyğun gəlir', () => {
    const list = [ex({ entity_id: 'r5' })]
    expect(hasAccess(user, list, 'risk', 'r5', 'view', NOW)).toBe(true)
    expect(hasAccess(user, list, 'risk', 'r9', 'view', NOW)).toBe(false)
  })
  it('icazə səviyyəsi tələbi: view icazəsi edit tələbini ödəmir', () => {
    expect(hasAccess(user, [ex({ permission: 'view' })], 'risk', 'r5', 'edit', NOW)).toBe(false)
  })
  it('approve icazəsi view və edit tələbini ödəyir (approve ⊇ edit ⊇ view)', () => {
    const list = [ex({ permission: 'approve' })]
    expect(hasAccess(user, list, 'risk', 'r5', 'view', NOW)).toBe(true)
    expect(hasAccess(user, list, 'risk', 'r5', 'edit', NOW)).toBe(true)
    expect(hasAccess(user, list, 'risk', 'r5', 'approve', NOW)).toBe(true)
  })
  it('ləğv olunmuş/bitmiş icazə giriş vermir', () => {
    expect(hasAccess(user, [ex({ revoked: true })], 'risk', 'r5', 'view', NOW)).toBe(false)
    expect(hasAccess(user, [ex({ expires_at: '2026-01-02' })], 'risk', 'r5', 'view', NOW)).toBe(false)
  })
  it('istifadəçi yoxdursa false', () => {
    expect(hasAccess(null, [ex({})], 'risk', 'r5', 'view', NOW)).toBe(false)
  })
})
