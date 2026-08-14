import { describe, it, expect } from 'vitest'
import { generateControlCode } from './control-id'
import type { Control } from '@/types'

// Test planı 1. Funksional — Nəzarət tədbirlərinin yaradılması (unikal kod)

const ctrl = (control_id: string): Control => ({ control_id } as Control)

describe('control-id — generateControlCode', () => {
  it('boş siyahıda ilk kod CTRL-YYYY-001', () => {
    expect(generateControlCode([], 2026)).toBe('CTRL-2026-001')
  })

  it('mövcud maksimumdan bir çox verir', () => {
    const existing = [ctrl('CTRL-2026-001'), ctrl('CTRL-2026-002')]
    expect(generateControlCode(existing, 2026)).toBe('CTRL-2026-003')
  })

  it('ardıcıllıqdakı boşluğa baxmayaraq maksimum+1 götürür', () => {
    const existing = [ctrl('CTRL-2026-001'), ctrl('CTRL-2026-005')]
    expect(generateControlCode(existing, 2026)).toBe('CTRL-2026-006')
  })

  it('başqa ilin kodlarını sayğaca daxil etmir', () => {
    const existing = [ctrl('CTRL-2025-099')]
    expect(generateControlCode(existing, 2026)).toBe('CTRL-2026-001')
  })

  it('sıfırla 3 rəqəmə tamamlayır', () => {
    expect(generateControlCode([], 2026)).toMatch(/CTRL-2026-\d{3}$/)
  })

  it('yararsız/parse olunmayan kodları görməzdən gəlir', () => {
    const existing = [ctrl('CTRL-2026-abc'), ctrl('RANDOM')]
    expect(generateControlCode(existing, 2026)).toBe('CTRL-2026-001')
  })
})
