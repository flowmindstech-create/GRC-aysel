'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ShieldPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { generateControlCode } from '@/lib/control-id'
import type { Incident, CorrectiveAction, Control } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'
import { toast } from 'sonner'

interface Props {
  data: Partial<Incident>
  onChange: (data: Partial<Incident>) => void
}

export function IncidentResolutionForm({ data, onChange }: Props) {
  const actions = data.corrective_actions ?? []
  const [controls, setControls] = useState<Control[]>([])
  const [processControlIds, setProcessControlIds] = useState<string[] | null>(null)
  const [creatingFor, setCreatingFor] = useState<string | null>(null)

  useEffect(() => { db.getControls().then(setControls) }, [])
  useEffect(() => {
    if (!data.process_id) { setProcessControlIds(null); return }
    let active = true
    db.getProcessControlIds(data.process_id).then(ids => { if (active) setProcessControlIds(ids) })
    return () => { active = false }
  }, [data.process_id])

  const selectableControls = processControlIds ? controls.filter(c => processControlIds.includes(c.id)) : controls

  function addAction(kind: 'collective' | 'preventive') {
    const newAction: CorrectiveAction = {
      id: crypto.randomUUID(),
      title: '',
      status: 'pending',
      kind,
      // Preventive measure carries the control plan (optimize current / new control);
      // corrective is just the immediate fix.
      control_mode: kind === 'preventive' ? 'improve_existing' : undefined,
    }
    onChange({ ...data, corrective_actions: [...actions, newAction] })
  }

  // Create a NEW control in "pending" state (library + process map) from a CAPA action
  async function createPendingControl(action: CorrectiveAction) {
    if (!action.title.trim()) { toast.error('Əvvəlcə tədbirin adını yaz'); return }
    setCreatingFor(action.id)
    try {
      const now = new Date().toISOString()
      const created = await db.saveControl({
        id: crypto.randomUUID(),
        org_id: '',
        framework: 'custom',
        control_id: generateControlCode(controls),
        title: action.title.trim(),
        description: `Insidentdən yaradılan kontrol (CAPA). ${data.title ?? ''}`.trim(),
        status: 'partial',
        approval_status: 'pending_review',
        control_type: 'corrective',
        created_at: now,
      } as Control)
      // link to the incident's process if there is one
      if (data.process_id) {
        const existing = await db.getProcessControlIds(data.process_id)
        await db.setProcessControls(data.process_id, [...existing, created.id])
      }
      setControls(prev => [created, ...prev])
      updateAction(action.id, { created_control_id: created.id, control_id: created.id })
      toast.success(`Pending kontrol yaradıldı: ${created.control_id} — Library-də təsdiq gözləyir`)
    } catch {
      toast.error('Kontrol yaradıla bilmədi')
    } finally {
      setCreatingFor(null)
    }
  }

  function updateAction(id: string, updates: Partial<CorrectiveAction>) {
    onChange({
      ...data,
      corrective_actions: actions.map(a => a.id === id ? { ...a, ...updates } : a),
    })
  }

  function removeAction(id: string) {
    onChange({
      ...data,
      corrective_actions: actions.filter(a => a.id !== id),
    })
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'
  const labelCls = 'block text-xs font-medium mb-1.5'
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--brand-500)')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')

  const STATUS_BADGES = {
    pending:     { label: 'Gözləyir', cls: 'bg-amber-500/15 text-amber-400' },
    in_progress: { label: 'İcrada', cls: 'bg-blue-500/15 text-blue-400' },
    done:        { label: 'Tamamlanıb', cls: 'bg-emerald-500/15 text-emerald-400' },
  }

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

      {/* CAPA — Collective & Preventive measures */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand-500)' }}>
            Tədbirlər (CAPA)
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => addAction('collective')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:bg-sky-500/10"
              style={{ color: 'var(--brand-500)' }}>
              <Plus className="w-3 h-3" /> Korrektiv
            </button>
            <button type="button" onClick={() => addAction('preventive')}
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
            <p className="text-xs">Hələ ki tədbir yoxdur</p>
          </div>
        )}

        <div className="space-y-2">
          {actions.map((action, idx) => (
            <div key={action.id} className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                  action.kind === 'preventive' ? 'bg-violet-500/15 text-violet-400' : 'bg-sky-500/15 text-sky-400')}>
                  #{idx + 1} {action.kind === 'preventive' ? 'Preventiv' : 'Korrektiv'}
                </span>
                <div className="flex items-center gap-1">
                  {(['pending', 'in_progress', 'done'] as const).map(s => {
                    const badge = STATUS_BADGES[s]
                    return (
                      <button key={s} type="button" onClick={() => updateAction(action.id, { status: s })}
                        className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all',
                          action.status === s ? badge.cls : 'opacity-40 hover:opacity-70'
                        )}>{badge.label}</button>
                    )
                  })}
                  <button type="button" onClick={() => removeAction(action.id)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 ml-1">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
              <input value={action.title} onChange={e => updateAction(action.id, { title: e.target.value })}
                placeholder="Tədbirin adı..."
                className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />

              {/* Preventive measure → optimize current control OR apply a new (pending) control */}
              {action.kind === 'preventive' && (
                <div className="space-y-2">
                  <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--card)' }}>
                    {(['improve_existing', 'new_control'] as const).map(m => (
                      <button key={m} type="button" onClick={() => updateAction(action.id, { control_mode: m })}
                        className="flex-1 py-1 rounded text-[10px] font-semibold transition-all"
                        style={action.control_mode === m ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
                        {m === 'improve_existing' ? 'Cari kontrolu optimallaşdır' : 'Yeni kontrol tətbiq et'}
                      </button>
                    ))}
                  </div>
                  {action.control_mode === 'improve_existing' ? (
                    <select value={action.control_id ?? ''} onChange={e => updateAction(action.id, { control_id: e.target.value || undefined })}
                      className="w-full px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      <option value="">Kontrol seç...</option>
                      {selectableControls.map(c => <option key={c.id} value={c.id}>{c.control_id} · {c.title}</option>)}
                    </select>
                  ) : action.created_control_id ? (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <ShieldPlus className="w-3 h-3" /> Pending kontrol yaradıldı — Control Library-də təsdiq gözləyir
                    </p>
                  ) : (
                    <button type="button" onClick={() => createPendingControl(action)} disabled={creatingFor === action.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
                      style={{ background: 'var(--brand-500)' }}>
                      <ShieldPlus className="w-3.5 h-3.5" /> {creatingFor === action.id ? 'Yaradılır…' : 'Pending kontrol yarat'}
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <select value={action.assignee ?? ''}
                  onChange={e => updateAction(action.id, { assignee: e.target.value })}
                  className="px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  <option value="">Təyin et...</option>
                  {MOCK_USERS.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
                </select>
                <input type="date" value={action.due_date ?? ''}
                  onChange={e => updateAction(action.id, { due_date: e.target.value })}
                  className="px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lessons Learned */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Lessons Learned</label>
        <textarea value={data.lessons_learned ?? ''} onChange={e => onChange({ ...data, lessons_learned: e.target.value })} rows={3}
          placeholder="Bu hadisədən alınan dərslər — gələcəkdə nə edilməlidir..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Reputation impact removed — reputational risk is tracked in the Risk Register, not per-incident */}

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
