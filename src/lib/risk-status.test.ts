import { describe, it, expect } from 'vitest'
import { normalizeStatus, statusLabel, RISK_STATUS_VALUES } from './risk-status'

// Test plan 1. Funksional testlər — risk statusu dəyişmələri
describe('risk-status', () => {
  it('bütün cari statusları olduğu kimi saxlayır', () => {
    for (const s of RISK_STATUS_VALUES) {
      expect(normalizeStatus(s)).toBe(s)
    }
  })

  it('boş/null dəyəri open-ə çevirir', () => {
    expect(normalizeStatus(undefined)).toBe('open')
    expect(normalizeStatus(null)).toBe('open')
    expect(normalizeStatus('')).toBe('open')
  })

  it('legacy statusları xəritələyir (mitigated→done, accepted/closed→solved)', () => {
    expect(normalizeStatus('mitigated')).toBe('done')
    expect(normalizeStatus('accepted')).toBe('solved')
    expect(normalizeStatus('closed')).toBe('solved')
  })

  it('naməlum statusu open-ə çevirir', () => {
    expect(normalizeStatus('weird_value')).toBe('open')
  })

  it('statusLabel hər status üçün insan oxuya bilən etiket qaytarır', () => {
    expect(statusLabel('in_progress')).toBe('In Progress')
    expect(statusLabel('solved')).toBe('Solved')
    expect(statusLabel(undefined)).toBe('Open')
  })
})
