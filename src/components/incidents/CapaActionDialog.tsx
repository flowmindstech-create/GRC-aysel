'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldPlus, Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { generateControlCode } from '@/lib/control-id'
import type { Incident, CorrectiveAction, Control } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'
import { toast } from 'sonner'

interface Props {
  action: CorrectiveAction
  incident: Partial<Incident>
  /** SLA-bound latest allowed deadline (yyyy-mm-dd) — CAPA can't be due after the incident SLA */
  maxDueDate?: string
  onSave: (action: CorrectiveAction) => void
  onClose: () => void
}

const STATUS_BADGES = {
  pending:     { label: 'Gözləyir', cls: 'bg-amber-500/15 text-amber-400' },
  in_progress: { label: 'İcrada', cls: 'bg-blue-500/15 text-blue-400' },
  done:        { label: 'Tamamlanıb', cls: 'bg-emerald-500/15 text-emerald-400' },
} as const

export function CapaActionDialog({ action, incident, maxDueDate, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<CorrectiveAction>(action)
  const [controls, setControls] = useState<Control[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => { db.getControls().then(setControls) }, [])

  // Item 3 — the control to optimize is INHERITED from investigation's "Cari Kontrol"
  // (incident.control_id). No manual control picking here; the two stay integrated.
  const inheritedControl = incident.control_id ? controls.find(c => c.id === incident.control_id) : null

  const isPreventive = draft.kind === 'preventive'
  const sent = !!draft.created_control_id
  const linked = sent ? controls.find(c => c.id === draft.created_control_id) : null
  const approved = linked?.approval_status === 'approved'

  function patch(updates: Partial<CorrectiveAction>) {
    setDraft(prev => ({ ...prev, ...updates }))
  }

  // Create a pending control (library + process map) and link it to this action
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
      if (incident.process_id) {
        const existing = await db.getProcessControlIds(incident.process_id)
        await db.setProcessControls(incident.process_id, [...existing, created.id])
      }
      setControls(prev => [created, ...prev])
      patch({ created_control_id: created.id })
      toast.success(`Sorğu göndərildi: ${created.control_id} — Control Library-də təsdiq gözləyir`)
    } catch {
      toast.error('Sorğu göndərilə bilmədi')
    } finally {
      setCreating(false)
    }
  }

  // NEW control request
  async function createNewControl() {
    if (!draft.title.trim()) { toast.error('Əvvəlcə tədbirin adını yaz'); return }
    await createPendingControlEntry({
      title: draft.title.trim(),
      description: `${draft.description?.trim() || 'Insidentdən yaradılan kontrol (CAPA).'} · İnsident: ${incident.title ?? ''}`.trim(),
    })
  }

  // OPTIMIZATION request for the inherited (investigation) control
  async function createOptimizationRequest() {
    if (!inheritedControl) { toast.error('Investigation-da "Cari Kontrol" seçilməyib'); return }
    if (!draft.optimization_proposal?.trim()) { toast.error('Optimallaşdırma təklifini yaz'); return }
    await createPendingControlEntry({
      title: `Optimizasiya: ${inheritedControl.control_id} · ${inheritedControl.title}`,
      description: `Optimallaşdırma təklifi (insident: ${incident.title ?? '—'}): ${draft.optimization_proposal.trim()}`,
    })
  }

  function handleSave() {
    if (!draft.title.trim()) { toast.error('Tədbirin adını yaz'); return }
    // Keep action.control_id synced to the inherited investigation control (item 3)
    onSave({ ...draft, control_id: isPreventive && draft.control_mode === 'improve_existing' ? incident.control_id : draft.control_id })
  }

  const overInput = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const cardInput = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const labelCls = 'block text-xs font-medium mb-1.5'

  const statusBadge = sent && (
    <p className={cn('text-[10px] flex items-center gap-1', approved ? 'text-emerald-400' : 'text-amber-400')}>
      <ShieldPlus className="w-3 h-3" />
      {approved ? '✅ Təsdiqləndi — kontrol əlavə olundu' : '🟡 Risk Management-də təsdiq gözləyir'}
    </p>
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded',
                isPreventive ? 'bg-violet-500/15 text-violet-400' : 'bg-sky-500/15 text-sky-400')}>
                {isPreventive ? 'Preventiv tədbir' : 'Korrektiv tədbir'}
              </span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>
              {isPreventive
                ? 'Preventiv = kök səbəbə qarşı gələcək tədbir (kontrol).'
                : 'Korrektiv = insidenti aradan qaldırmaq üçün dərhal görülən iş.'}
            </p>

            {/* Title */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Tədbirin adı <span className="text-red-400">*</span></label>
              <input value={draft.title} onChange={e => patch({ title: e.target.value })}
                placeholder="Tədbirin adı..." className={overInput} style={cardInput} />
            </div>

            {/* Status */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Status</label>
              <div className="flex items-center gap-1.5">
                {(['pending', 'in_progress', 'done'] as const).map(s => {
                  const badge = STATUS_BADGES[s]
                  return (
                    <button key={s} type="button" onClick={() => patch({ status: s })}
                      className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all',
                        draft.status === s ? badge.cls : 'opacity-40 hover:opacity-70')}>{badge.label}</button>
                  )
                })}
              </div>
            </div>

            {/* Preventive → optimize inherited control OR apply a new (pending) control */}
            {isPreventive && (
              <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--card)' }}>
                  {(['improve_existing', 'new_control'] as const).map(m => (
                    <button key={m} type="button" onClick={() => patch({ control_mode: m })}
                      className="flex-1 py-1 rounded text-[10px] font-semibold transition-all"
                      style={draft.control_mode === m ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
                      {m === 'improve_existing' ? 'Cari kontrolu optimallaşdır' : 'Yeni kontrol tətbiq et'}
                    </button>
                  ))}
                </div>

                {draft.control_mode === 'improve_existing' ? (
                  <div className="space-y-2">
                    {/* Item 3 — inherited from investigation, read-only (no manual select) */}
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
                    <textarea value={draft.optimization_proposal ?? ''} onChange={e => patch({ optimization_proposal: e.target.value })}
                      rows={2} placeholder="Optimallaşdırma təklifi — nə dəyişdirilməlidir..."
                      className={`${overInput} resize-none`} style={cardInput} />
                    {sent ? statusBadge : (
                      <button type="button" onClick={createOptimizationRequest} disabled={creating || !inheritedControl}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
                        style={{ background: 'var(--brand-500)' }}>
                        <ShieldPlus className="w-3.5 h-3.5" /> {creating ? 'Göndərilir…' : 'Risk Management-ə optimizasiya sorğusu göndər'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea value={draft.description ?? ''} onChange={e => patch({ description: e.target.value })}
                      rows={2} placeholder="Yeni kontrolun təsviri — nə tətbiq olunacaq..."
                      className={`${overInput} resize-none`} style={cardInput} />
                    {sent ? statusBadge : (
                      <button type="button" onClick={createNewControl} disabled={creating}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
                        style={{ background: 'var(--brand-500)' }}>
                        <ShieldPlus className="w-3.5 h-3.5" /> {creating ? 'Yaradılır…' : 'Risk Management-ə yeni kontrol sorğusu göndər'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Assignee + SLA-bound deadline (item 5) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Məsul şəxs</label>
                <select value={draft.assignee ?? ''} onChange={e => patch({ assignee: e.target.value })}
                  className={`${overInput} cursor-pointer`} style={cardInput}>
                  <option value="">Təyin et...</option>
                  {MOCK_USERS.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Son tarix (deadline)</label>
                <input type="date" value={draft.due_date ?? ''} max={maxDueDate}
                  onChange={e => {
                    const v = e.target.value
                    // Clamp to the incident SLA — CAPA can't be due after the SLA deadline
                    patch({ due_date: maxDueDate && v && v > maxDueDate ? maxDueDate : v })
                  }}
                  className={overInput} style={cardInput} />
                {maxDueDate && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                    SLA limiti: {new Date(maxDueDate).toLocaleDateString('az-AZ')} — bundan gec ola bilməz
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: 'var(--muted-fg)' }}>
              Ləğv et
            </button>
            <button type="button" onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
              <Check className="w-4 h-4" /> Tədbiri yadda saxla
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
