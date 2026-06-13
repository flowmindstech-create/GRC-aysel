'use client'

import type { ScaleOption } from '@/lib/rcsa-content'

interface Props {
  label: string
  value: number
  options: ScaleOption[]
  onChange: (value: number) => void
  /** Optional accent for the active segment (tailwind bg/border classes). */
  accent?: string
}

/**
 * Selection-based RCSA input (replaces sliders). Renders a segmented 1-5 control
 * and shows the explanation of the currently selected option below it.
 */
export function RcsaSelect({ label, value, options, onChange, accent }: Props) {
  const active = options.find((o) => o.value === value) ?? options[0]
  const activeCls = accent ?? 'bg-sky-500 text-white border-sky-500'

  return (
    <div className="p-2.5 rounded-lg border bg-black/10" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-semibold text-slate-400">{label}</label>
        <span className="text-[10px] font-bold text-white">{active?.label}</span>
      </div>
      <div className="flex gap-1">
        {options.map((o) => {
          const isActive = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`flex-1 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                isActive ? activeCls : 'border-white/10 text-slate-400 hover:border-white/20'
              }`}
              title={o.desc}
            >
              {o.value}
            </button>
          )
        })}
      </div>
      {active?.desc && (
        <p className="text-[10px] text-slate-500 leading-snug mt-1.5">{active.desc}</p>
      )}
    </div>
  )
}
