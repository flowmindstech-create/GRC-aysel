'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MOCK_AUDITS, MOCK_FINDINGS } from '@/lib/seed-data'
import { db } from '@/lib/db'
import type { Audit, AuditFinding } from '@/types'
import { AuditStatusBadge } from '@/components/shared/Badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Plus, Search, Calendar, User, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuditFormDialog } from './AuditFormDialog'
import { FindingFormDialog } from './FindingFormDialog'

const findingSeverityColor: Record<string, string> = {
  critical: 'text-red-500 bg-red-500/10',
  high:     'text-orange-500 bg-orange-500/10',
  medium:   'text-yellow-500 bg-yellow-500/10',
  low:      'text-blue-500 bg-blue-500/10',
  info:     'text-slate-500 bg-slate-500/10',
}

export function AuditList() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [findings, setFindings] = useState<AuditFinding[]>([])
  const [expanded, setExpanded] = useState<string | null>('a1')
  const [search, setSearch] = useState('')
  const [showAuditForm, setShowAuditForm] = useState(false)
  const [showFindingForm, setShowFindingForm] = useState<string | null>(null) // contains auditId

  useEffect(() => {
    async function load() {
      const a = await db.getAudits()
      const f = await db.getFindings()
      setAudits(a)
      setFindings(f)
    }
    load()
  }, [])

  const filtered = audits.filter(a => (a.title ?? '').toLowerCase().includes(search.toLowerCase()))

  const handleSaveAudit = async (audit: Audit) => {
    const saved = await db.saveAudit(audit)
    setAudits(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next
      }
      return [saved, ...prev]
    })
    setShowAuditForm(false)
  }

  const handleSaveFinding = async (finding: AuditFinding) => {
    const saved = await db.saveFinding(finding)
    setFindings(prev => {
      const idx = prev.findIndex(f => f.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next
      }
      return [saved, ...prev]
    })
    setShowFindingForm(null)
  }

  return (
    <div>
      <PageHeader
        title="Audit Management"
        subtitle={`${audits.length} audits · ${findings.length} findings`}
        actions={
          <button onClick={() => setShowAuditForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" /> New Audit
          </button>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-5 w-80"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <Search className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search audits…" className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: 'var(--foreground)' }} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Audits', value: audits.length, color: 'text-blue-500' },
          { label: 'In Progress', value: audits.filter(a => a.status === 'in_progress').length, color: 'text-orange-500' },
          { label: 'Completed', value: audits.filter(a => a.status === 'completed').length, color: 'text-green-500' },
          { label: 'Open Findings', value: findings.filter(f => f.status === 'open' || f.status === 'in_progress').length, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Audit accordion */}
      <div className="space-y-3">
        {filtered.map((audit, i) => {
          const auditFindings = findings.filter(f => f.audit_id === audit.id)
          const isOpen = expanded === audit.id
          return (
            <motion.div key={audit.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card overflow-hidden">
              {/* Audit header */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(isOpen ? null : audit.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{audit.title}</h3>
                    <AuditStatusBadge status={audit.status} />
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--muted-fg)' }}>{audit.scope}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{audit.auditor_name ?? '—'}</span>
                    {audit.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(audit.start_date), 'dd MMM yyyy')}</span>}
                    {auditFindings.length > 0 && <span className="flex items-center gap-1 text-orange-500"><AlertTriangle className="w-3 h-3" />{auditFindings.length} findings</span>}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
                        : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />}
              </button>

              {/* Findings */}
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }}
                  className="border-t overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  {auditFindings.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>No findings — audit clean!</p>
                    </div>
                  ) : (
                    <div className="p-5 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-fg)' }}>
                        Findings ({auditFindings.length})
                      </p>
                      {auditFindings.map(finding => (
                        <div key={finding.id} className="p-4 rounded-xl" style={{ background: 'var(--muted)' }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', findingSeverityColor[finding.severity])}>
                                  {finding.severity}
                                </span>
                                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{finding.title}</p>
                              </div>
                              <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--muted-fg)' }}>{finding.description}</p>
                              <div className="p-2.5 rounded-lg border-l-2 border-blue-500" style={{ background: 'var(--card)' }}>
                                <p className="text-[10px] font-semibold text-blue-500 mb-0.5">RECOMMENDATION</p>
                                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{finding.recommendation}</p>
                              </div>
                            </div>
                            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0', {
                              'bg-red-500/10 text-red-500': finding.status === 'open',
                              'bg-orange-500/10 text-orange-500': finding.status === 'in_progress',
                              'bg-green-500/10 text-green-500': finding.status === 'resolved',
                              'bg-slate-500/10 text-slate-500': finding.status === 'accepted',
                            })}>
                              {finding.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-5 pb-4 flex gap-2">
                    <button onClick={() => setShowFindingForm(audit.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                      + Add Finding
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                      <FileText className="w-3.5 h-3.5" /> Export Report
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {showAuditForm && (
        <AuditFormDialog audit={null} onClose={() => setShowAuditForm(false)} onSave={handleSaveAudit} />
      )}

      {showFindingForm && (
        <FindingFormDialog auditId={showFindingForm} onClose={() => setShowFindingForm(null)} onSave={handleSaveFinding} />
      )}
    </div>
  )
}

