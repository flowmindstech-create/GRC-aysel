'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Clock, User, CheckCircle2, Circle, Database, RefreshCw, Send, ExternalLink } from 'lucide-react'
import type { Incident } from '@/types'
import { RiskLevelBadge, IncidentStatusBadge } from '@/components/shared/Badges'
import { format, formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import { toast } from 'sonner'

const TIMELINE = [
  { status: 'Reported', detail: 'Incident reported and logged in system', time: 0 },
  { status: 'Assigned', detail: 'Investigator assigned to the incident', time: 30 },
  { status: 'Investigating', detail: 'Active investigation underway', time: 120 },
  { status: 'Contained', detail: 'Threat contained, no further spread', time: null },
  { status: 'Resolved', detail: 'Root cause identified and remediated', time: null },
]

interface Props {
  incident: Incident
  onClose: () => void
  onUpdate?: (updated: Incident) => void
}

export function IncidentDetailSheet({ incident, onClose, onUpdate }: Props) {
  const [jiraConfig, setJiraConfig] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const statusOrder = ['open','investigating','contained','resolved','closed']
  const currentStep = statusOrder.indexOf(incident.status)

  useEffect(() => {
    async function loadJiraData() {
      const config = await db.getJiraConfig()
      setJiraConfig(config)
      if (incident.jira_issue_key) {
        const acts = await db.getJiraActivities(incident.jira_issue_key)
        const comms = await db.getJiraComments(incident.jira_issue_key)
        setActivities(acts)
        setComments(comms)
      }
    }
    loadJiraData()
  }, [incident.jira_issue_key])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.aside
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-md h-full shadow-2xl flex flex-col"
          style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-semibold text-orange-500">INCIDENT</span>
                </div>
                <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                  {incident.title}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <RiskLevelBadge level={incident.severity} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer">
                <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Description */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-fg)' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{incident.description}</p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>Reported By</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {incident.reporter_name?.[0]}
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{incident.reporter_name ?? '—'}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>Investigator</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {incident.assigned_name?.[0] ?? '?'}
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{incident.assigned_name ?? 'Unassigned'}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>Reported</p>
                <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {format(new Date(incident.created_at), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>
                  {incident.resolved_at ? 'Resolved' : 'Open Since'}
                </p>
                <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {incident.resolved_at
                    ? format(new Date(incident.resolved_at), 'dd MMM yyyy, HH:mm')
                    : formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--muted-fg)' }}>Incident Timeline</p>
              <div className="space-y-0">
                {TIMELINE.map((step, i) => {
                  const done = i <= currentStep
                  const current = i === currentStep
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          done ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          {done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            : <Circle className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                        {i < TIMELINE.length - 1 && (
                          <div className="w-0.5 h-8 mt-1" style={{ background: done && i < currentStep ? '#f97316' : 'var(--border)' }} />
                        )}
                      </div>
                      <div className="pb-6 flex-1">
                        <p className={`text-xs font-semibold ${done ? '' : 'opacity-40'}`}
                          style={{ color: 'var(--foreground)' }}>{step.status}</p>
                        <p className={`text-[11px] mt-0.5 ${done ? '' : 'opacity-40'}`}
                          style={{ color: 'var(--muted-fg)' }}>{step.detail}</p>
                        {current && step.time !== null && (
                          <span className="text-[10px] text-orange-500 font-medium">{step.time} min ago</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Jira Integration Section */}
            {jiraConfig && jiraConfig.connected && (
              <div className="card p-4 space-y-4 border-l-4 border-orange-500 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-orange-500" />
                    <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Jira Escalation</p>
                  </div>
                  {incident.jira_issue_key && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-mono font-bold border border-indigo-500/10">
                      {incident.jira_issue_key}
                    </span>
                  )}
                </div>

                {incident.jira_issue_key ? (
                  <div className="space-y-4">
                    {/* Status & Last Sync */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Jira Issue Status</p>
                        <select
                          value={incident.jira_issue_status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            await db.syncJiraIssueStatus(incident.jira_issue_key!, newStatus)
                            const updatedIncidents = await db.getIncidents()
                            const updatedIncident = updatedIncidents.find(i => i.id === incident.id)
                            if (updatedIncident && onUpdate) {
                              onUpdate(updatedIncident)
                              toast.success(`Jira ticket status updated to: ${newStatus}`)
                              const acts = await db.getJiraActivities(incident.jira_issue_key!)
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
                          {incident.jira_last_sync ? formatDistanceToNow(new Date(incident.jira_last_sync), { addSuffix: true }) : 'Never'}
                        </p>
                      </div>
                    </div>

                    {/* Sync actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-b py-2" style={{ borderColor: 'var(--border)' }}>
                      <a
                        href={`https://${jiraConfig.instanceUrl}/browse/${incident.jira_issue_key}`}
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
                          const updated = await db.syncIncidentToJira(incident.id)
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

                    {/* Comments */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Synced Comments</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
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

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          if (!newComment.trim()) return
                          setSubmittingComment(true)
                          try {
                            const user = 'Ali Hasanov'
                            const savedComment = await db.addJiraComment(incident.jira_issue_key!, newComment, user)
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
                          className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
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
                    <p className="text-xs text-slate-500 font-medium">This incident is not yet escalated to Jira.</p>
                    <button
                      onClick={async () => {
                        setSyncing(true)
                        await new Promise(r => setTimeout(r, 1200))
                        const updated = await db.syncIncidentToJira(incident.id)
                        if (onUpdate) onUpdate(updated)
                        setSyncing(false)
                        toast.success(`Incident escalated! Jira Ticket ${updated.jira_issue_key} has been created.`)
                      }}
                      disabled={syncing}
                      className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer mx-auto transition-colors disabled:opacity-50"
                    >
                      <Database className="w-3.5 h-3.5" />
                      Escalate to Jira
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
            <button className="flex-1 py-2 rounded-xl text-sm font-medium border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Edit</button>
            <button className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 cursor-pointer">
              Update Status
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}
