'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db, getCurrentProfile } from '@/lib/db'
import type { Incident, IncidentSeverity, IncidentStatus, JiraConfig, UserProfile } from '@/types'
import { RiskLevelBadge, IncidentStatusBadge } from '@/components/shared/Badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { IncidentFormDialog } from './IncidentFormDialog'
import { IncidentDetailSheet } from './IncidentDetailSheet'
import { PRIORITY_CONFIG } from './IncidentIntakeForm'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, AlertTriangle, Building2, Landmark, Table2, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

const severities: (IncidentSeverity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'minimal']

const WORKFLOW_LABELS: Record<string, string> = { intake: 'Intake', investigation: 'Investigation', resolution: 'Resolution' }

export function IncidentTable() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<IncidentSeverity | 'all'>('all')
  const [status, setStatus] = useState<IncidentStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editIncident, setEditIncident] = useState<Incident | null>(null)
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [jiraConfig, setJiraConfig] = useState<JiraConfig | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [viewMode, setViewMode] = useState<'register' | 'cards'>('register')

  useEffect(() => {
    async function load() {
      const data = await db.getIncidents()
      setIncidents(data)
      const config = await db.getJiraConfig()
      setJiraConfig(config)
      setProfile(await getCurrentProfile())
    }
    load()
  }, [])

  // 3-tier RBAC: managers (admin/risk_manager) see all; everyone else sees only
  // incidents they reported or are assigned to (RLS enforces this server-side too).
  const isManager = profile?.role === 'admin' || profile?.role === 'risk_manager'
  const myId = profile?.id

  const filtered = incidents.filter(i => {
    const matchS = i.title.toLowerCase().includes(search.toLowerCase())
    const matchSev = severity === 'all' || i.severity === severity
    const matchSt = status === 'all' || i.status === status
    const matchTier = isManager || i.reported_by === myId || i.assigned_to === myId || i.resolution_assignee === myId
    return matchS && matchSev && matchSt && matchTier
  })

  const handleDelete = async (id: string) => {
    await db.deleteIncident(id)
    setIncidents(p => p.filter(i => i.id !== id))
    setMenuOpen(null)
  }

  const handleSave = async (inc: Incident) => {
    const saved = await db.saveIncident(inc)
    setIncidents(p => {
      const idx = p.findIndex(i => i.id === saved.id)
      if (idx >= 0) { const n = [...p]; n[idx] = saved; return n }
      return [saved, ...p]
    })
    setShowForm(false); setEditIncident(null)
  }

  return (
    <div>
      <PageHeader
        title="Incident Management"
        subtitle={`${filtered.length} incidents`}
        actions={
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20 cursor-pointer">
            <Plus className="w-4 h-4" /> Report Incident
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search incidents…" className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--foreground)' }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {severities.map(s => (
            <button key={s} onClick={() => setSeverity(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer', {
                'bg-orange-600 text-white': severity === s,
                'hover:bg-black/5 dark:hover:bg-white/5': severity !== s,
              })}
              style={{ color: severity === s ? 'white' : 'var(--muted-fg)' }}>{s}</button>
          ))}
        </div>
        <select value={status} onChange={e => setStatus(e.target.value as IncidentStatus | 'all')}
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          {['all','open','investigating','contained','resolved','closed'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace('_',' ')}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <button onClick={() => setViewMode('register')} aria-label="Register view"
            className="px-2.5 py-1.5 rounded-lg transition-all" style={viewMode === 'register' ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
            <Table2 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('cards')} aria-label="Cards view"
            className="px-2.5 py-1.5 rounded-lg transition-all" style={viewMode === 'cards' ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Register (table) view */}
      {viewMode === 'register' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                  {['Incident', 'Stage', 'Severity', 'Priority', 'Resp. Structure', 'Assigned', 'Status', 'Loss', 'Residual', 'Created', ''].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>No incidents found</td></tr>
                ) : filtered.map((inc, i) => {
                  const pCfg = inc.priority ? PRIORITY_CONFIG[inc.priority] : null
                  const isNearBottom = filtered.length > 2 && i >= filtered.length - 2
                  return (
                    <tr key={inc.id} onClick={() => setDetailIncident(inc)}
                      className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-3 py-3.5 max-w-xs">
                        <p className="text-sm font-medium truncate group-hover:text-sky-500 transition-colors" style={{ color: 'var(--foreground)' }}>{inc.title}</p>
                        {inc.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-fg)' }}>{inc.description.slice(0, 60)}{inc.description.length > 60 ? '…' : ''}</p>}
                      </td>
                      <td className="px-3 py-3.5"><span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 uppercase tracking-wider whitespace-nowrap">{WORKFLOW_LABELS[inc.workflow_stage || 'intake']}</span></td>
                      <td className="px-3 py-3.5"><RiskLevelBadge level={inc.severity} /></td>
                      <td className="px-3 py-3.5">{pCfg ? <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider whitespace-nowrap', pCfg.classes)}>{pCfg.label.split('—')[1]?.trim() || pCfg.label}</span> : <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>}</td>
                      <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: inc.reporter_structure ? 'var(--foreground)' : 'var(--muted-fg)' }}>{inc.reporter_structure || '—'}</span></td>
                      <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: inc.assigned_name ? 'var(--foreground)' : 'var(--muted-fg)' }}>{inc.assigned_name || '—'}</span></td>
                      <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}><IncidentStatusBadge status={inc.status} /></td>
                      <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: inc.loss_amount !== undefined ? 'var(--foreground)' : 'var(--muted-fg)' }}>{inc.loss_amount !== undefined ? `${inc.loss_amount.toLocaleString()} ${inc.loss_currency || 'AZN'}` : '—'}</span></td>
                      <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap capitalize" style={{ color: inc.incident_residual_level ? 'var(--foreground)' : 'var(--muted-fg)' }}>{inc.incident_residual_level || '—'}</span></td>
                      <td className="px-3 py-3.5"><span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{formatDistanceToNow(new Date(inc.created_at), { addSuffix: true })}</span></td>
                      <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button onClick={() => setMenuOpen(menuOpen === inc.id ? null : inc.id)} aria-label="Incident actions"
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer">
                            <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                          </button>
                          {menuOpen === inc.id && (
                            <div className={cn('absolute right-0 w-36 rounded-xl shadow-xl z-20 border py-1', isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1')} style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                              <button onClick={() => { setDetailIncident(inc); setMenuOpen(null) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" style={{ color: 'var(--foreground)' }}><Eye className="w-3.5 h-3.5" /> View</button>
                              {(isManager || inc.assigned_to === myId || inc.resolution_assignee === myId) && (
                                <button onClick={() => { setEditIncident(inc); setShowForm(true); setMenuOpen(null) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" style={{ color: 'var(--foreground)' }}><Edit className="w-3.5 h-3.5" /> Edit</button>
                              )}
                              {isManager && (
                                <button onClick={() => handleDelete(inc.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards grid */}
      {viewMode === 'cards' && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((inc, i) => {
            const pCfg = inc.priority ? PRIORITY_CONFIG[inc.priority] : null
            const workflowLabels = {
              intake: 'Intake',
              investigation: 'Investigation',
              resolution: 'Resolution',
            }

            return (
              <motion.div
                key={inc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="card p-5 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setDetailIncident(inc)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', {
                    'bg-red-500/10': inc.severity === 'critical',
                    'bg-orange-500/10': inc.severity === 'high',
                    'bg-yellow-500/10': inc.severity === 'medium',
                    'bg-green-500/10': inc.severity === 'low',
                    'bg-slate-500/10': inc.severity === 'minimal',
                  })}>
                    <AlertTriangle className={cn('w-4 h-4', {
                      'text-red-500': inc.severity === 'critical',
                      'text-orange-500': inc.severity === 'high',
                      'text-yellow-500': inc.severity === 'medium',
                      'text-green-500': inc.severity === 'low',
                      'text-slate-400': inc.severity === 'minimal',
                    })} />
                  </div>
                  
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <IncidentStatusBadge status={inc.status} />
                    
                    {jiraConfig && jiraConfig.connected && inc.jira_issue_key && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono font-bold border border-sky-500/10" title={`Jira: ${inc.jira_issue_status}`}>
                        {inc.jira_issue_key}
                      </span>
                    )}
                    
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === inc.id ? null : inc.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer">
                        <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                      </button>
                      {menuOpen === inc.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl z-20 border py-1"
                          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                          <button onClick={() => { setDetailIncident(inc); setMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                            style={{ color: 'var(--foreground)' }}>
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </button>
                          {(isManager || inc.assigned_to === myId || inc.resolution_assignee === myId) && (
                            <button onClick={() => { setEditIncident(inc); setShowForm(true); setMenuOpen(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                              style={{ color: 'var(--foreground)' }}>
                              <Edit className="w-3.5 h-3.5" /> Edit Incident
                            </button>
                          )}
                          {isManager && (
                            <button onClick={() => handleDelete(inc.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold leading-snug mb-1 group-hover:text-sky-500 transition-colors"
                  style={{ color: 'var(--foreground)' }}>{inc.title}</h3>
                <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--muted-fg)' }}>
                  {inc.description}
                </p>

                {/* Workflow Stage & Department details */}
                <div className="flex flex-wrap gap-2 mb-3.5 text-[10px] font-semibold">
                  <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/10 uppercase tracking-wider">
                    Stage: {workflowLabels[inc.workflow_stage || 'intake']}
                  </span>
                  
                  {inc.reporter_structure && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/10">
                      <Building2 className="w-2.5 h-2.5" />
                      {inc.reporter_structure}
                    </span>
                  )}
                  
                  {inc.loss_amount !== undefined && (
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/10 font-bold">
                      <Landmark className="w-2.5 h-2.5" />
                      {inc.loss_amount.toLocaleString()} {inc.loss_currency || 'AZN'} Loss
                    </span>
                  )}
                </div>

                {/* Severity and priority badges */}
                <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                  <div className="flex items-center gap-1.5">
                    <RiskLevelBadge level={inc.severity} />
                    {pCfg && (
                      <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider', pCfg.classes)}>
                        {pCfg.label.split('—')[1]?.trim() || pCfg.label}
                      </span>
                    )}
                  </div>
                  <span>{formatDistanceToNow(new Date(inc.created_at), { addSuffix: true })}</span>
                </div>

                {inc.assigned_name && (
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold">
                      {inc.assigned_name[0]}
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                      Assigned to {inc.assigned_name}
                    </span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      )}

      {showForm && (
        <IncidentFormDialog incident={editIncident} onClose={() => { setShowForm(false); setEditIncident(null) }} onSave={handleSave} />
      )}
      {detailIncident && (
        <IncidentDetailSheet
          incident={detailIncident}
          onClose={() => setDetailIncident(null)}
          onUpdate={(updated) => {
            setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i))
            setDetailIncident(updated)
          }}
          onEdit={(inc) => {
            setEditIncident(inc)
            setShowForm(true)
            setDetailIncident(null)
          }}
        />
      )}
    </div>
  )
}
