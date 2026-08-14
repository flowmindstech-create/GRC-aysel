import { describe, it, expect } from 'vitest'
import type { UserProfile, Risk, RiskTrigger } from '@/types'
import {
  approvalOnCreate, canViewRisk, canApproveRisk, canEditRecord, canDeleteRecord, canChangeRiskStatus,
} from './access-policy'
import { calculateInherentLevel, aggregateControlEffectiveness, calculateResidualLevel, isTreatmentAllowed } from './rcsa'
import { buildCsv, type ExportColumn } from './export'
import { orgIsActive } from './permissions'
import type { Organization } from '@/types'

// ── Test planı 5. İstifadəçi Qəbul Testi (UAT) — 6 kritik ssenarinin
//    biznes-məntiq səviyyəsində avtomatik yoxlanışı (TEST-PLAN.md § 5).
//    Qeyd: tam UI/DB axını Playwright + canlı mühitdə (tests/e2e) yoxlanılır.

const P = (role: UserProfile['role'], id = 'u-'+role, name = role.toUpperCase()): UserProfile =>
  ({ id, org_id: 'o1', full_name: name, email: '', role, created_at: '' })

const superAdmin = P('super_admin', 'u-super', 'Aysel')
const employee = P('employee', 'u-emp', 'Nurlan')
const riskMgr = P('risk_manager', 'u-rm', 'RM')

describe('UAT 1 — Super Admin hər şeyi görür, təsdiq və silmə edə bilir', () => {
  it('super_admin təsdiq + silmə + redaktə edə bilir', () => {
    expect(canApproveRisk(superAdmin)).toBe(true)
    expect(canDeleteRecord(superAdmin)).toBe(true)
    expect(canEditRecord(superAdmin)).toBe(true)
  })
  it('adi istifadəçi təsdiq/silmə/redaktə EDƏ BİLMİR', () => {
    expect(canApproveRisk(employee)).toBe(false)
    expect(canDeleteRecord(employee)).toBe(false)
    expect(canEditRecord(employee)).toBe(false)
  })
})

describe('UAT 2 — Employee risk yaradır: pending düşür, öz yaratdığını görür, başqasınınkını yox', () => {
  const mine: Risk = { created_by: 'u-emp', created_by_name: 'Nurlan' } as Risk
  const others: Risk = { created_by: 'u-x', owner_id: 'u-y' } as Risk

  it('yeni risk pending statusu ilə yaranır', () => {
    expect(approvalOnCreate('employee')).toBe('pending')
  })
  it('öz yaratdığı riski görür', () => {
    expect(canViewRisk(employee, mine)).toBe(true)
  })
  it('başqasının riskini GÖRMÜR', () => {
    expect(canViewRisk(employee, others)).toBe(false)
  })
  it('öz riskini redaktə/status dəyişə bilmir', () => {
    expect(canEditRecord(employee)).toBe(false)
    expect(canChangeRiskStatus(employee)).toBe(false)
  })
})

describe('UAT 3 — Super Admin təsdiqləyir; adi istifadəçi özü təsdiqləyə bilmir', () => {
  it('super_admin yaratsa dərhal approved', () => {
    expect(approvalOnCreate('super_admin')).toBe('approved')
  })
  it('yalnız super_admin təsdiq verə bilir (admin/risk_manager belə yox)', () => {
    expect(canApproveRisk(superAdmin)).toBe(true)
    expect(canApproveRisk(P('admin'))).toBe(false)
    expect(canApproveRisk(riskMgr)).toBe(false)
  })
  it('status axını risk komandasındadır (risk_manager+), employee-də yox', () => {
    expect(canChangeRiskStatus(riskMgr)).toBe(true)
    expect(canChangeRiskStatus(employee)).toBe(false)
  })
})

describe('UAT 4 — Risk qiymətləndirməsi uçdan-uca düz hesablanır', () => {
  it('likelihood×impact → inherent → nəzarət → residual zənciri', () => {
    // Yüksək ehtimal (4) × maksimum təsir (5) = critical inherent
    const inherent = calculateInherentLevel(4, 5)
    expect(inherent).toBe('critical')

    // Güclü nəzarətlər (dizayn+tətbiq ~1) residualı aşağı salır
    const triggers: RiskTrigger[] = [{
      id: 't1', description: 'səbəb',
      controls: [{ id: 'c1', description: 'nəzarət', design_compliance: 1, design_strength: 1, design_timeliness: 1, impl_relevance: 1, impl_sustainability: 1, impl_traceability: 1 }],
    } as RiskTrigger]
    const agg = aggregateControlEffectiveness(triggers)
    expect(agg.rating).toBe('strong')

    const residual = calculateResidualLevel(inherent, agg.rating)
    // critical inherent + strong control → residual medium (matrisdən)
    expect(residual).toBe('medium')
  })
  it('kritik risk üçün "accept" treatment qadağandır (icazə tələb edir)', () => {
    expect(isTreatmentAllowed('critical', 'accept')).toBe(false)
    expect(isTreatmentAllowed('critical', 'mitigate')).toBe(true)
  })
})

describe('UAT 5 — Reyestr ixracı: filtrlənmiş data düz, AZ hərfləri korrekt', () => {
  it('görünən sütun+sətir CSV-ə düz köçür', () => {
    interface R { code: string; title: string; level: string }
    const cols: ExportColumn<R>[] = [
      { key: 'code', label: 'Kod', value: r => r.code },
      { key: 'title', label: 'Risk', value: r => r.title },
      { key: 'level', label: 'Səviyyə', value: r => r.level },
    ]
    const rows: R[] = [{ code: 'IT-2026-001', title: 'Məlumat sızması', level: 'critical' }]
    const csv = buildCsv(cols, rows)
    expect(csv.charCodeAt(0)).toBe(0xfeff) // Excel BOM
    expect(csv).toContain('"IT-2026-001","Məlumat sızması","critical"')
  })
})

describe('UAT 6 — Abunə müddəti bitəndə/dayandırılanda giriş bloklanır', () => {
  const NOW = new Date('2026-07-24T00:00:00Z')
  it('aktiv abunə → giriş açıq', () => {
    expect(orgIsActive({ is_active: true, subscription_status: 'active', subscription_expires_at: null } as Organization, NOW)).toBe(true)
  })
  it('dayandırılmış abunə → giriş bloklanır', () => {
    expect(orgIsActive({ is_active: true, subscription_status: 'suspended', subscription_expires_at: null } as Organization, NOW)).toBe(false)
  })
  it('müddəti bitmiş abunə → giriş bloklanır', () => {
    expect(orgIsActive({ is_active: true, subscription_status: 'active', subscription_expires_at: '2026-01-01' } as Organization, NOW)).toBe(false)
  })
})
