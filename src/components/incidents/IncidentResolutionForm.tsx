'use client'

import { Plus, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Incident, CorrectiveAction } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'

interface Props {
  data: Partial<Incident>
  onChange: (data: Partial<Incident>) => void
}

export function IncidentResolutionForm({ data, onChange }: Props) {
  const actions = data.corrective_actions ?? []

  function addAction() {
    const newAction: CorrectiveAction = {
      id: crypto.randomUUID(),
      title: '',
      status: 'pending',
    }
    onChange({ ...data, corrective_actions: [...actions, newAction] })
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

      {/* Corrective Actions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand-500)' }}>
            Korrektiv Tədbirlər
          </p>
          <button type="button" onClick={addAction}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:bg-sky-500/10"
            style={{ color: 'var(--brand-500)' }}>
            <Plus className="w-3 h-3" /> Əlavə et
          </button>
        </div>

        {actions.length === 0 && (
          <div className="text-center py-6 rounded-xl border border-dashed"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
            <p className="text-xs">Hələ ki korrektiv tədbir yoxdur</p>
            <button type="button" onClick={addAction}
              className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--brand-500)' }}>
              + İlk tədbiri əlavə edin
            </button>
          </div>
        )}

        <div className="space-y-2">
          {actions.map((action, idx) => (
            <div key={action.id} className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold" style={{ color: 'var(--brand-500)' }}>#{idx + 1}</span>
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

      {/* Reputation Impact */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Reputasiya Təsiri</label>
        <textarea value={data.reputation_impact ?? ''} onChange={e => onChange({ ...data, reputation_impact: e.target.value })} rows={2}
          placeholder="Hadisənin reputasiyaya təsiri (varsa)..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Status */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Final Status</label>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
          {(['resolved', 'closed'] as const).map(s => (
            <button key={s} type="button" onClick={() => onChange({ ...data, status: s })}
              className={cn('flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all')}
              style={data.status === s
                ? { background: 'rgb(5,150,105)', color: '#fff' }
                : { color: 'var(--muted-fg)' }
              }>{s === 'resolved' ? 'Həll edildi' : 'Bağlandı'}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
