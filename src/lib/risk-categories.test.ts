import { describe, it, expect } from 'vitest'
import { normalizeCategory, categoryLabel, RISK_CATEGORY_VALUES } from './risk-categories'

// Test plan 1. Funksional testlər — kateqoriya normalizasiyası (filtrlər, dashboard)
describe('risk-categories', () => {
  it('bütün cari kateqoriyalar olduğu kimi qalır', () => {
    for (const c of RISK_CATEGORY_VALUES) {
      expect(normalizeCategory(c)).toBe(c)
    }
  })

  it('boş/null dəyər operational-a çevrilir', () => {
    expect(normalizeCategory(undefined)).toBe('operational')
    expect(normalizeCategory(null)).toBe('operational')
    expect(normalizeCategory('')).toBe('operational')
  })

  it('legacy kateqoriyalar xəritələnir', () => {
    expect(normalizeCategory('cybersecurity')).toBe('information_security')
    expect(normalizeCategory('legal_compliance')).toBe('compliance')
    expect(normalizeCategory('legal')).toBe('compliance')
    expect(normalizeCategory('hr')).toBe('operational')
  })

  it('naməlum kateqoriya operational-a çevrilir', () => {
    expect(normalizeCategory('mystery')).toBe('operational')
  })

  it('categoryLabel insan oxuya bilən etiket qaytarır', () => {
    expect(categoryLabel('financial')).toBe('Maliyyə')
    expect(categoryLabel('information_security')).toBe('İnformasiya Təhlükəsizliyi')
    expect(categoryLabel(undefined)).toBe('Əməliyyat')
  })
})
