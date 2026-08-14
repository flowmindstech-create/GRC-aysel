import { describe, it, expect } from 'vitest'
import { buildRowMatrix, buildCsv, type ExportColumn } from './export'

// Test planı 1. Funksional — Məlumatların Excel/CSV formatında ixracı
// (buildRowMatrix = xlsx/pdf-ə gedən data; buildCsv = CSV mətni)

interface Row { name: string; score: number | null; note?: string }
const columns: ExportColumn<Row>[] = [
  { key: 'name', label: 'Ad', value: r => r.name },
  { key: 'score', label: 'Bal', value: r => r.score },
  { key: 'note', label: 'Qeyd', value: r => r.note },
]

describe('export — buildRowMatrix', () => {
  it('birinci sətir sütun etiketləridir (header)', () => {
    const m = buildRowMatrix(columns, [])
    expect(m[0]).toEqual(['Ad', 'Bal', 'Qeyd'])
  })

  it('hər sətri sütunun value() funksiyasına görə şəkilləndirir', () => {
    const m = buildRowMatrix(columns, [{ name: 'Risk A', score: 12, note: 'qeyd' }])
    expect(m[1]).toEqual(['Risk A', '12', 'qeyd'])
  })

  it('null/undefined dəyər boş sətrə çevrilir (Excel-də boş xana)', () => {
    const m = buildRowMatrix(columns, [{ name: 'X', score: null }])
    expect(m[1]).toEqual(['X', '', ''])
  })

  it('rəqəm mətnə çevrilir', () => {
    const m = buildRowMatrix(columns, [{ name: 'Y', score: 0 }])
    expect(m[1][1]).toBe('0')
  })

  it('boş sətir siyahısı yalnız header qaytarır', () => {
    expect(buildRowMatrix(columns, [])).toHaveLength(1)
  })
})

describe('export — buildCsv', () => {
  it('UTF-8 BOM ilə başlayır (Excel AZ hərfləri düz açsın)', () => {
    const csv = buildCsv(columns, [])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('sətirlər CRLF ilə ayrılır', () => {
    const csv = buildCsv(columns, [{ name: 'A', score: 1 }])
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines[0]).toBe('"Ad","Bal","Qeyd"')
    expect(lines[1]).toBe('"A","1",""')
  })

  it('vergüllü dəyər tək xanada qalır (sitatlanır)', () => {
    const csv = buildCsv(columns, [{ name: 'Bakı, Azərbaycan', score: 5 }])
    expect(csv).toContain('"Bakı, Azərbaycan"')
  })

  it('dırnaq işarəsi ikiqatlaşdırılır (RFC-4180)', () => {
    const csv = buildCsv(columns, [{ name: 'De "salam"', score: 1 }])
    expect(csv).toContain('"De ""salam"""')
  })

  it('sətir keçidi olan dəyər sitatların içində qorunur (CSV injection deyil)', () => {
    const csv = buildCsv(columns, [{ name: 'sətir1\nsətir2', score: 1 }])
    expect(csv).toContain('"sətir1\nsətir2"')
  })

  it('Azərbaycan hərfləri qorunur', () => {
    const csv = buildCsv(columns, [{ name: 'Şəbnəm Rəcəbli', score: 3 }])
    expect(csv).toContain('Şəbnəm Rəcəbli')
  })
})
