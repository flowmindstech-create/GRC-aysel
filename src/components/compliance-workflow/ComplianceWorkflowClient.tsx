'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import type { ComplianceObligation, ObligationStatus, ObligationSource, ObligationCriticality, ObligationType, Risk } from '@/types'
import { residualLevelWord, inherentLevelWord } from '@/lib/rcsa-methodology'
import { cn } from '@/lib/utils'
import { ObligationFormDialog } from './ObligationFormDialog'
import { ObligationDetailSheet } from './ObligationDetailSheet'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  ChevronDown, ScrollText, CheckCircle2, Clock,
  XCircle, Layers, AlertCircle, Link2,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Compliance status config ────────────────────────────────────────────────

const STATUS_CONFIG: Record<ObligationStatus, { label: string; classes: string; dot: string }> = {
  compliant:      { label: 'Compliant',      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
  non_compliant:  { label: 'Non-Compliant',  classes: 'bg-red-500/15 text-red-400 border-red-500/25',             dot: 'bg-red-400' },
  under_review:   { label: 'Under Review',   classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25',       dot: 'bg-amber-400' },
  not_applicable: { label: 'Not Applicable', classes: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',          dot: 'bg-zinc-500' },
}

const ALL_STATUSES: ObligationStatus[] = ['compliant', 'non_compliant', 'under_review', 'not_applicable']

const CRITICALITY_CONFIG: Record<ObligationCriticality, { label: string; classes: string }> = {
  minimal:  { label: 'Minimal',  classes: 'bg-slate-500/15 text-slate-400' },
  low:      { label: 'Low',      classes: 'bg-emerald-500/15 text-emerald-400' },
  medium:   { label: 'Medium',   classes: 'bg-amber-500/15 text-amber-400' },
  high:     { label: 'High',     classes: 'bg-orange-500/15 text-orange-400' },
  critical: { label: 'Critical', classes: 'bg-red-500/15 text-red-400' },
}

const TYPE_CONFIG: Record<ObligationType, { label: string; classes: string }> = {
  requirement: { label: 'Mandatory', classes: 'bg-blue-500/15 text-blue-400' },
  commitment:  { label: 'Voluntary', classes: 'bg-violet-500/15 text-violet-400' },
}

// Derived: review date has passed (and the obligation is still applicable)
function isOverdue(o: ComplianceObligation): boolean {
  if (!o.next_review_date || o.status === 'not_applicable') return false
  const d = new Date(o.next_review_date); d.setHours(23, 59, 59, 999)
  return d.getTime() < Date.now()
}

const SOURCE_COLORS: Record<ObligationSource, string> = {
  'ISO 27001':        'bg-blue-500/12 text-blue-400',
  'GDPR':             'bg-purple-500/12 text-purple-400',
  'SOC 2':            'bg-cyan-500/12 text-cyan-400',
  'PCI DSS':          'bg-orange-500/12 text-orange-400',
  'Local Regulation': 'bg-green-500/12 text-green-400',
  'Internal Policy':  'bg-indigo-500/12 text-indigo-400',
  'Contractual':      'bg-rose-500/12 text-rose-400',
  'Other':            'bg-zinc-500/12 text-zinc-400',
}

const ALL_SOURCES: ObligationSource[] = [
  'ISO 27001', 'GDPR', 'SOC 2', 'PCI DSS',
  'Local Regulation', 'Internal Policy', 'Contractual', 'Other',
]

// ── Main ──────────────────────────────────────────────────────────────────────

export function ComplianceWorkflowClient() {
  const [obligations, setObligations] = useState<ComplianceObligation[]>([])
  const [risksById, setRisksById]     = useState<Record<string, Risk>>({})
  const [linkCounts, setLinkCounts]   = useState<Record<string, { risks: number; controls: number; policies: number }>>({})
  const [linkMaps, setLinkMaps]       = useState<Record<string, { controlIds: string[]; policyIds: string[] }>>({})
  const [controlCodeById, setControlCode] = useState<Record<string, string>>({})
  const [policyCodeById, setPolicyCode]   = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editItem, setEditItem]       = useState<ComplianceObligation | null>(null)
  const [detailItem, setDetailItem]   = useState<ComplianceObligation | null>(null)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<ObligationStatus | 'all' | 'overdue'>('all')
  const [sourceFilter, setSourceFilter] = useState<ObligationSource | 'all'>('all')
  const [menuOpen, setMenuOpen]       = useState<string | null>(null)
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)

  useEffect(() => {
    const close = () => { setMenuOpen(null); setOpenStatusId(null) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const [data, counts, maps, riskList, controlList, policyList] = await Promise.all([
      db.getObligations(), db.getObligationLinkCounts(), db.getObligationLinkMaps(),
      db.getRisks(), db.getControls(), dbExt.getPolicies(),
    ])
    setObligations(data)
    setLinkCounts(counts)
    setLinkMaps(maps)
    setRisksById(Object.fromEntries(riskList.map(r => [r.id, r])))
    setControlCode(Object.fromEntries(controlList.map(c => [c.id, c.control_id])))
    setPolicyCode(Object.fromEntries(policyList.map(p => [p.id, p.policy_id])))
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => obligations.filter(o => {
    const matchSearch = !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.obligation_code.toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'overdue' ? isOverdue(o) : o.status === statusFilter)
    const matchSource = sourceFilter === 'all' || o.source === sourceFilter
    return matchSearch && matchStatus && matchSource
  }), [obligations, search, statusFilter, sourceFilter])

  const stats = useMemo(() => ({
    total:         obligations.length,
    compliant:     obligations.filter(o => o.status === 'compliant').length,
    non_compliant: obligations.filter(o => o.status === 'non_compliant').length,
    review:        obligations.filter(o => o.status === 'under_review').length,
    overdue:       obligations.filter(isOverdue).length,
  }), [obligations])

  async function handleSave(item: ComplianceObligation) {
    const saved = await db.saveObligation(item)
    setObligations(prev => {
      const idx = prev.findIndex(o => o.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
    setShowForm(false)
    setEditItem(null)
    toast.success(editItem ? 'Obligation updated' : 'Obligation created')
  }

  async function handleDelete(id: string) {
    await db.deleteObligation(id)
    setObligations(prev => prev.filter(o => o.id !== id))
    setMenuOpen(null)
    reload()
    toast.success('Obligation deleted')
  }

  async function handleStatusChange(item: ComplianceObligation, newStatus: ObligationStatus) {
    const updated = { ...item, status: newStatus }
    await handleSave(updated)
    setOpenStatusId(null)
    toast.success(`Status changed to ${STATUS_CONFIG[newStatus].label}`)
  }

  return (
    <div className="space-y-5">
      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Obligations', value: stats.total,         icon: Layers,      color: '14,165,233' },
          { label: 'Compliant',         value: stats.compliant,     icon: CheckCircle2, color: '5,150,105'  },
          { label: 'Non-Compliant',     value: stats.non_compliant, icon: XCircle,      color: '225,29,72'  },
          { label: 'Under Review',      value: stats.review,        icon: AlertCircle,  color: '234,179,8'  },
          { label: 'Overdue Review',    value: stats.overdue,       icon: Clock,        color: '234,88,12'  },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4 overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, rgba(${s.color},0.7), transparent)` }} />
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${s.color},0.12)`, boxShadow: `0 0 12px rgba(${s.color},0.15)` }}>
                <s.icon className="w-4 h-4" style={{ color: `rgb(${s.color})` }} />
              </div>
            </div>
            <p className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search obligations…" aria-label="Search obligations"
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {(['all', ...ALL_STATUSES, 'overdue'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all')}
              style={statusFilter === s ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
              {s === 'all' ? 'All' : s === 'overdue' ? 'Overdue' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as ObligationSource | 'all')}
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <option value="all">All Sources</option>
          {ALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg"
          style={{ background: 'var(--brand-500)', boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}>
          <Plus className="w-4 h-4" /> New Obligation
        </button>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Code', 'Requirement', 'Source', 'Regulator', 'Scope', 'Compliance Article', 'Status', 'Type', 'Criticality', 'Resp. Structure', 'Resp. Person', 'Related Risk', 'Degree', 'Likelihood', 'Initial', 'Related Control', 'Related Policy', 'Evidence', 'Risk of N/C', 'Links', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={21} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={21} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No obligations found</p>
                      <p className="text-xs opacity-60">Create a new obligation to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .map((item, i) => {
                    const isNearBottom = filtered.length > 2 && i >= filtered.length - 2
                    const sc = STATUS_CONFIG[item.status]
                    const cc = CRITICALITY_CONFIG[item.criticality]
                    const lc = linkCounts[item.id] ?? { risks: 0, controls: 0, policies: 0 }
                    const lm = linkMaps[item.id] ?? { controlIds: [], policyIds: [] }
                    const ctrlCodes = lm.controlIds.map(id => controlCodeById[id]).filter(Boolean)
                    const polCodes  = lm.policyIds.map(id => policyCodeById[id]).filter(Boolean)
                    const relatedRisk = item.primary_risk_id ? risksById[item.primary_risk_id] : undefined
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        onClick={() => setDetailItem(item)}
                        className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        {/* Code */}
                        <td className="px-3 py-3.5">
                          <span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{item.obligation_code}</span>
                        </td>

                        {/* Obligation */}
                        <td className="px-3 py-3.5 max-w-xs">
                          <p className="text-sm font-medium truncate group-hover:text-sky-500 transition-colors" style={{ color: 'var(--foreground)' }}>{item.title}</p>
                          {item.description && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-fg)' }}>
                              {item.description.slice(0, 60)}{item.description.length > 60 ? '…' : ''}
                            </p>
                          )}
                        </td>

                        {/* Source */}
                        <td className="px-3 py-3.5">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap', SOURCE_COLORS[item.source] ?? SOURCE_COLORS['Other'])}>
                            {item.source}
                          </span>
                          <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--muted-fg)' }}>{item.source_type}</p>
                        </td>

                        {/* Regulator */}
                        <td className="px-3 py-3.5 max-w-[140px]">
                          <span className="text-xs truncate block" style={{ color: item.regulator ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                            {item.regulator || '—'}
                          </span>
                        </td>

                        {/* Compliance condition */}
                        <td className="px-3 py-3.5 max-w-[160px]">
                          <span className="text-xs truncate block" style={{ color: item.compliance_condition ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                            {item.compliance_condition || '—'}
                          </span>
                        </td>

                        {/* Article */}
                        <td className="px-3 py-3.5 max-w-[140px]">
                          <span className="text-xs truncate block" style={{ color: item.source_reference ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                            {item.source_reference || '—'}
                          </span>
                        </td>

                        {/* Status dropdown */}
                        <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <button
                              onClick={e => { e.stopPropagation(); setOpenStatusId(openStatusId === item.id ? null : item.id) }}
                              className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all hover:brightness-110 shadow-sm outline-none', sc.classes)}>
                              <span>{sc.label}</span>
                              <ChevronDown className="w-3 h-3 shrink-0 opacity-80" />
                            </button>
                            {openStatusId === item.id && (
                              <div className={cn("absolute left-0 mt-1.5 w-44 rounded-xl shadow-2xl z-30 border py-1 animate-in fade-in slide-in-from-top-1 duration-150", isNearBottom && "bottom-full mb-1 mt-0")}
                                style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                                {ALL_STATUSES.map(s => (
                                  <button key={s} onClick={() => handleStatusChange(item, s)}
                                    className="w-full flex items-center px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors font-semibold"
                                    style={{ color: item.status === s ? '#38bdf8' : 'var(--foreground)' }}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full mr-2 shrink-0', STATUS_CONFIG[s].dot)} />
                                    {STATUS_CONFIG[s].label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {isOverdue(item) && (
                            <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/15 text-orange-400 whitespace-nowrap">
                              <Clock className="w-2.5 h-2.5" /> Overdue Review
                            </span>
                          )}
                        </td>

                        {/* Obligation type */}
                        <td className="px-3 py-3.5">
                          {(() => {
                            const t = TYPE_CONFIG[item.obligation_type ?? 'requirement']
                            return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap', t.classes)}>{t.label}</span>
                          })()}
                        </td>

                        {/* Criticality */}
                        <td className="px-3 py-3.5">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', cc.classes)}>{cc.label}</span>
                        </td>

                        {/* Responsible structure */}
                        <td className="px-3 py-3.5">
                          <span className="text-xs whitespace-nowrap" style={{ color: item.responsible_structure ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                            {item.responsible_structure ?? '—'}
                          </span>
                        </td>

                        {/* Responsible person */}
                        <td className="px-3 py-3.5">
                          <span className="text-xs whitespace-nowrap" style={{ color: item.responsible_party ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                            {item.responsible_party ?? '—'}
                          </span>
                        </td>

                        {/* Related risk */}
                        <td className="px-3 py-3.5">
                          <span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: relatedRisk ? 'var(--brand-500)' : 'var(--muted-fg)' }}>
                            {relatedRisk?.risk_code ?? '—'}
                          </span>
                        </td>

                        {/* Risk degree (residual) */}
                        <td className="px-3 py-3.5">
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>
                            {relatedRisk?.residual_level ? residualLevelWord(relatedRisk.residual_level) : '—'}
                          </span>
                        </td>

                        {/* Risk likelihood */}
                        <td className="px-3 py-3.5">
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>
                            {relatedRisk?.likelihood ? `${relatedRisk.likelihood}/5` : '—'}
                          </span>
                        </td>

                        {/* Initial degree (inherent) */}
                        <td className="px-3 py-3.5">
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>
                            {relatedRisk ? inherentLevelWord(relatedRisk.level) : '—'}
                          </span>
                        </td>

                        {/* Related Control */}
                        <td className="px-3 py-3.5 max-w-[150px]">
                          {ctrlCodes.length === 0 ? (
                            <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
                          ) : (
                            <span className="inline-flex flex-wrap gap-1">
                              {ctrlCodes.slice(0, 2).map(code => (
                                <span key={code} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/12 text-sky-400 whitespace-nowrap">{code}</span>
                              ))}
                              {ctrlCodes.length > 2 && <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>+{ctrlCodes.length - 2}</span>}
                            </span>
                          )}
                        </td>

                        {/* Related Policy */}
                        <td className="px-3 py-3.5 max-w-[150px]">
                          {polCodes.length === 0 ? (
                            <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
                          ) : (
                            <span className="inline-flex flex-wrap gap-1">
                              {polCodes.slice(0, 2).map(code => (
                                <span key={code} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/12 text-indigo-400 whitespace-nowrap">{code}</span>
                              ))}
                              {polCodes.length > 2 && <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>+{polCodes.length - 2}</span>}
                            </span>
                          )}
                        </td>

                        {/* Evidence */}
                        <td className="px-3 py-3.5 max-w-[150px]">
                          <span className="text-xs truncate block" style={{ color: item.evidence ? 'var(--foreground)' : 'var(--muted-fg)' }} title={item.evidence || undefined}>
                            {item.evidence || '—'}
                          </span>
                        </td>

                        {/* Risk of non-compliance */}
                        <td className="px-3 py-3.5 max-w-[160px]">
                          {item.materialized_risk_id ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/15 text-orange-400 whitespace-nowrap" title="Materialized into an active risk">
                              <AlertCircle className="w-2.5 h-2.5" /> {risksById[item.materialized_risk_id]?.risk_code ?? 'Active risk'}
                            </span>
                          ) : (
                            <span className="text-xs truncate block" style={{ color: item.noncompliance_risk ? 'var(--foreground)' : 'var(--muted-fg)' }} title={item.noncompliance_risk || undefined}>
                              {item.noncompliance_risk || '—'}
                            </span>
                          )}
                        </td>

                        {/* Links */}
                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap" style={{ color: (lc.risks || lc.controls || lc.policies) ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                            <Link2 className="w-3 h-3" /> {lc.risks}R · {lc.controls}C · {lc.policies}P
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === item.id ? null : item.id) }} aria-label="Obligation actions"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                              <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                            </button>
                            {menuOpen === item.id && (
                              <div className={cn("absolute right-0 w-40 rounded-xl shadow-xl z-20 border py-1", isNearBottom ? "bottom-full mb-1" : "top-full mt-1")}
                                style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => { setDetailItem(item); setMenuOpen(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left" style={{ color: 'var(--foreground)' }}>
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                                <button onClick={() => { setEditItem(item); setShowForm(true); setMenuOpen(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left" style={{ color: 'var(--foreground)' }}>
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button onClick={() => handleDelete(item.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Form Dialog ──────────────────────────────────────────────── */}
      {showForm && (
        <ObligationFormDialog
          key={editItem?.id ?? 'new'}
          obligation={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSave={handleSave}
          onSaved={reload}
        />
      )}

      {/* ── Detail Sheet ─────────────────────────────────────────────── */}
      {detailItem && (
        <ObligationDetailSheet
          obligation={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => { setEditItem(detailItem); setDetailItem(null); setShowForm(true) }}
          onSaved={reload}
        />
      )}
    </div>
  )
}
