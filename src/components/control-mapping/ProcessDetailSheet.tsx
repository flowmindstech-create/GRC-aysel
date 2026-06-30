'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Edit, Workflow, ShieldCheck, AlertTriangle, FileText, BookCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Process, Control, Risk, Policy, ComplianceObligation } from '@/types'

interface ProcessLinks {
  controlIds: string[]
  riskIds: string[]
  obligationIds: string[]
  policyIds: string[]
}

interface Props {
  process: Process
  links: ProcessLinks
  ctrlById: Record<string, Control>
  riskById: Record<string, Risk>
  oblById: Record<string, ComplianceObligation>
  polById: Record<string, Policy>
  onEdit: () => void
  onClose: () => void
}

// Local label maps (kept here to avoid a circular import with ProcessesClient).
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Active',   cls: 'bg-emerald-500/15 text-emerald-400' },
  draft:    { label: 'Draft',    cls: 'bg-amber-500/15 text-amber-400' },
  archived: { label: 'Archived', cls: 'bg-zinc-500/15 text-zinc-400' },
}
const CRIT_LABEL: Record<string, { label: string; cls: string }> = {
  minimal:  { label: 'Minimal',  cls: 'bg-slate-500/15 text-slate-400' },
  low:      { label: 'Low',      cls: 'bg-emerald-500/15 text-emerald-400' },
  medium:   { label: 'Medium',   cls: 'bg-amber-500/15 text-amber-400' },
  high:     { label: 'High',     cls: 'bg-orange-500/15 text-orange-400' },
  critical: { label: 'Critical', cls: 'bg-red-500/15 text-red-400' },
}
const AUTO_LABEL: Record<string, { label: string; cls: string }> = {
  manual:    { label: 'Manual',    cls: 'bg-zinc-500/15 text-zinc-400' },
  automated: { label: 'Automated', cls: 'bg-emerald-500/15 text-emerald-400' },
  hybrid:    { label: 'Hybrid',    cls: 'bg-sky-500/15 text-sky-400' },
}

const ctrlDot = (s?: string) =>
  s === 'pass' || s === 'effective' ? '#34d399' : s === 'fail' ? '#f87171' : s === 'partial' ? '#fbbf24' : 'var(--muted-fg)'

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', cls)}>{label}</span>
}

export function ProcessDetailSheet({ process, links, ctrlById, riskById, oblById, polById, onEdit, onClose }: Props) {
  const st = STATUS_LABEL[process.status ?? 'active']
  const cr = CRIT_LABEL[process.criticality ?? 'medium']
  const au = AUTO_LABEL[process.automation ?? 'manual']

  const controls = links.controlIds.map(id => ctrlById[id]).filter(Boolean)
  const risks = links.riskIds.map(id => riskById[id]).filter(Boolean)
  const policies = links.policyIds.map(id => polById[id]).filter(Boolean)
  const obligations = links.obligationIds.map(id => oblById[id]).filter(Boolean)

  // One linked-entity row: code chip + full title + optional meta line. Hover-highlighted.
  const linkRow = (key: string, code: string, title: string, codeCls: string, meta?: React.ReactNode) => (
    <div key={key} className="flex items-start gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/[0.04]"
      style={{ border: '1px solid var(--border)' }}>
      <span className={cn('mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap shrink-0', codeCls)}>{code}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{title}</p>
        {meta && <div className="text-[10px] mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted-fg)' }}>{meta}</div>}
      </div>
    </div>
  )

  const section = (icon: React.ReactNode, label: string, count: number, children: React.ReactNode) => (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--brand-500)' }}>
        {icon} {label} <span style={{ color: 'var(--muted-fg)' }}>({count})</span>
      </p>
      {count === 0
        ? <p className="text-xs px-1" style={{ color: 'var(--muted-fg)' }}>— Yoxdur</p>
        : <div className="space-y-1.5">{children}</div>}
    </div>
  )

  const meta = { label: 'block text-[10px] font-medium uppercase tracking-wide mb-0.5' }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }} className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-500)' }} />
                <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{process.code}</span>
              </div>
              <h2 className="text-sm font-semibold mt-1 truncate" style={{ color: 'var(--foreground)' }}>{process.name}</h2>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 shrink-0"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <div className="h-0.5 mx-6" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />

          <div className="px-6 py-5 space-y-5">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className={meta.label} style={{ color: 'var(--muted-fg)' }}>Owner Department</p>
                <p className="text-xs" style={{ color: process.owner_dept ? 'var(--foreground)' : 'var(--muted-fg)' }}>{process.owner_dept || '—'}</p>
                {process.owner_name && <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{process.owner_name}</p>}
              </div>
              <div>
                <p className={meta.label} style={{ color: 'var(--muted-fg)' }}>Automation</p>
                <Badge label={au.label} cls={au.cls} />
              </div>
              <div>
                <p className={meta.label} style={{ color: 'var(--muted-fg)' }}>Status</p>
                <Badge label={st.label} cls={st.cls} />
              </div>
              <div>
                <p className={meta.label} style={{ color: 'var(--muted-fg)' }}>Criticality (Tier)</p>
                <Badge label={cr.label} cls={cr.cls} />
              </div>
            </div>

            {process.description && (
              <div>
                <p className={meta.label} style={{ color: 'var(--muted-fg)' }}>Description</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>{process.description}</p>
              </div>
            )}

            {/* Linked entities — full names + meta (answers "this control is what?") */}
            {section(<ShieldCheck className="w-3.5 h-3.5" />, 'Controls', controls.length,
              controls.map(c => linkRow(c.id, c.control_id, c.title, 'bg-sky-500/12 text-sky-400',
                <>
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: ctrlDot(c.status) }} />{c.status}</span>
                  {c.control_type && <span>· {c.control_type}</span>}
                </>)))}

            {section(<AlertTriangle className="w-3.5 h-3.5" />, 'Risks', risks.length,
              risks.map(r => linkRow(r.id, r.risk_code ?? '—', r.title, 'bg-rose-500/12 text-rose-400',
                <span>{r.status}</span>)))}

            {section(<FileText className="w-3.5 h-3.5" />, 'Policies', policies.length,
              policies.map(p => linkRow(p.id, `${p.policy_id}${p.version ? ` v${p.version}` : ''}`, p.title, 'bg-indigo-500/12 text-indigo-400',
                <span>{p.status}</span>)))}

            {section(<BookCheck className="w-3.5 h-3.5" />, 'Obligations', obligations.length,
              obligations.map(o => linkRow(o.id, o.obligation_code, o.title, 'bg-violet-500/12 text-violet-400',
                <>
                  <span>{o.status}</span>
                  {o.obligation_type && <span>· {o.obligation_type}</span>}
                </>)))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t sticky bottom-0" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-white/5" style={{ color: 'var(--muted-fg)' }}>Bağla</button>
            <button onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: 'var(--brand-500)' }}>
              <Edit className="w-3.5 h-3.5" /> Redaktə et
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
