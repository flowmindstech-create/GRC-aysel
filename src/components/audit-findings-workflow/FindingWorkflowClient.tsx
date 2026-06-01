'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { dbExt } from '@/lib/db-extensions'
import { db } from '@/lib/db'
import type { AuditFindingWorkflow, AuditFinding, Audit } from '@/types'
import { cn } from '@/lib/utils'
import {
  Search, Clock, AlertTriangle, CheckCircle2, Activity,
  Layers, Plus, ExternalLink, FileSearch,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const STEP_LABEL: Record<string, string> = {
  registration:               'Registration',
  classification:             'Classification',
  severity_assessment:        'Severity Assessment',
  immediate_correction:       'Immediate Correction',
  verification:               'Verification',
  investigation:              'Investigation',
  evidence_review:            'Evidence Review',
  root_cause_analysis:        'Root Cause Analysis',
  compliance_impact_assessment: 'Compliance Impact',
  corrective_action_gate:     'Corrective Action Gate',
  action_plan:                'Action Plan',
  implementation:             'Implementation',
  validation:                 'Validation',
  risk_creation_gate:         'Risk Creation Gate',
  closure:                    'Closed',
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10',
  high:     'text-orange-400 bg-orange-400/10',
  medium:   'text-yellow-400 bg-yellow-400/10',
  low:      'text-green-400 bg-green-400/10',
  info:     'text-blue-400 bg-blue-400/10',
}

function WorkflowCard({ wf, onClick }: { wf: AuditFindingWorkflow; onClick: () => void }) {
  const isOpen   = !['closure'].includes(wf.step)
  const elapsed  = formatDistanceToNow(new Date(wf.created_at), { addSuffix: false })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="card p-4 cursor-pointer group hover:shadow-md transition-all"
    >
      {/* Severity top line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: wf.finding_severity === 'critical'
            ? 'linear-gradient(90deg,transparent,rgba(225,29,72,0.7),transparent)'
            : wf.finding_severity === 'high'
            ? 'linear-gradient(90deg,transparent,rgba(234,88,12,0.7),transparent)'
            : 'linear-gradient(90deg,transparent,rgba(14,165,233,0.5),transparent)',
        }}
      />

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-sky-400 transition-colors"
            style={{ color: 'var(--foreground)' }}>
            {wf.finding_title ?? 'Untitled Finding'}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-fg)' }}>
            {STEP_LABEL[wf.step] ?? wf.step}
          </p>
        </div>
        {wf.finding_severity && (
          <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize', SEVERITY_COLOR[wf.finding_severity])}>
            {wf.finding_severity}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--muted-fg)' }}>
        <div className="flex items-center gap-2">
          {wf.immediate_correction_required && (
            <span className="flex items-center gap-0.5 text-red-400">
              <AlertTriangle className="w-3 h-3" /> Urgent
            </span>
          )}
          {wf.risk_created_id && (
            <span className="flex items-center gap-0.5 text-orange-400">
              <ExternalLink className="w-3 h-3" /> Risk Created
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />{elapsed}
        </span>
      </div>
    </motion.div>
  )
}

export function FindingWorkflowClient() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<AuditFindingWorkflow[]>([])
  const [audits, setAudits]       = useState<Audit[]>([])
  const [findings, setFindings]   = useState<AuditFinding[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showPromote, setShowPromote] = useState(false)
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null)

  useEffect(() => {
    Promise.all([
      dbExt.getAuditFindingWorkflows(),
      db.getAudits(),
    ]).then(([wfs, auds]) => {
      setWorkflows(wfs)
      setAudits(auds)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() =>
    workflows.filter(w =>
      !search || (w.finding_title ?? '').toLowerCase().includes(search.toLowerCase())
    ), [workflows, search])

  const stats = useMemo(() => ({
    total:   workflows.length,
    open:    workflows.filter(w => !['closure'].includes(w.step)).length,
    urgent:  workflows.filter(w => w.immediate_correction_required).length,
    closed:  workflows.filter(w => w.step === 'closure').length,
  }), [workflows])

  async function handleLoadFindings(auditId: string) {
    const allFindings = await db.getFindings()
    const f = allFindings.filter(x => x.audit_id === auditId)
    setFindings(f)
  }

  async function handlePromote(finding: AuditFinding, auditId: string) {
    const audit = audits.find(a => a.id === auditId)
    const wf = await dbExt.promoteToWorkflow(
      finding.id,
      '00000000-0000-0000-0000-000000000001',
      finding.title,
      finding.severity,
      finding.recommendation
    )
    setWorkflows(prev => {
      const exists = prev.find(w => w.id === wf.id)
      return exists ? prev : [wf, ...prev]
    })
    setShowPromote(false)
    router.push(`/audit-findings-workflow/${wf.id}`)
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: stats.total,  icon: Layers,        rgb: '14,165,233' },
          { label: 'Active',          value: stats.open,   icon: Activity,      rgb: '234,88,12'  },
          { label: 'Urgent',          value: stats.urgent, icon: AlertTriangle, rgb: '225,29,72'  },
          { label: 'Closed',          value: stats.closed, icon: CheckCircle2,  rgb: '5,150,105'  },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,rgba(${s.rgb},0.7),transparent)` }} />
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `rgba(${s.rgb},0.12)` }}>
              <s.icon className="w-4 h-4" style={{ color: `rgb(${s.rgb})` }} />
            </div>
            <p className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-48"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search findings…"
            className="bg-transparent text-sm outline-none flex-1"
            style={{ color: 'var(--foreground)' }}
          />
        </div>
        <button
          onClick={() => setShowPromote(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--brand-500)' }}
        >
          <Plus className="w-4 h-4" /> Promote Finding
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48" style={{ color: 'var(--muted-fg)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <FileSearch className="w-10 h-10" style={{ color: 'var(--muted-fg)', opacity: 0.4 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted-fg)' }}>No finding workflows yet</p>
          <p className="text-xs" style={{ color: 'var(--muted-fg)', opacity: 0.6 }}>Promote an audit finding to start a workflow</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(wf => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              onClick={() => router.push(`/audit-findings-workflow/${wf.id}`)}
            />
          ))}
        </div>
      )}

      {/* Promote modal */}
      {showPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPromote(false)} />
          <div
            className="relative w-full max-w-lg rounded-2xl border shadow-2xl p-6"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Promote Audit Finding to Workflow
            </h2>

            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Select Audit</label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm mb-4 outline-none"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              onChange={e => handleLoadFindings(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Choose audit…</option>
              {audits.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>

            {findings.length > 0 && (
              <>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Select Finding</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {findings.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFinding(f)}
                      className={cn(
                        'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                        selectedFinding?.id === f.id
                          ? 'border-sky-500/40 bg-sky-500/08'
                          : 'hover:bg-white/[0.02]'
                      )}
                      style={{ borderColor: selectedFinding?.id === f.id ? 'rgba(14,165,233,0.4)' : 'var(--border)' }}
                    >
                      <span className={cn('shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize', SEVERITY_COLOR[f.severity])}>
                        {f.severity}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--foreground)' }}>{f.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowPromote(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--muted-fg)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => selectedFinding && handlePromote(selectedFinding, findings[0]?.audit_id ?? '')}
                disabled={!selectedFinding}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--brand-500)' }}
              >
                Start Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
