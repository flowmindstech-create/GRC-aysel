'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, FileType, Columns3 } from 'lucide-react'
import { exportRows, type ExportColumn, type ExportFormat } from '@/lib/export'
import { toast } from 'sonner'

interface Props<T> {
  columns: ExportColumn<T>[]
  rows: T[]
  filename: string
  title?: string
}

// Dropdown: ⬇ Export → CSV / Excel / PDF. İstifadəçi hansı sütunların
// ixrac olunacağını da seçə bilər (sütun seçimi + format).
export function ExportMenu<T>({ columns, rows, filename, title }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'format' | 'columns'>('format')
  const [selected, setSelected] = useState<Set<number>>(new Set(columns.map((_, i) => i)))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setStep('format') } }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  function toggleColumn(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function run(format: ExportFormat) {
    setOpen(false)
    setStep('format')
    if (rows.length === 0) { toast.error('No data to export'); return }
    if (selected.size === 0) { toast.error('Select at least one column'); return }
    try {
      const chosen = columns.filter((_, i) => selected.has(i))
      await exportRows(format, chosen, rows, filename, title)
      toast.success(`${format.toUpperCase()} downloaded`)
    } catch {
      toast.error('Export failed')
    }
  }

  const items: { fmt: ExportFormat; label: string; icon: typeof FileText }[] = [
    { fmt: 'csv',  label: 'CSV (.csv)',   icon: FileText },
    { fmt: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
    { fmt: 'pdf',  label: 'PDF (.pdf)',   icon: FileType },
  ]

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(o => !o); setStep('format') }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-black/[0.04]"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
        <Download className="w-3.5 h-3.5" /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-xl z-50 border py-1"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
          {step === 'format' ? (
            <>
              <button type="button"
                onClick={() => setStep('columns')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-black/5 text-left"
                style={{ color: 'var(--foreground)' }}>
                <Columns3 className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} />
                Select columns ({selected.size}/{columns.length})
              </button>
              <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />
              {items.map(it => (
                <button key={it.fmt} onClick={() => run(it.fmt)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-black/5 text-left"
                  style={{ color: 'var(--foreground)' }}>
                  <it.icon className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} /> {it.label}
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>Columns</span>
                <button type="button" onClick={() => setSelected(new Set(columns.map((_, i) => i)))}
                  className="text-[11px] font-semibold hover:underline" style={{ color: 'var(--brand-500)' }}>All</button>
              </div>
              <div className="max-h-64 overflow-y-auto px-1">
                {columns.map((c, i) => (
                  <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-black/5 text-xs"
                    style={{ color: 'var(--foreground)' }}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggleColumn(i)}
                      className="w-3.5 h-3.5 accent-sky-500" />
                    {c.label}
                  </label>
                ))}
              </div>
              <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />
              <button type="button" onClick={() => setStep('format')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-black/5 text-left"
                style={{ color: 'var(--brand-500)' }}>
                ← Back to format selection
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
