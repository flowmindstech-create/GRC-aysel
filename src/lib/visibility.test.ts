import { describe, it, expect } from 'vitest'
import {
  canSeeIncident, canSeeRisk, isOpenIncident, isOpenRisk,
  visibleOpenIncidents, visibleOpenRisks,
} from './visibility'
import type { Incident, Risk, UserProfile, UserRole } from '@/types'

// Test planı 1. Funksional — sidebar badge-i ilə cədvəl sayının uyğunluğu.
// Bug: badge bütün insidentləri sayırdı, cədvəl isə RBAC ilə filtrləyirdi —
// badge 2 göstərirdi, cədvəl boş idi.

const user = (role: UserRole, id = 'u-me', full_name = 'Mən Özüm'): UserProfile => ({
  id, org_id: 'org1', full_name, email: `${id}@x.az`, role, created_at: '2026-01-01T00:00:00Z',
})

const incident = (over: Partial<Incident> = {}): Incident => ({
  id: 'i1', org_id: 'org1', title: 'Insident', description: 'təsvir',
  severity: 'medium', status: 'open',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  ...over,
} as Incident)

const risk = (over: Partial<Risk> = {}): Risk => ({
  id: 'r1', org_id: 'org1', title: 'Risk', description: 'təsvir',
  category: 'operational', level: 'medium', status: 'open',
  likelihood: 3, impact: 3,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  ...over,
} as Risk)

describe('canSeeIncident', () => {
  it('risk_manager və yuxarı hamısını görür', () => {
    const other = incident({ reported_by: 'someone-else' })
    expect(canSeeIncident(user('risk_manager'), other)).toBe(true)
    expect(canSeeIncident(user('admin'), other)).toBe(true)
    expect(canSeeIncident(user('super_admin'), other)).toBe(true)
  })

  it('auditor başqasının insidentini GÖRMÜR (məxfilik həddi risk_manager-dir)', () => {
    expect(canSeeIncident(user('auditor'), incident({ reported_by: 'someone-else' }))).toBe(false)
  })

  it('əməkdaş başqasının insidentini görmür', () => {
    expect(canSeeIncident(user('employee'), incident({ reported_by: 'someone-else' }))).toBe(false)
  })

  it('bildirən, təyin olunan və həll məsulu id ilə görür', () => {
    const e = user('employee')
    expect(canSeeIncident(e, incident({ reported_by: 'u-me' }))).toBe(true)
    expect(canSeeIncident(e, incident({ assigned_to: 'u-me' }))).toBe(true)
    expect(canSeeIncident(e, incident({ resolution_assignee: 'u-me' }))).toBe(true)
  })

  it('araşdırma rəhbəri/üzvü və reporter ada görə görür', () => {
    const e = user('employee')
    expect(canSeeIncident(e, incident({ reporter_person: 'Mən Özüm' }))).toBe(true)
    expect(canSeeIncident(e, incident({ investigation_lead: 'Mən Özüm' }))).toBe(true)
    expect(canSeeIncident(e, incident({ investigation_members: ['Başqası', 'Mən Özüm'] }))).toBe(true)
  })

  it('profil yoxdursa görmür', () => {
    expect(canSeeIncident(null, incident({ reported_by: 'u-me' }))).toBe(false)
  })
})

describe('canSeeRisk', () => {
  it('auditor və yuxarı hamısını görür', () => {
    const other = risk({ created_by: 'someone-else' })
    expect(canSeeRisk(user('auditor'), other)).toBe(true)
    expect(canSeeRisk(user('risk_manager'), other)).toBe(true)
  })

  it('əməkdaş yalnız sahibi olduğu və ya yaratdığı riski görür', () => {
    const e = user('employee')
    expect(canSeeRisk(e, risk({ created_by: 'someone-else' }))).toBe(false)
    expect(canSeeRisk(e, risk({ owner_id: 'u-me' }))).toBe(true)
    expect(canSeeRisk(e, risk({ created_by: 'u-me' }))).toBe(true)
    expect(canSeeRisk(e, risk({ owner_name: 'Mən Özüm' }))).toBe(true)
    expect(canSeeRisk(e, risk({ created_by_name: 'Mən Özüm' }))).toBe(true)
  })
})

describe('açıq/bağlı vəziyyət', () => {
  it('done və closed açıq sayılmır', () => {
    expect(isOpenIncident(incident({ status: 'open' }))).toBe(true)
    expect(isOpenIncident(incident({ status: 'done' }))).toBe(false)
    expect(isOpenIncident(incident({ status: 'closed' }))).toBe(false)
  })

  it('risk yalnız open/in_progress-də açıqdır', () => {
    expect(isOpenRisk(risk({ status: 'open' }))).toBe(true)
    expect(isOpenRisk(risk({ status: 'in_progress' }))).toBe(true)
    expect(isOpenRisk(risk({ status: 'done' } as Partial<Risk>))).toBe(false)
  })
})

describe('badge sayı cədvəllə uyğun gəlir (əsas bug)', () => {
  const list = [
    incident({ id: 'a', reported_by: 'someone-else' }),          // görünmür
    incident({ id: 'b', reported_by: 'another-one' }),           // görünmür
    incident({ id: 'c', reported_by: 'u-me' }),                  // görünür
    incident({ id: 'd', reported_by: 'u-me', status: 'closed' }),// görünür, amma bağlı
  ]

  it('əməkdaş üçün badge yalnız öz açıq insidentini sayır', () => {
    const visible = visibleOpenIncidents(user('employee'), list)
    expect(visible.map(i => i.id)).toEqual(['c'])
  })

  it('başqasının insidenti varsa badge 0 verir — cədvəl də boş olur', () => {
    const onlyOthers = [list[0], list[1]]
    expect(visibleOpenIncidents(user('employee'), onlyOthers)).toHaveLength(0)
  })

  it('risk_manager bütün açıqları sayır', () => {
    expect(visibleOpenIncidents(user('risk_manager'), list)).toHaveLength(3)
  })

  it('visibleOpenRisks eyni məntiqi risklərə tətbiq edir', () => {
    const risks = [
      risk({ id: 'x', created_by: 'someone-else' }),
      risk({ id: 'y', created_by: 'u-me' }),
      risk({ id: 'z', created_by: 'u-me', status: 'done' } as Partial<Risk>),
    ]
    expect(visibleOpenRisks(user('employee'), risks).map(r => r.id)).toEqual(['y'])
    expect(visibleOpenRisks(user('auditor'), risks)).toHaveLength(2)
  })
})
