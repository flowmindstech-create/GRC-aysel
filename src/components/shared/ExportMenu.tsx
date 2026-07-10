'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react'
import { exportRows, type ExportColumn, type ExportFormat } from '@/lib/export'
import { toast } from 'sonner'

interface Props<T> {
  columns: ExportColumn<T>[]
  rows: T[]
  filename: string
  title?: string
}

// Small dropdown: ⬇ Export → CSV / Excel / PDF. Exports whatever rows/columns are passed.
export function ExportMenu<T>({ columns, rows, filename, title }: Props<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function run(format: ExportFormat) {
    setOpen(false)
    if (rows.length === 0) { toast.error('İxrac üçün məlumat yoxdur'); return }
    try {
      await exportRows(format, columns, rows, filename, title)
      toast.success(`${format.toUpperCase()} yükləndi`)
    } catch {
      toast.error('İxrac alınmadı')
    }
  }

  const items: { fmt: ExportFormat; label: string; icon: typeof FileText }[] = [
    { fmt: 'csv',  label: 'CSV (.csv)',   icon: FileText },
    { fmt: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
    { fmt: 'pdf',  label: 'PDF (.pdf)',   icon: FileType },
  ]

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-black/[0.04]"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
        <Download className="w-3.5 h-3.5" /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl z-50 border py-1"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
          {items.map(it => (
            <button key={it.fmt} onClick={() => run(it.fmt)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-black/5 text-left"
              style={{ color: 'var(--foreground)' }}>
              <it.icon className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
