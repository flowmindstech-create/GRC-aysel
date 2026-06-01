'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, User, Calendar, Tag, BarChart2, Shield, Clock, Database, RefreshCw, Send, ExternalLink } from 'lucide-react'
import type { Risk } from '@/types'
import { RiskLevelBadge, RiskStatusBadge } from '@/components/shared/Badges'
import { formatDistanceToNow, format } from 'date-fns'
import { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import { toast } from 'sonner'

interface Props {
  risk: Risk
  onClose: () => void
  onUpdate?: (updated: Risk) => void
}

export function RiskDetailSheet({ risk, onClose, onUpdate }: Props) {
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

            {/* Workflow Step Progress */}
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>Workflow Progress</p>
                <a
                  href="/workflows"
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer"
                >
                  Open in Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg" style={{ background: 'var(--muted)' }}>
                <div>
                  <p className="font-bold capitalize" style={{ color: 'var(--foreground)' }}>
                    {risk.workflow_step ? risk.workflow_step.replace(/_/g, ' ') : 'Registered'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                    {risk.status === 'closed' ? 'Risk completed' : 'Risk is active'}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-900/10 text-indigo-400 border border-indigo-500/10">
                  {risk.status.toUpperCase()}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((([
                        'identified', 'registered', 'assessed_inherent', 'control_mapped', 
                        'control_assessed', 'assessed_residual', 'owner_review', 'mgt_review', 
                        'treatment_plan', 'action_plan', 'implementation', 'validation', 
                        'residual_reassessment', 'accepted', 'escalated', 'closed'
                      ].indexOf(risk.workflow_step || 'registered') + 1) / 16) * 100)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>Start</span>
                  <span>
                    Step {[
                      'identified', 'registered', 'assessed_inherent', 'control_mapped', 
                      'control_assessed', 'assessed_residual', 'owner_review', 'mgt_review', 
                      'treatment_plan', 'action_plan', 'implementation', 'validation', 
                      'residual_reassessment', 'accepted', 'escalated', 'closed'
                    ].indexOf(risk.workflow_step || 'registered') + 1} / 16
                  </span>
                  <span>End</span>
                </div>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Tag, label: 'Category', value: risk.category },
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

            {/* Mitigation */}
            {risk.mitigation && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-fg)' }}>
                  Mitigation Actions
                </p>
                <div className="p-4 rounded-xl border-l-4 border-indigo-500"
                  style={{ background: 'var(--muted)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{risk.mitigation}</p>
                </div>
              </div>
            )}

            {/* AI Summary */}
            <div className="p-4 rounded-xl border"
              style={{ background: 'linear-gradient(135deg, #312e8120, #1e1b4b20)', borderColor: '#6366f130' }}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <p className="text-xs font-semibold text-indigo-400">AI Risk Summary</p>
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
                    <Database className="w-4 h-4 text-indigo-500" />
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Jira Sync Engine</p>
                  </div>
                  {risk.jira_issue_key && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-mono font-bold border border-indigo-500/10">
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
                        className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer"
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
                        className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
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
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer mx-auto transition-colors disabled:opacity-50"
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
            <button className="flex-1 py-2 rounded-xl text-sm font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Edit Risk
            </button>
            <button className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer">
              Mark Mitigated
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}

