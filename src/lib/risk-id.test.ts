import { describe, it, expect } from 'vitest'
import { orgUnitCode, generateRiskCode } from './risk-id'
import type { Risk } from '@/types'

// Test plan 1. Funksional testlər — Risklərin yaradılması (unikal kod generasiyası)
describe('risk-id — orgUnitCode', () => {
  it('açıq code sahəsi varsa onu uppercase edib qaytarır', () => {
    expect(orgUnitCode({ code: 'fin', name: 'Finance' } as any)).toBe('FIN')
  })

  it('code yoxdursa adın baş hərflərindən törədir', () => {
    expect(orgUnitCode({ name: 'Kredit Risk İdarəetmə' } as any)).toBe('KRİ')
    expect(orgUnitCode({ name: 'Finance Department' } as any)).toBe('FD')
  })

  it('ad yoxdursa GEN qaytarır', () => {
    expect(orgUnitCode(undefined)).toBe('GEN')
    expect(orgUnitCode({} as any)).toBe('GEN')
  })
})

describe('risk-id — generateRiskCode', () => {
  const year = 2026

  it('ilk risk üçün 001 nömrəsi verir', () => {
    expect(generateRiskCode('FIN', [], year)).toBe('FIN-2026-001')
  })

  it('ardıcıl nömrələri artırır', () => {
    const risks = [
      { risk_code: 'FIN-2026-001' },
      { risk_code: 'FIN-2026-002' },
    ] as Risk[]
    expect(generateRiskCode('FIN', risks, year)).toBe('FIN-2026-003')
  })

  it('yalnız eyni prefiksli riskləri sayır', () => {
    const risks = [
      { risk_code: 'FIN-2026-005' },
      { risk_code: 'HR-2026-001' },
      { risk_code: 'FIN-2025-010' },
    ] as Risk[]
    expect(generateRiskCode('FIN', risks, year)).toBe('FIN-2026-006')
  })

  it('sıradan kənar nömrələri də nəzərə alır (max+1)', () => {
    const risks = [{ risk_code: 'FIN-2026-099' }] as Risk[]
    expect(generateRiskCode('FIN', risks, year)).toBe('FIN-2026-100')
  })

  it('üç rəqəmə qədər sıfırla doldurur', () => {
    const risks = [{ risk_code: 'FIN-2026-009' }] as Risk[]
    expect(generateRiskCode('FIN', risks, year)).toBe('FIN-2026-010')
  })
})
