'use client'

import { useState } from 'react'
import { Plus, Trash2, ShieldPlus, Pencil, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Incident, IncidentPriority, CorrectiveAction } from '@/types'
import { CapaActionDialog } from './CapaActionDialog'

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
  // Modal-edited action; isNew marks an action not yet committed to the list.
  const [editing, setEditing] = useState<{ action: CorrectiveAction; isNew: boolean } | null>(null)

  // SLA-bound latest deadline a CAPA action may have (item 5). Uses the persisted
  // SLA date if set, otherwise derives it from priority relative to acknowledge/now.
  const maxDueDate = (() => {
    if (data.sla_due_date) return data.sla_due_date.slice(0, 10)
    const days = SLA_DAYS[data.priority ?? 'P3_medium']
    const base = data.acknowledged_at ? new Date(data.acknowledged_at) : new Date()
    base.setDate(base.getDate() + days)
    return base.toISOString().slice(0, 10)
  })()

  function openNew(kind: 'collective' | 'preventive') {
    setEditing({
      isNew: true,
      action: {
        id: crypto.randomUUID(),
        title: '',
        status: 'pending',
        kind,
        control_mode: kind === 'preventive' ? 'improve_existing' : undefined,
      },
    })
  }

  function handleModalSave(action: CorrectiveAction) {
    const next = editing?.isNew
      ? [...actions, action]
      : actions.map(a => a.id === action.id ? action : a)
    onChange({ ...data, corrective_actions: next })
    setEditing(null)
  }

  function removeAction(id: string) {
    onChange({ ...data, corrective_actions: actions.filter(a => a.id !== id) })
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'
  const labelCls = 'block text-xs font-medium mb-1.5'
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--brand-500)')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')

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

      {/* CAPA — Corrective & Preventive measures (each opens in its own window) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand-500)' }}>
            Tədbirlər (CAPA)
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => openNew('collective')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:bg-sky-500/10"
              style={{ color: 'var(--brand-500)' }}>
              <Plus className="w-3 h-3" /> Korrektiv
            </button>
            <button type="button" onClick={() => openNew('preventive')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:bg-violet-500/10"
              style={{ color: 'rgb(139,92,246)' }}>
              <Plus className="w-3 h-3" /> Preventiv
            </button>
          </div>
        </div>
        <p className="text-[10px] mb-2" style={{ color: 'var(--muted-fg)' }}>
          Korrektiv = insidenti aradan qaldırmaq üçün dərhal görülən iş · Preventiv = kök səbəbə qarşı gələcək tədbir (kontrol)
        </p>

        {actions.length === 0 && (
          <div className="text-center py-6 rounded-xl border border-dashed"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
            <p className="text-xs">Hələ ki tədbir yoxdur — &quot;Korrektiv&quot; və ya &quot;Preventiv&quot; əlavə edin</p>
          </div>
        )}

        {/* Compact summary list — click a row to edit it in its own window */}
        <div className="space-y-2">
          {actions.map((action, idx) => {
            const badge = STATUS_BADGES[action.status]
            const sent = !!action.created_control_id
            return (
              <div key={action.id}
                className="group flex items-center gap-2 rounded-xl border p-2.5 cursor-pointer transition-colors hover:border-sky-500/40"
                style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
                onClick={() => setEditing({ action, isNew: false })}>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                  action.kind === 'preventive' ? 'bg-violet-500/15 text-violet-400' : 'bg-sky-500/15 text-sky-400')}>
                  #{idx + 1} {action.kind === 'preventive' ? 'Preventiv' : 'Korrektiv'}
                </span>
                <span className="flex-1 min-w-0 truncate text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {action.title || <span style={{ color: 'var(--muted-fg)' }}>(adsız tədbir)</span>}
                </span>
                {action.due_date && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] shrink-0" style={{ color: 'var(--muted-fg)' }}>
                    <CalendarClock className="w-3 h-3" /> {new Date(action.due_date).toLocaleDateString('az-AZ')}
                  </span>
                )}
                {sent && <ShieldPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-label="Kontrol sorğusu göndərilib" />}
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', badge.cls)}>{badge.label}</span>
                <button type="button" aria-label="Düzəlt"
                  onClick={e => { e.stopPropagation(); setEditing({ action, isNew: false }) }}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-sky-500/10 shrink-0">
                  <Pencil className="w-3 h-3 text-sky-400" />
                </button>
                <button type="button" aria-label="Sil"
                  onClick={e => { e.stopPropagation(); removeAction(action.id) }}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 shrink-0">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            )
          })}
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

      {/* CAPA action editor — its own window (item 4) */}
      {editing && (
        <CapaActionDialog
          action={editing.action}
          incident={data}
          maxDueDate={maxDueDate}
          onSave={handleModalSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
