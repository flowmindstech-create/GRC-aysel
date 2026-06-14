'use client'

import type { Control, RiskTrigger, RiskControlActivity } from '@/types'
import { CONTROL_RATING_INFO } from '@/lib/rcsa-methodology'
import { evaluateControlActivity } from '@/lib/rcsa'
import { Plus, Trash2, Zap } from 'lucide-react'

const uid = (p: string) =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? `${p}-${crypto.randomUUID()}` : `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

interface Props {
  triggers: RiskTrigger[]
  onChange: (triggers: RiskTrigger[]) => void
  library: Control[]
}

/**
 * Definition only: define each risk trigger and the control(s) that address it.
 * The per-control effectiveness assessment (6 sub-criteria) lives in the RCSA
 * Assessment Matrix tab (ControlEffectivenessAssessment).
 */
export function TriggersEditor({ triggers, onChange, library }: Props) {
  const update = (next: RiskTrigger[]) => onChange(next)
  const addTrigger = () => update([...triggers, { id: uid('trg'), description: '', controls: [] }])
  const removeTrigger = (tid: string) => update(triggers.filter((t) => t.id !== tid))
  const setTriggerDesc = (tid: string, description: string) =>
    update(triggers.map((t) => (t.id === tid ? { ...t, description } : t)))
  const addControl = (tid: string) =>
    update(triggers.map((t) => (t.id === tid ? { ...t, controls: [...t.controls, { id: uid('ctl'), description: '' }] } : t)))
  const removeControl = (tid: string, cid: string) =>
    update(triggers.map((t) => (t.id === tid ? { ...t, controls: t.controls.filter((c) => c.id !== cid) } : t)))
  const patchControl = (tid: string, cid: string, patch: Partial<RiskControlActivity>) =>
    update(triggers.map((t) =>
      t.id === tid ? { ...t, controls: t.controls.map((c) => (c.id === cid ? { ...c, ...patch } : c)) } : t
    ))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold" style={{ color: 'var(--foreground)' }}>Triggers & Controls</label>
        <button type="button" onClick={addTrigger}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-sky-500 hover:bg-sky-600 flex items-center gap-1 cursor-pointer">
          <Plus className="w-3 h-3" /> Trigger
        </button>
      </div>

      <p className="text-[10px] text-slate-500">Səbəb (trigger) və ona qarşı nəzarəti (control) burada təyin edin. Nəzarətin effektivliyi <strong>RCSA Assessment Matrix</strong> tab-ında qiymətləndirilir.</p>

      {triggers.length === 0 && (
        <p className="text-[11px] text-slate-500">Hələ trigger yoxdur.</p>
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

          <div className="space-y-2 pl-5">
            {t.controls.map((c, ci) => {
              const assessed = c.design_compliance != null || c.impl_relevance != null
              const rating = evaluateControlActivity(c).rating
              return (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
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
                  <span className="text-[10px] font-bold shrink-0" style={{ color: assessed ? '#0ea5e9' : 'var(--muted-fg)' }}>
                    {assessed ? CONTROL_RATING_INFO[rating].label : 'qiymətləndirilməyib'}
                  </span>
                  <button type="button" onClick={() => removeControl(t.id, c.id)} aria-label="Remove control" className="p-1 rounded hover:bg-red-500/10 cursor-pointer">
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
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
