'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, User, Calendar, Tag, Clock, Database, RefreshCw, Send, ExternalLink } from 'lucide-react'
import type { Risk } from '@/types'
import { categoryLabel } from '@/lib/risk-categories'
import { RiskLevelBadge, RiskStatusBadge } from '@/components/shared/Badges'
import { formatDistanceToNow, format } from 'date-fns'
import { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import { toast } from 'sonner'

interface Props {
  risk: Risk
  onClose: () => void
  onUpdate?: (risk: Risk) => void
  onEdit?: (risk: Risk) => void
}

export function RiskDetailSheet({ risk, onClose, onUpdate, onEdit }: Props) {
  const [jiraConfig, setJiraConfig] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const score = risk.likelihood * risk.impact
  const scoreColor =
    score >= 16 ? '#ef4444' : score >= 9 ? '#f97316' : score >= 4 ? '#eab308' : '#22c55e'

  useEffect(() => {
    async function loadJiraData() {
      const config = await db.getJiraConfig()
      setJiraConfig(config)
      if (risk.jira_issue_key) {
        const acts = await db.getJiraActivities(risk.jira_issue_key)
        const comms = await db.getJiraComments(risk.jira_issue_key)
        setActivities(acts)
        setComments(comms)
      }
    }
    loadJiraData()
  }, [risk.jira_issue_key])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.aside
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-md h-full shadow-2xl flex flex-col"
          style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                  {risk.title}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <RiskLevelBadge level={risk.level} />
                  <RiskStatusBadge status={risk.status} />
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer">
                <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Score gauge */}
            <div className="p-4 rounded-xl text-center" style={{ background: 'var(--muted)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-fg)' }}>RISK SCORE</p>
              <p className="text-4xl font-black" style={{ color: scoreColor }}>{score}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>
                Likelihood {risk.likelihood} × Impact {risk.impact}
              </p>
              <div className="flex justify-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{risk.likelihood}</p>
                  <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Likelihood</p>
                </div>
                <div className="text-slate-300 dark:text-slate-600 text-xl self-center">×</div>
                <div className="text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{risk.impact}</p>
                  <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Impact</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-fg)' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{risk.description}</p>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Tag, label: 'Risk ID', value: risk.risk_code ?? '—' },
                { icon: Tag, label: 'Category', value: categoryLabel(risk.category) },
                { icon: User, label: 'Owner', value: risk.owner_name ?? '—' },
                { icon: Calendar, label: 'Due Date', value: risk.due_date ? format(new Date(risk.due_date), 'dd MMM yyyy') : '—' },
                { icon: Clock, label: 'Created', value: formatDistanceToNow(new Date(risk.created_at), { addSuffix: true }) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color: 'var(--muted-fg)' }} />
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>{label}</p>
                  </div>
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--foreground)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Triggers → Controls */}
            {risk.triggers && risk.triggers.length > 0 && (
              <div className="space-y-2 p-4 rounded-xl border text-xs" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>Triggers & Controls</p>
                {risk.triggers.map((t, ti) => (
                  <div key={t.id} className="pt-1.5">
                    <p className="text-[11px] font-semibold text-slate-200">⚡ {ti + 1}. {t.description || '—'}</p>
                    <div className="pl-4 mt-1 space-y-1">
                      {t.controls.length === 0 && <p className="text-[10px] text-amber-400">control yoxdur</p>}
                      {t.controls.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2">
                          <span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>• {c.description || '—'}</span>
                          {c.rating && <span className="text-[10px] font-bold text-sky-400 uppercase shrink-0">{String(c.rating).replace(/_/g, ' ')}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RCSA Profile */}
            {(risk.sub_category || risk.owner_dept || risk.owner_role || (risk.confidentiality !== undefined && risk.confidentiality > 0)) && (
              <div className="space-y-3 p-4 rounded-xl border text-xs bg-slate-900/40" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>RCSA Assessment Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  {risk.sub_category && <p style={{ color: 'var(--muted-fg)' }}>Sub-Category: <strong className="text-slate-200 capitalize">{risk.sub_category}</strong></p>}
                  {risk.owner_dept && <p style={{ color: 'var(--muted-fg)' }}>Department: <strong className="text-slate-200 capitalize">{risk.owner_dept}</strong></p>}
                  {risk.owner_role && <p style={{ color: 'var(--muted-fg)' }}>Job Role: <strong className="text-slate-200 capitalize">{risk.owner_role}</strong></p>}
                  {risk.target_residual_risk && <p style={{ color: 'var(--muted-fg)' }}>Target Risk: <strong className="text-slate-200 uppercase">{risk.target_residual_risk}</strong></p>}
                  {risk.implementation_date && <p style={{ color: 'var(--muted-fg)' }}>Impl. Date: <strong className="text-slate-200">{risk.implementation_date}</strong></p>}
                </div>

                {risk.confidentiality !== undefined && risk.confidentiality > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t grid grid-cols-3 gap-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-center p-1.5 rounded bg-black/20 border border-white/5">
                      <p className="text-[8px] text-slate-400 uppercase">Confidentiality</p>
                      <p className="font-bold text-slate-250 mt-0.5">{risk.confidentiality}/5</p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-black/20 border border-white/5">
                      <p className="text-[8px] text-slate-400 uppercase">Integrity</p>
                      <p className="font-bold text-slate-250 mt-0.5">{risk.integrity}/5</p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-black/20 border border-white/5">
                      <p className="text-[8px] text-slate-400 uppercase">Availability</p>
                      <p className="font-bold text-slate-250 mt-0.5">{risk.availability}/5</p>
                    </div>
                  </div>
                )}

                {risk.operational_impact !== undefined && risk.operational_impact > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p>Operational Impact: <strong className="text-slate-200">{risk.operational_impact}/5</strong></p>
                    <p>Financial Loss Impact: <strong className="text-slate-200">{risk.financial_impact}/5</strong></p>
                    <p>Reputation Damage: <strong className="text-slate-200">{risk.reputation_impact}/5</strong></p>
                    <p>Compliance Impact: <strong className="text-slate-200">{risk.compliance_impact}/5</strong></p>
                  </div>
                )}

                {/* Control Assessment Details */}
                {(risk.control_design_compliance !== undefined || risk.control_effectiveness) && (
                  <div className="mt-3 pt-3 border-t text-[11px] space-y-2.5" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">Control Performance Scores</p>
                    <div className="grid grid-cols-2 gap-3 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <div>
                        <p className="text-[9px] text-slate-350 font-bold uppercase">Control Design: {risk.control_design ? `${risk.control_design}/5` : '—'}</p>
                        <ul className="list-disc list-inside text-[9px] text-slate-500 mt-1 space-y-0.5">
                          <li>Compliance: {risk.control_design_compliance ?? '3'}/5</li>
                          <li>Strength: {risk.control_design_strength ?? '3'}/5</li>
                          <li>Timeliness: {risk.control_design_timeliness ?? '3'}/5</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-355 font-bold uppercase">Control Implementation: {risk.control_implementation ? `${risk.control_implementation}/5` : '—'}</p>
                        <ul className="list-disc list-inside text-[9px] text-slate-500 mt-1 space-y-0.5">
                          <li>Relevance: {risk.control_implementation_relevance ?? '3'}/5</li>
                          <li>Sustainability: {risk.control_implementation_sustainability ?? '3'}/5</li>
                          <li>Traceability: {risk.control_implementation_traceability ?? '3'}/5</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Effectiveness: <strong className="text-sky-400 capitalize">{risk.control_effectiveness ?? '—'}</strong></span>
                      <span>Target Residual: <strong className="text-sky-400 uppercase">{risk.target_residual_risk ?? 'low'}</strong></span>
                    </div>
                  </div>
                )}

                {risk.notes && (
                  <div className="mt-2 pt-2 border-t text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
                    <strong>Audit Notes:</strong> {risk.notes}
                  </div>
                )}
              </div>
            )}

            {/* Mitigation */}
            {risk.mitigation && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-fg)' }}>
                  Mitigation Actions
                </p>
                <div className="p-4 rounded-xl border-l-4 border-sky-500"
                  style={{ background: 'var(--muted)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{risk.mitigation}</p>
                </div>
              </div>
            )}

            {/* Risk Summary (rule-based) */}
            <div className="p-4 rounded-xl border"
              style={{ background: 'linear-gradient(135deg, #0c2d4e20, #0a192920)', borderColor: '#0ea5e930' }}>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <p className="text-xs font-semibold text-sky-400">Risk Summary</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                This {risk.level} severity {risk.category} risk has a composite score of {score}/25.
                {score >= 16 ? ' Immediate executive attention and remediation is required.' :
                  score >= 9 ? ' This risk requires prompt action within the next 30 days.' :
                  ' This risk should be tracked and reviewed in the next quarterly cycle.'}
                {risk.owner_name ? ` Risk owner ${risk.owner_name} is responsible for driving mitigation.` : ''}
              </p>
            </div>

            {/* Jira Integration Section */}
            {jiraConfig && jiraConfig.connected && (
              <div className="card p-4 space-y-4 border-l-4 border-indigo-600 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-500" />
                    <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider">Jira Sync Engine</p>
                  </div>
                  {risk.jira_issue_key && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono font-bold border border-sky-500/10">
                      {risk.jira_issue_key}
                    </span>
                  )}
                </div>

                {risk.jira_issue_key ? (
                  <div className="space-y-4">
                    {/* Status & Last Sync */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Jira Issue Status</p>
                        <select
                          value={risk.jira_issue_status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            await db.syncJiraIssueStatus(risk.jira_issue_key!, newStatus)
                            const updatedRisks = await db.getRisks()
                            const updatedRisk = updatedRisks.find(r => r.id === risk.id)
                            if (updatedRisk && onUpdate) {
                              onUpdate(updatedRisk)
                              toast.success(`Jira issue status updated to: ${newStatus}`)
                              // Reload activities
                              const acts = await db.getJiraActivities(risk.jira_issue_key!)
                              setActivities(acts)
                            }
                          }}
                          className="mt-1 w-full px-2 py-1.5 rounded bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-slate-800 outline-none font-semibold cursor-pointer text-xs"
                          style={{ color: 'var(--foreground)' }}
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Last Synced</p>
                        <p className="mt-1.5 font-medium text-slate-600 dark:text-slate-300">
                          {risk.jira_last_sync ? formatDistanceToNow(new Date(risk.jira_last_sync), { addSuffix: true }) : 'Never'}
                        </p>
                      </div>
                    </div>

                    {/* Sync details */}
                    <div className="flex items-center justify-between pt-1 border-t border-b py-2" style={{ borderColor: 'var(--border)' }}>
                      <a
                        href={`https://${jiraConfig.instanceUrl}/browse/${risk.jira_issue_key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-sky-500 hover:text-sky-500 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in Jira
                      </a>
                      <button
                        onClick={async () => {
                          setSyncing(true)
                          await new Promise(r => setTimeout(r, 1200))
                          const updated = await db.syncRiskToJira(risk.id)
                          if (onUpdate) onUpdate(updated)
                          setSyncing(false)
                          toast.success('Bidirectional sync completed!')
                        }}
                        disabled={syncing}
                        className="text-[10px] text-sky-500 hover:text-sky-500 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                        Sync Now
                      </button>
                    </div>

                    {/* Jira Comments */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Synced Comments</p>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {comments.map((c) => (
                          <div key={c.id} className="p-2 rounded bg-black/5 dark:bg-white/5 text-[11px] border" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                              <span>{c.author}</span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : 'Just now'}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-normal">{c.content}</p>
                          </div>
                        ))}
                      </div>

                      {/* Add comment */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          if (!newComment.trim()) return
                          setSubmittingComment(true)
                          try {
                            const user = 'Ali Hasanov'
                            const savedComment = await db.addJiraComment(risk.jira_issue_key!, newComment, user)
                            setComments(prev => [...prev, savedComment])
                            setNewComment('')
                            toast.success('Comment synced to Jira ticket.')
                          } catch (err) {
                            toast.error('Failed to post comment')
                          } finally {
                            setSubmittingComment(false)
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Add comment to Jira..."
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !newComment.trim()}
                          className="px-2.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>

                    {/* Jira Activity Logs */}
                    <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Sync Audit Trail</p>
                      <div className="space-y-1.5">
                        {activities.slice(0, 3).map((act) => (
                          <div key={act.id} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>
                              <strong>{act.actor}</strong> {act.action} • {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-center py-2">
                    <p className="text-xs text-slate-500 font-medium">This risk is not yet tracked in Jira.</p>
                    <button
                      onClick={async () => {
                        setSyncing(true)
                        await new Promise(r => setTimeout(r, 1200))
                        const updated = await db.syncRiskToJira(risk.id)
                        if (onUpdate) onUpdate(updated)
                        setSyncing(false)
                        toast.success(`Ticket ${updated.jira_issue_key} successfully created in Jira!`)
                      }}
                      disabled={syncing}
                      className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer mx-auto transition-colors disabled:opacity-50"
                    >
                      <Database className="w-3.5 h-3.5" />
                      Create Jira Ticket
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => onEdit?.(risk)}
              className="flex-1 py-2 rounded-xl text-sm font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Edit Risk
            </button>
            <button
              onClick={async () => {
                const updated = { ...risk, status: 'done' as any }
                const saved = await db.saveRisk(updated)
                if (onUpdate) onUpdate(saved)
                toast.success('Risk status updated to Done')
              }}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-colors cursor-pointer"
            >
              Mark Mitigated
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}


