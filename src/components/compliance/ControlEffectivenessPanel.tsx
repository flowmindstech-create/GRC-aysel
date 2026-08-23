'use client'

import { useState } from 'react'
import type { Control } from '@/types'
import { CONTROL_SUBCRITERIA } from '@/lib/rcsa-methodology'
import { evaluateControlEffectiveness } from '@/lib/rcsa'
import { cn } from '@/lib/utils'
import { Save, Loader2 } from 'lucide-react'

// Nəzarətin effektivliyi İKİ ölçüdən ibarətdir və hər ikisi effektivliyin altındadır:
//   Dizayn  = uyğunluq + güclülük + zamanlılıq   (ortalama)
//   Tətbiq  = münasiblik + davamlılıq + izlənəbilənlik (ortalama)
//   Effektivlik = (Dizayn + Tətbiq) / 2
// Şkala 1-5, kiçik bal daha yaxşıdır (1 = Güclü, 5 = Zəif).

type CriterionKey =
  | 'design_compliance' | 'design_strength' | 'design_timeliness'
  | 'impl_relevance' | 'impl_sustainability' | 'impl_traceability'

const KEYS: CriterionKey[] = [
  'design_compliance', 'design_strength', 'design_timeliness',
  'impl_relevance', 'impl_sustainability', 'impl_traceability',
]

export function scoreColor(score: number | undefined): string {
  if (score === undefined || score === null) return 'var(--muted-fg)'
  if (score <= 1.5) return '#16a34a'
  if (score <= 2.5) return '#65a30d'
  if (score <= 3.5) return '#ca8a04'
  if (score <= 4.5) return '#ea580c'
  return '#dc2626'
}

interface Props {
  control: Control
  onSave: (patch: Partial<Control>) => Promise<void>
  canEdit?: boolean
}

export function ControlEffectivenessPanel({ control, onSave, canEdit = true }: Props) {
  const [values, setValues] = useState<Record<CriterionKey, number>>(() =>
    Object.fromEntries(KEYS.map(k => [k, control[k] ?? 3])) as Record<CriterionKey, number>)
  const [saving, setSaving] = useState(false)

  const evaluation = evaluateControlEffectiveness(
    values.design_compliance, values.design_strength, values.design_timeliness,
    values.impl_relevance, values.impl_sustainability, values.impl_traceability,
  )

  const dirty = KEYS.some(k => (control[k] ?? 3) !== values[k]) || control.effectiveness_score === undefined

  async function save() {
    setSaving(true)
    try {
      await onSave({
        ...values,
        design_score: Number(evaluation.designAvg.toFixed(2)),
        implementation_score: Number(evaluation.implementationAvg.toFixed(2)),
        effectiveness_score: Number(evaluation.score.toFixed(2)),
        effectiveness_assessed_at: new Date().toISOString(),
      })
    } finally {
      setSaving(false)
    }
  }

  const group = (g: 'design' | 'implementation') => CONTROL_SUBCRITERIA.filter(s => s.group === g)

  const Column = ({ g, title, avg }: { g: 'design' | 'implementation'; title: string; avg: number }) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>{title}</p>
        <span className="text-xs font-mono font-bold tabular-nums" style={{ color: scoreColor(avg) }}>{avg.toFixed(2)}</span>
      </div>
      {group(g).map(s => (
        <label key={s.key} className="flex flex-col gap-1">
          <span className="text-[11px]" style={{ color: 'var(--foreground)' }}>{s.label}</span>
          <select
            value={values[s.key as CriterionKey]}
            disabled={!canEdit}
            onChange={e => setValues(v => ({ ...v, [s.key]: Number(e.target.value) }))}
            className="w-full px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            title={s.options.find(o => o.value === values[s.key as CriterionKey])?.desc}
          >
            {s.options.map(o => (
              <option key={o.value} value={o.value}>{o.value} — {o.label}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )

  return (
    <div className="rounded-lg p-3 flex flex-col gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>Effectiveness</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{evaluation.label}</span>
          <span className="text-lg font-mono font-black tabular-nums leading-none" style={{ color: scoreColor(evaluation.score) }}>
            {evaluation.score.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Column g="design" title="Control design" avg={evaluation.designAvg} />
        <Column g="implementation" title="Control implementation" avg={evaluation.implementationAvg} />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[10px] leading-snug" style={{ color: 'var(--muted-fg)' }}>
          Effectiveness is the average of the two columns. 1 is strongest, 5 is weakest.
        </p>
        {canEdit && (
          <button onClick={e => { e.stopPropagation(); save() }} disabled={saving || !dirty}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0',
              'disabled:opacity-40 disabled:cursor-not-allowed')}
            style={{ background: 'var(--brand-500)' }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save rate
          </button>
        )}
      </div>
    </div>
  )
}
