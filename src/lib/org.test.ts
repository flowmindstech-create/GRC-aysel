import { describe, it, expect } from 'vitest'
import { resolveOwnerFromUnit } from './org'
import type { OrgUnit, UserProfile } from '@/types'

// Test planı 1. Funksional — sahib/məsul şəxsin strukturdan avtomatik təyini

const profiles: UserProfile[] = [
  { id: 'u1', org_id: 'o1', full_name: 'Aysel Rəcəbli', email: '', role: 'risk_manager', created_at: '' },
  { id: 'u2', org_id: 'o1', full_name: 'Nurlan Səfərov', email: '', role: 'employee', created_at: '' },
]
const unit = (over: Partial<OrgUnit>): OrgUnit => ({
  id: 'd1', org_id: 'o1', name: 'Risk İdarəetməsi', type: 'department', order_index: 0,
  head_user_id: 'u1', head_role: 'Şöbə müdiri', ...over,
} as OrgUnit)

describe('org — resolveOwnerFromUnit', () => {
  it('unit yoxdursa boş sahib qaytarır', () => {
    const r = resolveOwnerFromUnit(undefined, profiles)
    expect(r.owner_id).toBe('')
    expect(r.owner_name).toBe('')
  })

  it('strukturun rəhbərini profillərdən tapır', () => {
    const r = resolveOwnerFromUnit(unit({}), profiles)
    expect(r.owner_id).toBe('u1')
    expect(r.owner_name).toBe('Aysel Rəcəbli')
  })

  it('owner_dept struktur adına bərabərdir', () => {
    const r = resolveOwnerFromUnit(unit({ name: 'Audit' }), profiles)
    expect(r.owner_dept).toBe('Audit')
  })

  it('rəhbər profillərdə yoxdursa owner_id/name boş, rol/şöbə qalır', () => {
    const r = resolveOwnerFromUnit(unit({ head_user_id: 'yox' }), profiles)
    expect(r.owner_id).toBe('')
    expect(r.owner_name).toBe('')
    expect(r.owner_role).toBe('Şöbə müdiri')
    expect(r.owner_dept).toBe('Risk İdarəetməsi')
  })
})
