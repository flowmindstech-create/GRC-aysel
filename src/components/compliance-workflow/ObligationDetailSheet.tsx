'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Edit, ExternalLink, ShieldAlert, BookOpen, History, Building2 } from 'lucide-react'
import { db } from '@/lib/db'
import type {
  ComplianceObligation, ObligationStatus, ObligationCriticality,
  Risk, Control, ObligationAuditLog,
} from '@/types'
import { residualLevelWord, inherentLevelWord } from '@/lib/rcsa-methodology'
import { formatDistanceToNow } from 'date-fns'

const STATUS_LABEL: Record<ObligationStatus, { label: string; classes: string }> = {
  compliant:      { label: 'Compliant',      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  non_compliant:  { label: 'Non-Compliant',  classes: 'bg-red-500/15 text-red-400 border-red-500/25' },
  under_review:   { label: 'Under Review',   classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  not_applicable: { label: 'Not Applicable', classes: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' },
}

const CRITICALITY_LABEL: Record<ObligationCriticality, string> = {
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

interface Props {
  obligation: ComplianceObligation
  onClose: () => void
  onEdit: () => void
}

function auditSummary(log: ObligationAuditLog): string {
  if (log.action === 'status_changed') {
    return `${(log.old_value?.status as string) ?? '?'} → ${(log.new_value?.status as string) ?? '?'}`
  }
  if (log.action === 'created') return 'Obligation created'
  if (log.action === 'deleted') return 'Obligation deleted'
  const keys = Object.keys(log.new_value ?? {})
  return keys.length ? `Updated: ${keys.join(', ')}` : 'Updated'
}

export function ObligationDetailSheet({ obligation, onClose, onEdit }: Props) {
  const [primaryRisk, setPrimaryRisk] = useState<Risk | null>(null)
  const [controls, setControls] = useState<Control[]>([])
  const [audit, setAudit] = useState<ObligationAuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const [controlIds, allRisks, allControls, auditLog] = await Promise.all([
        db.getObligationControlIds(obligation.id),
        db.getRisks(),
        db.getControls(),
        db.getObligationAuditLog(obligation.id),
      ])
      if (!active) return
      setPrimaryRisk(allRisks.find(r => r.id === obligation.primary_risk_id) ?? null)
      setControls(allControls.filter(c => controlIds.includes(c.id)))
      setAudit(auditLog)
      setLoading(false)
    })()
    return () => { active = false }
  }, [obligation.id, obligation.primary_risk_id])

  const sc = STATUS_LABEL[obligation.status]
  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--muted-fg)' }}>{label}</p>
      <p className="text-sm" style={{ color: value ? 'var(--foreground)' : 'var(--muted-fg)' }}>{value || '—'}</p>
    </div>
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md h-full overflow-y-auto border-l shadow-2xl"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="min-w-0">
              <p className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{obligation.obligation_code}</p>
              <h2 className="text-sm font-semibold mt-0.5" style={{ color: 'var(--foreground)' }}>{obligation.title}</h2>
              <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.classes}`}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5" title="Edit">
                <Edit className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5" title="Close">
                <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {obligation.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>{obligation.description}</p>
            )}
            {obligation.compliance_condition && <Field label="Compliance Condition" value={obligation.compliance_condition} />}

            {/* Source */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Framework" value={obligation.source} />
              <Field label="Source Type" value={obligation.source_type} />
              <Field label="Obligation Type" value={obligation.obligation_type === 'commitment' ? 'Commitment' : 'Requirement'} />
              <Field label="Criticality" value={CRITICALITY_LABEL[obligation.criticality]} />
              <Field label="Effective Date" value={obligation.effective_date} />
              <Field label="Next Review" value={obligation.next_review_date} />
            </div>
            <Field label="Source Reference" value={obligation.source_reference} />
            <Field label="Regulator / Authority" value={obligation.regulator} />
            {obligation.source_url && (
              <a href={obligation.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-400">
                <ExternalLink className="w-3.5 h-3.5" /> Source link
              </a>
            )}

            {/* Accountability */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Accountable Owner" value={obligation.accountable_owner} />
              <Field label="Responsible Party" value={obligation.responsible_party} />
              <Field label="Responsible Structure" value={obligation.responsible_structure} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1" style={{ color: 'var(--muted-fg)' }}>
                <Building2 className="w-3 h-3" /> Applicable Departments
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(obligation.applicable_depts ?? []).length === 0 && <span className="text-sm" style={{ color: 'var(--muted-fg)' }}>—</span>}
                {(obligation.applicable_depts ?? []).map(d => (
                  <span key={d} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>{d}</span>
                ))}
              </div>
            </div>

            {/* Related Risk */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--brand-500)' }}>
                <ShieldAlert className="w-3.5 h-3.5" /> Related Risk
              </p>
              {loading ? <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Loading…</p>
                : !primaryRisk ? <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>No related risk.</p>
                : (
                  <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--muted)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{primaryRisk.risk_code ?? '—'}</span>
                      <span className="text-xs truncate" style={{ color: 'var(--foreground)' }}>{primaryRisk.title}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div><p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Degree</p><p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{primaryRisk.residual_level ? residualLevelWord(primaryRisk.residual_level) : '—'}</p></div>
                      <div><p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Likelihood</p><p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{primaryRisk.likelihood ?? '—'}/5</p></div>
                      <div><p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Initial</p><p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{inherentLevelWord(primaryRisk.level)}</p></div>
                    </div>
                  </div>
                )}
            </div>

            {/* Linked Controls */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--brand-500)' }}>
                <BookOpen className="w-3.5 h-3.5" /> Linked Controls ({controls.length})
              </p>
              {loading ? <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Loading…</p>
                : controls.length === 0 ? <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>No linked controls.</p>
                : (
                  <div className="space-y-1.5">
                    {controls.map(c => (
                      <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--muted)' }}>
                        <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{c.control_id}</span>
                        <span className="text-xs truncate" style={{ color: 'var(--foreground)' }}>{c.title}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Audit log */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--brand-500)' }}>
                <History className="w-3.5 h-3.5" /> Change History
              </p>
              {loading ? <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Loading…</p>
                : audit.length === 0 ? <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>No history yet.</p>
                : (
                  <div className="space-y-3 border-l pl-3" style={{ borderColor: 'var(--border)' }}>
                    {audit.map(log => (
                      <div key={log.id} className="relative">
                        <span className="absolute -left-[18px] top-1 w-2 h-2 rounded-full" style={{ background: 'var(--brand-500)' }} />
                        <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{auditSummary(log)}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                          {log.changed_by} · {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
