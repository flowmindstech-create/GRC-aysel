'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ScaleOption } from '@/lib/rcsa-methodology'

interface Props {
  label: string
  value: number
  options: ScaleOption[]
  onChange: (value: number) => void
}

/**
 * Compact RCSA selector: collapsed shows the current "N — Label"; opening reveals
 * a list where each option shows "N — Label" plus its explanation. Saves space
 * versus the segmented buttons while keeping the policy explanations visible.
 */
export function RcsaDropdown({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-semibold text-slate-400 mb-1">{label}</label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={active?.desc}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left cursor-pointer"
        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        <span className="text-[11px] truncate">
          <strong className="text-sky-400">{active?.value}</strong> — {active?.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--muted-fg)' }} />
      </button>

      {/* Collapsed description preview */}
      {!open && active?.desc && (
        <p className="text-[10px] text-slate-500 leading-snug mt-1 line-clamp-2" title={active.desc}>{active.desc}</p>
      )}

      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border shadow-2xl"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {options.map((o) => {
            const isActive = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => { onChange(o.value); setOpen(false) }}
                title={o.desc}
                className={`w-full text-left px-3 py-2 border-b last:border-0 transition-colors ${isActive ? 'bg-sky-500/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-[11px] font-bold" style={{ color: isActive ? 'var(--foreground)' : 'var(--foreground)' }}>
                  <span className="text-sky-400">{o.value}</span> — {o.label}
                </p>
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{o.desc}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
