'use client'

import { useState } from 'react'
import type { Control, RiskTrigger, RiskControlActivity } from '@/types'
import { CONTROL_CRITERIA } from '@/lib/rcsa-content'
import { evaluateControlActivity } from '@/lib/rcsa'
import { CONTROL_RATING_INFO } from '@/lib/rcsa-content'
import { RcsaSelect } from './RcsaSelect'
import { Plus, Trash2, ChevronDown, ChevronRight, Zap } from 'lucide-react'

// Map the shared 6 criteria onto per-control activity field keys.
type ActivityKey =
  | 'design_compliance' | 'design_strength' | 'design_timeliness'
  | 'impl_relevance' | 'impl_sustainability' | 'impl_traceability'

const NAME_TO_KEY: Record<string, ActivityKey> = {
  control_design_compliance: 'design_compliance',
  control_design_strength: 'design_strength',
  control_design_timeliness: 'design_timeliness',
  control_implementation_relevance: 'impl_relevance',
  control_implementation_sustainability: 'impl_sustainability',
  control_implementation_traceability: 'impl_traceability',
}
const CONTROL_FIELDS = CONTROL_CRITERIA.map((c) => ({
  key: NAME_TO_KEY[c.name],
  label: c.label,
  group: c.group,
  options: c.options,
}))

const uid = (p: string) =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? `${p}-${crypto.randomUUID()}` : `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

interface Props {
  triggers: RiskTrigger[]
  onChange: (triggers: RiskTrigger[]) => void
  library: Control[]
}

export function TriggersEditor({ triggers, onChange, library }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const update = (next: RiskTrigger[]) => onChange(next)

  const addTrigger = () =>
    update([...triggers, { id: uid('trg'), description: '', controls: [] }])

  const removeTrigger = (tid: string) => update(triggers.filter((t) => t.id !== tid))

  const setTriggerDesc = (tid: string, description: string) =>
    update(triggers.map((t) => (t.id === tid ? { ...t, description } : t)))

  const addControl = (tid: string) =>
    update(triggers.map((t) => (t.id === tid ? { ...t, controls: [...t.controls, { id: uid('ctl'), description: '' }] } : t)))

  const removeControl = (tid: string, cid: string) => {
    setExpanded((s) => { const next = { ...s }; delete next[cid]; return next })
    update(triggers.map((t) => (t.id === tid ? { ...t, controls: t.controls.filter((c) => c.id !== cid) } : t)))
  }

  const patchControl = (tid: string, cid: string, patch: Partial<RiskControlActivity>) =>
    update(triggers.map((t) =>
      t.id === tid ? { ...t, controls: t.controls.map((c) => (c.id === cid ? { ...c, ...patch } : c)) } : t
    ))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold" style={{ color: 'var(--foreground)' }}>
          Triggers & Controls
        </label>
        <button type="button" onClick={addTrigger}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-sky-500 hover:bg-sky-600 flex items-center gap-1 cursor-pointer">
          <Plus className="w-3 h-3" /> Trigger
        </button>
      </div>

      {triggers.length === 0 && (
        <p className="text-[11px] text-slate-500">Hələ trigger yoxdur. Riskin səbəbini əlavə edin, sonra hər səbəbə nəzarət (control) bağlayın.</p>
      )}

      {triggers.map((t, ti) => (
        <div key={t.id} className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              value={t.description}
              onChange={(e) => setTriggerDesc(t.id, e.target.value)}
              placeholder={`Trigger ${ti + 1} təsviri (səbəb / təhlükə)`}
              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
            {t.controls.length === 0 && <span className="text-[10px] text-amber-400 font-semibold shrink-0">control yoxdur</span>}
            <button type="button" onClick={() => removeTrigger(t.id)} aria-label="Remove trigger" className="p-1 rounded hover:bg-red-500/10 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>

          {/* Controls under this trigger */}
          <div className="space-y-2 pl-5">
            {t.controls.map((c, ci) => {
              const isOpen = expanded[c.id]
              const evalRes = evaluateControlActivity(c)
              return (
                <div key={c.id} className="rounded-lg border p-2.5 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setExpanded((s) => ({ ...s, [c.id]: !s[c.id] }))}
                      aria-label={isOpen ? 'Collapse control assessment' : 'Expand control assessment'}
                      className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    {/* Library link OR free text */}
                    <select
                      value={c.control_ref_id ?? ''}
                      onChange={(e) => {
                        const ref = library.find((l) => l.id === e.target.value)
                        patchControl(t.id, c.id, {
                          control_ref_id: e.target.value || undefined,
                          description: ref ? `${ref.control_id} — ${ref.title}` : c.description,
                        })
                      }}
                      className="px-2 py-1 rounded-lg text-[11px] border outline-none shrink-0 max-w-[40%]"
                      style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      title="Control Library-dən seçin (və ya boş qoyub sərbəst yazın)"
                    >
                      <option value="">Sərbəst mətn…</option>
                      {library.map((l) => <option key={l.id} value={l.id}>{l.control_id} — {l.title}</option>)}
                    </select>
                    <input
                      value={c.description}
                      onChange={(e) => patchControl(t.id, c.id, { description: e.target.value })}
                      placeholder={`Control ${ci + 1} təsviri`}
                      className="flex-1 px-2 py-1 rounded-lg text-[11px] border outline-none"
                      style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    />
                    <span className="text-[10px] font-bold text-sky-400 shrink-0">{CONTROL_RATING_INFO[evalRes.rating].label}</span>
                    <button type="button" onClick={() => removeControl(t.id, c.id)} aria-label="Remove control" className="p-1 rounded hover:bg-red-500/10 cursor-pointer">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {CONTROL_FIELDS.map((f) => (
                        <RcsaSelect
                          key={f.key}
                          label={f.label}
                          value={(c[f.key] as number) || 3}
                          options={f.options}
                          accent={f.group === 'implementation' ? 'bg-emerald-500 text-white border-emerald-500' : undefined}
                          onChange={(v) => patchControl(t.id, c.id, { [f.key]: v })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <button type="button" onClick={() => addControl(t.id)}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer">
              <Plus className="w-3 h-3" /> Control əlavə et
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
