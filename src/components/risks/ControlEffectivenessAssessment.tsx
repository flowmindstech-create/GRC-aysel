'use client'

import type { RiskTrigger, RiskControlActivity } from '@/types'
import { CONTROL_SUBCRITERIA, CONTROL_RATING_INFO } from '@/lib/rcsa-methodology'
import { evaluateControlActivity, aggregateControlEffectiveness } from '@/lib/rcsa'
import { RcsaDropdown } from './RcsaDropdown'
import { ControlRadar } from './ControlRadar'

const RADAR_KEYS = ['design_compliance', 'design_strength', 'design_timeliness', 'impl_relevance', 'impl_sustainability', 'impl_traceability'] as const
const RADAR_LABELS = ['Uyğunluq', 'Güclülük', 'Zamanlılıq', 'Münasiblik', 'Davamlılıq', 'İzlən.']

interface Props {
  triggers: RiskTrigger[]
  onChange: (triggers: RiskTrigger[]) => void
}

/**
 * RCSA Assessment Matrix → Control Effectiveness.
 * Assesses each control (defined in General Details) on the 6 sub-criteria with a
 * radar chart per control, then shows the aggregate effectiveness.
 */
export function ControlEffectivenessAssessment({ triggers, onChange }: Props) {
  const patchControl = (tid: string, cid: string, patch: Partial<RiskControlActivity>) =>
    onChange(triggers.map((t) =>
      t.id === tid ? { ...t, controls: t.controls.map((c) => (c.id === cid ? { ...c, ...patch } : c)) } : t
    ))

  const allControls = triggers.flatMap((t) => t.controls)
  const agg = aggregateControlEffectiveness(triggers)

  if (allControls.length === 0) {
    return (
      <p className="text-[11px] text-amber-400">
        Hələ control yoxdur. General Details → Triggers bölməsində hər səbəbə control əlavə edin, sonra burada qiymətləndirin.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {triggers.map((t, ti) =>
        t.controls.map((c, ci) => {
          const ev = evaluateControlActivity(c)
          const radarValues = RADAR_KEYS.map((k) => (c[k] as number) || 3)
          return (
            <div key={c.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-slate-300 truncate">
                  ⚡ {ti + 1}.{ci + 1} {c.description || `Trigger ${ti + 1} · Control ${ci + 1}`}
                </p>
                <span className="text-[10px] font-black text-sky-400 uppercase shrink-0">{CONTROL_RATING_INFO[ev.rating].label} · {ev.score.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Nəzarətin dizaynı</span>
                  <div className="grid grid-cols-3 gap-2">
                    {CONTROL_SUBCRITERIA.filter((s) => s.group === 'design').map((s) => (
                      <RcsaDropdown key={s.key} label={s.label} value={(c[s.key] as number) || 3} options={s.options}
                        onChange={(v) => patchControl(t.id, c.id, { [s.key]: v })} />
                    ))}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Nəzarətin icrası</span>
                  <div className="grid grid-cols-3 gap-2">
                    {CONTROL_SUBCRITERIA.filter((s) => s.group === 'implementation').map((s) => (
                      <RcsaDropdown key={s.key} label={s.label} value={(c[s.key] as number) || 3} options={s.options}
                        onChange={(v) => patchControl(t.id, c.id, { [s.key]: v })} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-center">
                  <ControlRadar values={radarValues} labels={RADAR_LABELS} />
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* Aggregate */}
      <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-xs flex items-center justify-between">
        <div>
          <p className="font-bold text-slate-400">Aqreqat Effectiveness ({allControls.length} control)</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Orta bal: {agg.score.toFixed(2)}</p>
        </div>
        <span className="font-black text-sky-400 uppercase">{CONTROL_RATING_INFO[agg.rating].label}</span>
      </div>
    </div>
  )
}
