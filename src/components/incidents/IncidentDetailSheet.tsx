'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, AlertTriangle, Clock, User, CheckCircle2, Circle, Database,
  RefreshCw, Send, ExternalLink, FileText, Calendar, DollarSign,
  Layers, CheckSquare, MessageSquare, Clipboard, Search, Check
} from 'lucide-react'
import type { Incident, IncidentPriority, UserProfile } from '@/types'
import { RiskLevelBadge, IncidentStatusBadge } from '@/components/shared/Badges'
import { PRIORITY_CONFIG } from './IncidentIntakeForm'
import { format, formatDistanceToNow } from 'date-fns'
import { db, getCurrentProfile } from '@/lib/db'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Priority → SLA resolution window (business days). Critical is tightest.
const SLA_DAYS: Record<IncidentPriority, number> = {
  P1_critical: 3, P2_high: 5, P3_medium: 7, P4_low: 10, P5_minimal: 14,
}

interface Props {
  incident: Incident
  onClose: () => void
  onUpdate?: (updated: Incident) => void
  onEdit?: (incident: Incident) => void
}

export function IncidentDetailSheet({ incident, onClose, onUpdate, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState<'intake' | 'investigation' | 'resolution'>('intake')
  const [jiraConfig, setJiraConfig] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Status updating dropdown state
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [linkedRisk, setLinkedRisk] = useState('')
  const [linkedControl, setLinkedControl] = useState('')
  const [brokenObligations, setBrokenObligations] = useState<string[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => { getCurrentProfile().then(setProfile) }, [])
  // Only the risk owner (admin / risk_manager) can change status or run SLA handover
  const isRiskOwner = profile?.role === 'admin' || profile?.role === 'risk_manager'

  useEffect(() => {
    let active = true
    ;(async () => {
      if (incident.risk_id) {
        const r = (await db.getRisks()).find(x => x.id === incident.risk_id)
        if (active && r) setLinkedRisk(`${r.risk_code ?? '—'} · ${r.title}`)
      }
      if (incident.control_id) {
        const c = (await db.getControls()).find(x => x.id === incident.control_id)
        if (active && c) setLinkedControl(`${c.control_id} · ${c.title}`)
      }
      // Broken-compliance chain: obligations reached via the linked control + the direct link
      if (incident.control_id || incident.compliance_obligation_id) {
        const [obls, maps] = await Promise.all([db.getObligations(), db.getObligationLinkMaps()])
        const ids = new Set<string>()
        if (incident.compliance_obligation_id) ids.add(incident.compliance_obligation_id)
        if (incident.control_id) {
          for (const [oid, m] of Object.entries(maps)) {
            if (m.controlIds.includes(incident.control_id)) ids.add(oid)
          }
        }
        const codes = obls.filter(o => ids.has(o.id)).map(o => `${o.obligation_code} · ${o.title}`)
        if (active) setBrokenObligations(codes)
      }
    })()
    return () => { active = false }
  }, [incident.risk_id, incident.control_id, incident.compliance_obligation_id])

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

  const handleStatusChange = async (newStatus: Incident['status']) => {
    setUpdatingStatus(true)
    try {
      const updated: Incident = {
        ...incident,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }
      if (newStatus === 'resolved' && !updated.resolved_at) {
        updated.resolved_at = new Date().toISOString()
      }
      if (newStatus === 'closed' && !updated.closed_at) {
        updated.closed_at = new Date().toISOString()
      }
      
      const saved = await db.saveIncident(updated)
      if (onUpdate) onUpdate(saved)
      toast.success(`Hadisə statusu yeniləndi: ${newStatus}`)
    } catch (err) {
      toast.error('Status yenilənərkən xəta baş verdi')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Risk team takes the incident on — starts the SLA clock based on priority
  const handleAcknowledge = async () => {
    const now = new Date()
    const days = SLA_DAYS[incident.priority ?? 'P3_medium']
    const due = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    const updated: Incident = {
      ...incident, acknowledged_at: now.toISOString(), sla_due_date: due.toISOString(),
      status: incident.status === 'open' ? 'investigating' : incident.status,
      updated_at: now.toISOString(),
    }
    const saved = await db.saveIncident(updated)
    if (onUpdate) onUpdate(saved)
    toast.success(`Üzərinə götürüldü · SLA: ${days} gün`)
  }

  const handleForward = async () => {
    const to = window.prompt('Kimə ötürülsün? (ad/struktur)')
    if (!to) return
    const updated: Incident = {
      ...incident, forwarded_at: new Date().toISOString(), forwarded_to: to, updated_at: new Date().toISOString(),
    }
    const saved = await db.saveIncident(updated)
    if (onUpdate) onUpdate(saved)
    toast.success(`Ötürüldü: ${to}`)
  }

  const pCfg = incident.priority ? PRIORITY_CONFIG[incident.priority] : null
  const slaOverdue = incident.sla_due_date && !incident.resolved_at && new Date(incident.sla_due_date) < new Date()

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg h-full shadow-2xl flex flex-col"
          style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Incident Detail</span>
                  {pCfg && (
                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider', pCfg.classes)}>
                      {pCfg.label.split('—')[1]?.trim() || pCfg.label}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                  {incident.title}
                </h2>
                <div className="flex items-center flex-wrap gap-2 pt-1">
                  <RiskLevelBadge level={incident.severity} />
                  <IncidentStatusBadge status={incident.status} />
                  <span className="text-[10px] text-slate-400 font-mono">ID: {incident.id}</span>
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

          {/* Navigation Tabs */}
          <div className="flex px-4 border-b text-xs font-semibold" style={{ borderColor: 'var(--border)', background: 'var(--muted)/10' }}>
            {(['intake', 'investigation', 'resolution'] as const).map(tab => {
              const active = activeTab === tab
              const labels = {
                intake: 'Intake (Hadisə)',
                investigation: 'Investigation (Araşdırma)',
                resolution: 'Resolution (Həll)',
              }
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-3 border-b-2 transition-all capitalize cursor-pointer relative',
                    active ? 'text-orange-500' : 'text-slate-400 hover:text-slate-300'
                  )}
                  style={{ borderBottomColor: active ? '#f97316' : 'transparent' }}
                >
                  {labels[tab]}
                </button>
              )
            })}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* 1. INTAKE TAB */}
                {activeTab === 'intake' && (
                  <>
                    {/* Description */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hadisənin İzahı (Description)</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                        {incident.description}
                      </p>
                    </div>

                    {/* Meta Fields Grid */}
                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                      <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--muted)/20' }}>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Məruzəçi (Reporter)</p>
                        <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                          {incident.reporter_name || '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{incident.reporter_email || '—'}</p>
                      </div>

                      <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--muted)/20' }}>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Şöbə (Reporter Structure)</p>
                        <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                          {incident.reporter_structure || 'Məlum deyil'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--muted)/20' }}>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Baş Vermə Tarixi</p>
                        <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--foreground)' }}>
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {incident.occurrence_datetime ? format(new Date(incident.occurrence_datetime), 'dd.MM.yyyy HH:mm') : 'Seçilməyib'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--muted)/20' }}>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aşkarlanma Tarixi</p>
                        <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--foreground)' }}>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {incident.discovery_datetime ? format(new Date(incident.discovery_datetime), 'dd.MM.yyyy HH:mm') : 'Məlum deyil'}
                        </p>
                      </div>
                    </div>

                    {/* Likelihood / Impact Details */}
                    <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--muted)/15' }}>
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority Assessment</p>
                        {incident.likelihood && incident.impact && (
                          <span className="text-xs font-bold text-orange-500">
                            Score: {incident.likelihood} × {incident.impact} = {incident.likelihood * incident.impact}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400">Likelihood (1-5)</p>
                          <p className="font-semibold mt-0.5">{incident.likelihood || 3} / 5</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Impact (1-5)</p>
                          <p className="font-semibold mt-0.5">{incident.impact || 3} / 5</p>
                        </div>
                      </div>
                    </div>

                    {/* Loss Effect */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maliyyə İtkisi Təsviri (Loss Effect)</p>
                      <div className="p-3.5 rounded-xl border space-y-2" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                          {incident.loss_effect || 'Hər hansı maliyyə itkisi qeyd olunmayıb.'}
                        </p>
                        {incident.loss_amount !== undefined && (
                          <div className="flex items-center gap-1 text-xs font-bold text-red-500 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                            <DollarSign className="w-3.5 h-3.5" />
                            İtki Məbləği: {incident.loss_amount.toLocaleString()} {incident.loss_currency || 'AZN'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attached Files */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Əlavə Edilmiş Fayllar (Attached Files)</p>
                      {!incident.attached_files || incident.attached_files.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Əlavə edilmiş fayl yoxdur.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {incident.attached_files.map(file => (
                            <div
                              key={file.id}
                              className="flex items-center gap-2 p-2.5 rounded-xl border text-xs"
                              style={{ borderColor: 'var(--border)', background: 'var(--muted)/10' }}
                            >
                              <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>{file.name}</p>
                                <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB • {file.uploaded_at ? format(new Date(file.uploaded_at), 'dd.MM.yyyy') : ''}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 2. INVESTIGATION TAB */}
                {activeTab === 'investigation' && (
                  <>
                    {/* Investigator details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Araşdırma Rəhbəri</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: 'var(--foreground)' }}>
                          {incident.investigation_lead || incident.assigned_name || 'Təyin edilməyib'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Araşdırma Müddəti</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: 'var(--foreground)' }}>
                          {incident.investigation_start ? (
                            <>
                              {format(new Date(incident.investigation_start), 'dd.MM.yyyy')}
                              {incident.investigation_end ? ` - ${format(new Date(incident.investigation_end), 'dd.MM.yyyy')}` : ' (Davam edir)'}
                            </>
                          ) : 'Başlanmayıb'}
                        </p>
                      </div>
                    </div>

                    {/* Root Cause category & details */}
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Əsas Səbəb (Root Cause)</p>
                        {incident.root_cause_category && (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/10 font-bold uppercase tracking-wider">
                            Kategoriya: {incident.root_cause_category}
                          </span>
                        )}
                      </div>
                      <div className="p-3.5 rounded-xl border text-xs leading-relaxed" style={{ borderColor: 'var(--border)' }}>
                        {incident.root_cause || 'Əsas səbəb hələ araşdırılmayıb.'}
                      </div>
                    </div>

                    {/* Investigation Notes */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Araşdırma Qeydləri (Investigation Notes)</p>
                      <div className="p-3.5 rounded-xl border text-xs leading-relaxed whitespace-pre-line" style={{ borderColor: 'var(--border)' }}>
                        {incident.investigation_notes || 'Əlavə araşdırma qeydləri daxil edilməyib.'}
                      </div>
                    </div>

                    {/* GRC linkage */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Əlaqəli Risk</p>
                        <p className="text-xs" style={{ color: linkedRisk ? 'var(--brand-500)' : 'var(--muted-fg)' }}>{linkedRisk || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Əlaqəli Control</p>
                        <p className="text-xs" style={{ color: linkedControl ? 'var(--brand-500)' : 'var(--muted-fg)' }}>{linkedControl || '—'}</p>
                      </div>
                    </div>

                    {/* Broken compliance chain */}
                    {brokenObligations.length > 0 && (
                      <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3">
                        <p className="text-[11px] font-bold text-red-400 flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Bu insident bu öhdəlikləri poza bilər
                        </p>
                        <ul className="space-y-1">
                          {brokenObligations.map(o => (
                            <li key={o} className="text-xs" style={{ color: 'var(--foreground)' }}>• {o}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Impacted Systems and Departments */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Təsirlənmiş Sistemlər</p>
                        {!incident.affected_systems || incident.affected_systems.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Qeyd olunmayıb</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {incident.affected_systems.map(sys => (
                              <span key={sys} className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-400 text-[10px] border border-slate-500/10 font-semibold font-mono">
                                {sys}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Təsirlənmiş Departamentlər</p>
                        {!incident.affected_departments || incident.affected_departments.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Qeyd olunmayıb</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {incident.affected_departments.map(dept => (
                              <span key={dept} className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[10px] border border-sky-500/10 font-semibold">
                                {dept}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 3. RESOLUTION TAB */}
                {activeTab === 'resolution' && (
                  <>
                    {/* Resolution summary */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Həll Xülasəsi (Resolution Summary)</p>
                      <div className="p-3.5 rounded-xl border text-xs leading-relaxed whitespace-pre-line" style={{ borderColor: 'var(--border)' }}>
                        {incident.resolution_summary || 'Hadisənin həlli hələ tamamlanmayıb.'}
                      </div>
                      {(incident.resolved_at || incident.closed_at) && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {incident.resolved_at && `Həll vaxtı: ${format(new Date(incident.resolved_at), 'dd.MM.yyyy HH:mm')}`}
                          {incident.closed_at && ` | Bağlanma vaxtı: ${format(new Date(incident.closed_at), 'dd.MM.yyyy HH:mm')}`}
                        </div>
                      )}
                    </div>

                    {/* Corrective Actions (CRUD items list) */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Korrektiv Tədbirlər (Corrective Actions)</p>
                      {!incident.corrective_actions || incident.corrective_actions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Heç bir korrektiv tədbir qeyd olunmayıb.</p>
                      ) : (
                        <div className="space-y-2">
                          {incident.corrective_actions.map(action => (
                            <div
                              key={action.id}
                              className="p-3 rounded-xl border text-xs space-y-1.5"
                              style={{ borderColor: 'var(--border)', background: 'var(--muted)/10' }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                                  {action.title || 'Başlıqsız tədbir'}
                                </span>
                                <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold capitalize',
                                  action.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                  action.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                                )}>
                                  {action.status === 'done' ? 'Tamamlanıb' : action.status === 'in_progress' ? 'İcrada' : 'Gözləyir'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Təyin edilib: {action.assignee || 'Unassigned'}</span>
                                {action.due_date && (
                                  <span>Müddət: {format(new Date(action.due_date), 'dd.MM.yyyy')}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lessons Learned */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alınan Dərslər (Lessons Learned)</p>
                      <div className="p-3.5 rounded-xl border text-xs leading-relaxed whitespace-pre-line" style={{ borderColor: 'var(--border)' }}>
                        {incident.lessons_learned || 'Dərslər qeyd olunmayıb.'}
                      </div>
                    </div>

                    {/* Reputation Impact */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reputasiya Təsiri</p>
                      <div className="p-3.5 rounded-xl border text-xs leading-relaxed whitespace-pre-line" style={{ borderColor: 'var(--border)' }}>
                        {incident.reputation_impact || 'Reputasiya təsiri qeyd olunmayıb.'}
                      </div>
                    </div>

                    {/* Jira Section */}
                    {jiraConfig && jiraConfig.connected && (
                      <div className="card p-4 space-y-4 border-l-4 border-orange-500 animate-fade-in mt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-orange-500" />
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Jira Escalation</p>
                          </div>
                          {incident.jira_issue_key && (
                            <span className="text-[9px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono font-bold border border-sky-500/10">
                              {incident.jira_issue_key}
                            </span>
                          )}
                        </div>

                        {incident.jira_issue_key ? (
                          <div className="space-y-4">
                            {/* Status & Last Sync */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Jira Ticket Status</p>
                                <select
                                  value={incident.jira_issue_status || 'In Progress'}
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
                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Last Synced</p>
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
                                className="text-[10px] text-sky-500 hover:text-sky-500 font-semibold flex items-center gap-1 cursor-pointer"
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
                                className="text-[10px] text-sky-500 hover:text-sky-500 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                                Sync Now
                              </button>
                            </div>

                            {/* Comments */}
                            <div className="space-y-2">
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Synced Comments</p>
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
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* SLA bar (risk owner only) */}
          {isRiskOwner && (
            <div className="px-6 pt-3 flex flex-wrap items-center gap-2">
              {incident.acknowledged_at ? (
                <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold', slaOverdue ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400')}>
                  <Clock className="w-3 h-3" />
                  {slaOverdue ? 'SLA keçib' : 'SLA'}: {incident.sla_due_date ? format(new Date(incident.sla_due_date), 'd MMM yyyy') : '—'}
                </span>
              ) : (
                <button onClick={handleAcknowledge}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors">
                  <Check className="w-3.5 h-3.5" /> Üzərimə götür (SLA başlat)
                </button>
              )}
              <button onClick={handleForward}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <Send className="w-3.5 h-3.5" /> Ötür
              </button>
              {incident.forwarded_to && (
                <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>→ {incident.forwarded_to}</span>
              )}
            </div>
          )}

          {/* Footer with Edit and Update actions */}
          <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => onEdit?.(incident)}
              className="px-5 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Hadisəni Redaktə Et
            </button>

            {/* Quick status updater — only the risk owner can change status */}
            {isRiskOwner ? (
              <div className="relative">
                <select
                  disabled={updatingStatus}
                  value={incident.status}
                  onChange={(e) => handleStatusChange(e.target.value as Incident['status'])}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20 outline-none cursor-pointer border-none"
                >
                  <option value="open" className="text-slate-800 bg-white dark:bg-slate-900">Açıq (Open)</option>
                  <option value="investigating" className="text-slate-800 bg-white dark:bg-slate-900">Araşdırılır (Investigating)</option>
                  <option value="contained" className="text-slate-800 bg-white dark:bg-slate-900">Məhdudlaşdırılıb (Contained)</option>
                  <option value="resolved" className="text-slate-800 bg-white dark:bg-slate-900">Həll edilib (Resolved)</option>
                  <option value="closed" className="text-slate-800 bg-white dark:bg-slate-900">Bağlanıb (Closed)</option>
                </select>
              </div>
            ) : (
              <span className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
                Statusu yalnız risk owner dəyişə bilər
              </span>
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}
