'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Landmark, ClipboardList, BookOpen, AlertCircle, Save } from 'lucide-react'
import { db } from '@/lib/db'
import type { RegulatoryChange, ComplianceObligation, RegulatoryChangeStatus } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  change: RegulatoryChange
  onClose: () => void
  onSaved: () => void
  onEdit: () => void
}

const STATUS_CONFIG: Record<RegulatoryChangeStatus, { label: string; classes: string }> = {
  new:              { label: 'New',              classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  under_assessment: { label: 'Under Assessment', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  implemented:      { label: 'Implemented',      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  closed:           { label: 'Closed',           classes: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' },
}

export function RegulatoryChangeDetailSheet({ change, onClose, onSaved, onEdit }: Props) {
  const [impactAssessment, setImpactAssessment] = useState(change.impact_assessment ?? '')
  const [status, setStatus] = useState<RegulatoryChangeStatus>(change.status)
  const [saving, setSaving] = useState(false)
  const [affectedObligations, setAffectedObligations] = useState<ComplianceObligation[]>([])
  const [loadingObligations, setLoadingObligations] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const ids = await db.getRegulatoryChangeObligationIds(change.id)
        const all = await db.getObligations()
        if (active) {
          setAffectedObligations(all.filter(o => ids.includes(o.id)))
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (active) setLoadingObligations(false)
      }
    })()
    return () => { active = false }
  }, [change.id])

  async function handleSaveAssessment() {
    setSaving(true)
    try {
      const updated: RegulatoryChange = {
        ...change,
        impact_assessment: impactAssessment.trim() || undefined,
        status,
        updated_at: new Date().toISOString(),
      }
      await db.saveRegulatoryChange(updated)
      toast.success('Impact assessment saved successfully')
      onSaved()
    } catch (err) {
      toast.error('Failed to save impact assessment')
    } finally {
      setSaving(false)
    }
  }

  const sc = STATUS_CONFIG[status]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-md h-full shadow-2xl flex flex-col"
          style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>
                  {change.change_code}
                </span>
                <h2 className="text-sm font-semibold leading-snug mt-1" style={{ color: 'var(--foreground)' }}>
                  {change.title}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', sc.classes)}>
                    {sc.label}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meta details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Regulator</span>
                </div>
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                  {change.regulator ?? '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Issue Date</span>
                </div>
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                  {change.change_date ? format(new Date(change.change_date), 'd MMM yyyy') : '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Effective Date</span>
                </div>
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                  {change.effective_date ? format(new Date(change.effective_date), 'd MMM yyyy') : '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>
                  <span>Assessor</span>
                </div>
                <p className="text-xs font-semibold" style={{ color: change.assessor ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                  {change.assessor ?? '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>
                  <span>Responsibility</span>
                </div>
                <p className="text-xs font-semibold" style={{ color: (change.responsible_person || change.responsible_structure) ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                  {change.responsible_person ?? change.responsible_structure ?? '—'}
                </p>
              </div>
            </div>

            {change.business_effect && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>Business Effect</p>
                <div className="p-4 rounded-xl border text-xs leading-relaxed" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  {change.business_effect}
                </div>
              </div>
            )}

            {change.action_plan && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>Action Plan</p>
                <div className="p-4 rounded-xl border text-xs leading-relaxed" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  {change.action_plan}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>
                Description / Details of Change
              </p>
              <div className="p-4 rounded-xl border text-xs leading-relaxed" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                {change.description}
              </div>
            </div>

            {/* Affected/Linked Obligations */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                <span>Affected Obligations ({affectedObligations.length})</span>
              </div>
              {loadingObligations ? (
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Loading obligations…</p>
              ) : affectedObligations.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>No linked obligations.</p>
              ) : (
                <div className="space-y-2">
                  {affectedObligations.map(ob => (
                    <div key={ob.id} className="p-2.5 rounded-lg border text-xs flex items-center justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] font-bold block" style={{ color: 'var(--brand-500)' }}>
                          {ob.obligation_code}
                        </span>
                        <p className="truncate font-semibold text-slate-200 mt-0.5">{ob.title}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 capitalize shrink-0 font-medium ml-2">
                        {ob.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Impact Assessment Workflow Panel */}
            <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--card)', borderColor: '#0ea5e930' }}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                <ClipboardList className="w-4 h-4" />
                <span>Impact Assessment Workflow</span>
              </div>

              {/* Assessment inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>
                    Assessment Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as RegulatoryChangeStatus)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border outline-none cursor-pointer"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    <option value="new">New</option>
                    <option value="under_assessment">Under Assessment</option>
                    <option value="implemented">Implemented</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>
                    Gap Analysis & Required Actions
                  </label>
                  <textarea
                    value={impactAssessment}
                    onChange={e => setImpactAssessment(e.target.value)}
                    rows={4}
                    placeholder="Identify any gaps between the new regulation and current controls/policies, and define required implementation steps..."
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none leading-relaxed"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  />
                </div>

                <button
                  onClick={handleSaveAssessment}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={onEdit}
              className="flex-1 py-2 rounded-xl text-xs font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Edit Details
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Close
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}
