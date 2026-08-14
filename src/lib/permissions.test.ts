import { describe, it, expect } from 'vitest'
import { roleLevel, can, atLeast, isSuperAdmin, ROLE_LEVEL, CAPABILITY_MIN_LEVEL } from './permissions'
import type { UserRole } from '@/types'

// Test plan 1. Funksional testlər — istifadəçi rolları və səlahiyyətlər
describe('permissions (RBAC)', () => {
  it('rol səviyyələri azalan sıradadır: super_admin > admin > risk_manager > auditor > employee', () => {
    expect(ROLE_LEVEL.super_admin).toBeGreaterThan(ROLE_LEVEL.admin)
    expect(ROLE_LEVEL.admin).toBeGreaterThan(ROLE_LEVEL.risk_manager)
    expect(ROLE_LEVEL.risk_manager).toBeGreaterThan(ROLE_LEVEL.auditor)
    expect(ROLE_LEVEL.auditor).toBeGreaterThan(ROLE_LEVEL.employee)
  })

  it('naməlum rol üçün səviyyə 0-dır', () => {
    expect(roleLevel(undefined)).toBe(0)
    expect(roleLevel(null)).toBe(0)
    expect(roleLevel('ghost' as UserRole)).toBe(0)
  })

  it('read üçün employee kifayətdir', () => {
    expect(can({ role: 'employee' }, 'read')).toBe(true)
    expect(can({ role: 'employee' }, 'read')).toBe(true)
  })

  it('delete və manage_users YALNIZ super_admin üçündür', () => {
    expect(can({ role: 'admin' }, 'delete')).toBe(false)
    expect(can({ role: 'admin' }, 'manage_users')).toBe(false)
    expect(can({ role: 'super_admin' }, 'delete')).toBe(true)
    expect(can({ role: 'super_admin' }, 'manage_users')).toBe(true)
  })

  it('approve YALNIZ super_admin üçündür (GRC qaydası)', () => {
    expect(can({ role: 'risk_manager' }, 'approve')).toBe(false)
    expect(can({ role: 'admin' }, 'approve')).toBe(false)
    expect(can({ role: 'super_admin' }, 'approve')).toBe(true)
  })

  it('create/edit risk_manager və yuxarı üçündür, auditor üçün yox', () => {
    expect(can({ role: 'auditor' }, 'create')).toBe(false)
    expect(can({ role: 'risk_manager' }, 'create')).toBe(true)
    expect(can({ role: 'risk_manager' }, 'edit')).toBe(true)
  })

  it('export/run_test auditor və yuxarı üçündür', () => {
    expect(can({ role: 'employee' }, 'export')).toBe(false)
    expect(can({ role: 'auditor' }, 'export')).toBe(true)
    expect(can({ role: 'auditor' }, 'run_test')).toBe(true)
  })

  it('atLeast müqayisəsi düzgün işləyir', () => {
    expect(atLeast({ role: 'admin' }, 'risk_manager')).toBe(true)
    expect(atLeast({ role: 'auditor' }, 'admin')).toBe(false)
    expect(atLeast({ role: 'super_admin' }, 'super_admin')).toBe(true)
  })

  it('isSuperAdmin yalnız super_admin üçün true qaytarır', () => {
    expect(isSuperAdmin({ role: 'super_admin' })).toBe(true)
    expect(isSuperAdmin({ role: 'admin' })).toBe(false)
    expect(isSuperAdmin(null)).toBe(false)
  })

  it('hər capability üçün minimum səviyyə təyin olunub', () => {
    const caps = ['read', 'export', 'run_test', 'create', 'edit', 'manage_settings', 'approve', 'delete', 'manage_users'] as const
    for (const c of caps) {
      expect(CAPABILITY_MIN_LEVEL[c]).toBeGreaterThan(0)
    }
  })
})
