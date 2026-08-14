// Shared data-export helper for registers — CSV / Excel (.xlsx) / PDF.
// A register passes its visible columns + filtered rows; whatever you see is exported.

export interface ExportColumn<T> {
  key: string
  label: string
  value: (row: T) => string | number | null | undefined
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

function cell<T>(col: ExportColumn<T>, row: T): string {
  const v = col.value(row)
  return v === null || v === undefined ? '' : String(v)
}

// ── Saf data-şəkilləndirmə (browser-siz, test edilə bilən) ──────────────────
// Hər üç format eyni matrisdən qidalanır: [header, ...body].
export function buildRowMatrix<T>(columns: ExportColumn<T>[], rows: T[]): string[][] {
  const header = columns.map(c => c.label)
  const body = rows.map(r => columns.map(c => cell(c, r)))
  return [header, ...body]
}

// CSV mətni — UTF-8 BOM ilə (Excel-də Azərbaycan hərfləri düz açılsın),
// standart RFC-4180 sitatlaşdırma (dırnaq, vergül, sətir keçidi təhlükəsiz).
export function buildCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const matrix = buildRowMatrix(columns, rows)
  return '﻿' + matrix.map(row => row.map(esc).join(',')).join('\r\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// CSV — dependency-free, UTF-8 BOM so Excel opens Azerbaijani characters correctly
function exportCsv<T>(columns: ExportColumn<T>[], rows: T[], filename: string) {
  const blob = new Blob([buildCsv(columns, rows)], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

async function exportXlsx<T>(columns: ExportColumn<T>[], rows: T[], filename: string) {
  const XLSX = await import('xlsx')
  const data = rows.map(r => Object.fromEntries(columns.map(c => [c.label, cell(c, r)])))
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map(c => c.label) })
  ws['!cols'] = columns.map(c => ({ wch: Math.max(12, c.label.length + 2) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

async function exportPdf<T>(columns: ExportColumn<T>[], rows: T[], filename: string, title: string) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`GRCell · ${new Date().toLocaleString('az-AZ')} · ${rows.length} sətir`, 14, 22)
  autoTable(doc, {
    startY: 27,
    head: [columns.map(c => c.label)],
    body: rows.map(r => columns.map(c => cell(c, r))),
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 39, 68], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 246, 251] },
    margin: { left: 14, right: 14 },
  })
  doc.save(`${filename}.pdf`)
}

export async function exportRows<T>(
  format: ExportFormat,
  columns: ExportColumn<T>[],
  rows: T[],
  filename: string,
  title?: string,
): Promise<void> {
  const safe = filename.replace(/[^\w\-]+/g, '_')
  if (format === 'csv') return exportCsv(columns, rows, safe)
  if (format === 'xlsx') return exportXlsx(columns, rows, safe)
  return exportPdf(columns, rows, safe, title ?? filename)
}
