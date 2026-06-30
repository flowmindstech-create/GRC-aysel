'use client'

import { useState, useEffect } from 'react'
import { ShieldPlus, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { generateControlCode } from '@/lib/control-id'
import type { Incident, IncidentPriority, CorrectiveAction, Control } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'
import { toast } from 'sonner'

interface Props {
  data: Partial<Incident>
  onChange: (data: Partial<Incident>) => void
}

// Priority → SLA resolution window (days) — same table as the incident detail sheet.
const SLA_DAYS: Record<IncidentPriority, number> = {
  P1_critical: 3, P2_high: 5, P3_medium: 7, P4_low: 10, P5_minimal: 14,
}

const STATUS_BADGES = {
  pending:     { label: 'Gözləyir', cls: 'bg-amber-500/15 text-amber-400' },
  in_progress: { label: 'İcrada', cls: 'bg-blue-500/15 text-blue-400' },
  done:        { label: 'Tamamlanıb', cls: 'bg-emerald-500/15 text-emerald-400' },
} as const

export function IncidentResolutionForm({ data, onChange }: Props) {
  const actions = data.corrective_actions ?? []
  const [controls, setControls] = useState<Control[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => { db.getControls().then(setControls) }, [])

  // SLA-bound latest deadline a CAPA action may have. Uses the persisted SLA date if
  // set, otherwise derives it from priority relative to acknowledge/now.
  const maxDueDate = (() => {
    if (data.sla_due_date) return data.sla_due_date.slice(0, 10)
    const days = SLA_DAYS[data.priority ?? 'P3_medium']
    const base = data.acknowledged_at ? new Date(data.acknowledged_at) : new Date()
    base.setDate(base.getDate() + days)
    return base.toISOString().slice(0, 10)
  })()

  // Two fixed CAPA measures, stacked inline (no "+" / no modal): one corrective + one preventive.
  const corrective = actions.find(a => a.kind === 'collective')
  const preventive = actions.find(a => a.kind === 'preventive')

  // Preventive control to optimize is inherited from investigation's "Cari Kontrol".
  const inheritedControl = data.control_id ? controls.find(c => c.id === data.control_id) : null

  // Upsert the single action of a given kind (create lazily on first edit).
  function patchAction(kind: 'collective' | 'preventive', updates: Partial<CorrectiveAction>) {
    const existing = actions.find(a => a.kind === kind)
    if (existing) {
      onChange({ ...data, corrective_actions: actions.map(a => a.kind === kind ? { ...a, ...updates } : a) })
    } else {
      const created: CorrectiveAction = {
        id: crypto.randomUUID(), title: '', status: 'pending', kind,
        control_mode: kind === 'preventive' ? 'improve_existing' : undefined,
        ...updates,
      }
      onChange({ ...data, corrective_actions: [...actions, created] })
    }
  }

  // Shared: create a pending control (library + process map) and link it to the preventive action.
  async function createPendingControlEntry(opts: { title: string; description: string }) {
    setCreating(true)
    try {
      const now = new Date().toISOString()
      const created = await db.saveControl({
        id: crypto.randomUUID(),
        org_id: '',
        framework: 'custom',
        control_id: generateControlCode(controls),
        title: opts.title,
        description: opts.description,
        status: 'partial',
        approval_status: 'pending_review',
        control_type: 'corrective',
        created_at: now,
      } as Control)
      if (data.process_id) {
        const existing = await db.getProcessControlIds(data.process_id)
        await db.setProcessControls(data.process_id, [...existing, created.id])
      }
      setControls(prev => [created, ...prev])
      patchAction('preventive', { created_control_id: created.id })
      toast.success(`Sorğu göndərildi: ${created.control_id} — Control Library-də təsdiq gözləyir`)
    } catch {
      toast.error('Sorğu göndərilə bilmədi')
    } finally {
      setCreating(false)
    }
  }

  async function createOptimizationRequest() {
    if (!inheritedControl) { toast.error('Investigation-da "Cari Kontrol" seçilməyib'); return }
    if (!preventive?.optimization_proposal?.trim()) { toast.error('Optimallaşdırma təklifini yaz'); return }
    await createPendingControlEntry({
      title: `Optimizasiya: ${inheritedControl.control_id} · ${inheritedControl.title}`,
      description: `Optimallaşdırma təklifi (insident: ${data.title ?? '—'}): ${preventive.optimization_proposal.trim()}`,
    })
  }

  async function createNewControl() {
    if (!preventive?.title?.trim()) { toast.error('Əvvəlcə preventiv tədbirin adını yaz'); return }
    await createPendingControlEntry({
      title: preventive.title.trim(),
      description: `${preventive.description?.trim() || 'Insidentdən yaradılan kontrol (CAPA).'} · İnsident: ${data.title ?? ''}`.trim(),
    })
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const cardInput = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'
  const labelCls = 'block text-xs font-medium mb-1.5'
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--brand-500)')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')

  // Shared sub-blocks (lowercase render helpers, not components).
  const statusButtons = (action: CorrectiveAction | undefined, kind: 'collective' | 'preventive') =>
    (['pending', 'in_progress', 'done'] as const).map(s => {
      const badge = STATUS_BADGES[s]
      return (
        <button key={s} type="button" onClick={() => patchAction(kind, { status: s })}
          className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all',
            (action?.status ?? 'pending') === s ? badge.cls : 'opacity-40 hover:opacity-70')}>{badge.label}</button>
      )
    })

  const assigneeDue = (action: CorrectiveAction | undefined, kind: 'collective' | 'preventive') => (
    <div className="grid grid-cols-2 gap-2">
      <select value={action?.assignee ?? ''} onChange={e => patchAction(kind, { assignee: e.target.value })}
        className="px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer" style={cardInput}>
        <option value="">Təyin et...</option>
        {MOCK_USERS.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
      </select>
      <div>
        <input type="date" value={action?.due_date ?? ''} max={maxDueDate}
          onChange={e => { const v = e.target.value; patchAction(kind, { due_date: maxDueDate && v && v > maxDueDate ? maxDueDate : v }) }}
          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={cardInput} />
        {maxDueDate && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
            SLA limiti: {new Date(maxDueDate).toLocaleDateString('az-AZ')}
          </p>
        )}
      </div>
    </div>
  )

  const sent = !!preventive?.created_control_id
  const linked = sent ? controls.find(c => c.id === preventive?.created_control_id) : null
  const approved = linked?.approval_status === 'approved'
  const reflectBadge = sent && (
    <p className={cn('text-[10px] flex items-center gap-1', approved ? 'text-emerald-400' : 'text-amber-400')}>
      <ShieldPlus className="w-3 h-3" />
      {approved ? '✅ Təsdiqləndi — kontrol əlavə olundu' : '🟡 Risk Management-də təsdiq gözləyir'}
    </p>
  )

  return (
    <div className="space-y-4">
      {/* Resolution Summary */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Həll Xülasəsi <span className="text-red-400">*</span></label>
        <textarea value={data.resolution_summary ?? ''} onChange={e => onChange({ ...data, resolution_summary: e.target.value })} rows={3}
          placeholder="Hadisə necə həll edildi — atılan addımlar, nəticə..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* ERO note / change request back to the risk owner */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Əlavə Qeyd (risk owner-ə)</label>
        <textarea value={data.ero_note ?? ''} onChange={e => onChange({ ...data, ero_note: e.target.value })} rows={2}
          placeholder="Dəyişiklik tələbi və ya əlavə qeyd — risk owner görəcək…"
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* CAPA — corrective + preventive, stacked inline (no add button, no modal) */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--brand-500)' }}>Tədbirlər (CAPA)</p>
        <p className="text-[10px] mb-2" style={{ color: 'var(--muted-fg)' }}>
          Korrektiv = insidenti aradan qaldırmaq üçün dərhal görülən iş · Preventiv = kök səbəbə qarşı gələcək tədbir (kontrol)
        </p>

        <div className="space-y-3">
          {/* Korrektiv */}
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">Korrektiv</span>
            <input value={corrective?.title ?? ''} onChange={e => patchAction('collective', { title: e.target.value })}
              placeholder="Korrektiv tədbirin adı..." className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none" style={cardInput} />
            <div className="flex items-center gap-1.5">{statusButtons(corrective, 'collective')}</div>
            {assigneeDue(corrective, 'collective')}
          </div>

          {/* Preventiv */}
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400">Preventiv</span>
            <input value={preventive?.title ?? ''} onChange={e => patchAction('preventive', { title: e.target.value })}
              placeholder="Preventiv tədbirin adı..." className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none" style={cardInput} />
            <div className="flex items-center gap-1.5">{statusButtons(preventive, 'preventive')}</div>

            {/* Control plan — optimize inherited control OR apply a new (pending) control */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--card)' }}>
              {(['improve_existing', 'new_control'] as const).map(m => (
                <button key={m} type="button" onClick={() => patchAction('preventive', { control_mode: m })}
                  className="flex-1 py-1 rounded text-[10px] font-semibold transition-all"
                  style={(preventive?.control_mode ?? 'improve_existing') === m ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
                  {m === 'improve_existing' ? 'Cari kontrolu optimallaşdır' : 'Yeni kontrol tətbiq et'}
                </button>
              ))}
            </div>

            {(preventive?.control_mode ?? 'improve_existing') === 'improve_existing' ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-medium flex items-center gap-1 mb-1" style={{ color: 'var(--muted-fg)' }}>
                    <Lock className="w-3 h-3" /> Cari Kontrol (investigation-dan avtomatik)
                  </label>
                  {inheritedControl ? (
                    <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ ...cardInput, opacity: 0.85 }}>
                      {inheritedControl.control_id} · {inheritedControl.title}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-400">
                      Investigation addımında &quot;Cari Kontrol&quot; seçilməyib — optimallaşdırma üçün əvvəlcə orada kontrol seçin.
                    </p>
                  )}
                </div>
                <textarea value={preventive?.optimization_proposal ?? ''} onChange={e => patchAction('preventive', { optimization_proposal: e.target.value })}
                  rows={2} placeholder="Optimallaşdırma təklifi — nə dəyişdirilməlidir..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none" style={cardInput} />
                {sent ? reflectBadge : (
                  <button type="button" onClick={createOptimizationRequest} disabled={creating || !inheritedControl}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: 'var(--brand-500)' }}>
                    <ShieldPlus className="w-3.5 h-3.5" /> {creating ? 'Göndərilir…' : 'Risk Management-ə optimizasiya sorğusu göndər'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea value={preventive?.description ?? ''} onChange={e => patchAction('preventive', { description: e.target.value })}
                  rows={2} placeholder="Yeni kontrolun təsviri — nə tətbiq olunacaq..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none" style={cardInput} />
                {sent ? reflectBadge : (
                  <button type="button" onClick={createNewControl} disabled={creating}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: 'var(--brand-500)' }}>
                    <ShieldPlus className="w-3.5 h-3.5" /> {creating ? 'Yaradılır…' : 'Risk Management-ə yeni kontrol sorğusu göndər'}
                  </button>
                )}
              </div>
            )}

            {assigneeDue(preventive, 'preventive')}
          </div>
        </div>
      </div>

      {/* Lessons Learned */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Lessons Learned</label>
        <textarea value={data.lessons_learned ?? ''} onChange={e => onChange({ ...data, lessons_learned: e.target.value })} rows={3}
          placeholder="Bu hadisədən alınan dərslər — gələcəkdə nə edilməlidir..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Status */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Final Status</label>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
          {(['done', 'closed'] as const).map(s => (
            <button key={s} type="button" onClick={() => onChange({ ...data, status: s })}
              className={cn('flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all')}
              style={data.status === s
                ? { background: 'rgb(5,150,105)', color: '#fff' }
                : { color: 'var(--muted-fg)' }
              }>{s === 'done' ? 'İcra olundu (Done)' : 'Bağlandı (Closed)'}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
