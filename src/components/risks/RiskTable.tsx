'use client'

import { useState, useEffect, Fragment } from 'react'
import { motion } from 'framer-motion'
import { db, getCurrentProfile } from '@/lib/db'
import type { Risk, RiskLevel, UserProfile } from '@/types'
import { RISK_CATEGORIES, RISK_CATEGORY_VALUES, CATEGORY_LABELS, type RiskCategory } from '@/lib/risk-categories'
import { RISK_STATUSES, STATUS_CLASSES, RISK_STATUS_VALUES, STATUS_LABELS, normalizeStatus, type RiskStatus } from '@/lib/risk-status'
import { residualLevelWord, CONTROL_RATING_INFO } from '@/lib/rcsa-methodology'
import { TREATMENT_STRATEGY_LABELS, type TreatmentStrategy, type ControlRating } from '@/lib/rcsa'
import { RiskLevelBadge } from '@/components/shared/Badges'
import { Avatar } from '@/components/shared/Avatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, ChevronDown, Wrench, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RiskFormDialog } from './RiskFormDialog'
import { RiskDetailSheet } from './RiskDetailSheet'
import { toast } from 'sonner'
import { ExportMenu } from '@/components/shared/ExportMenu'
import type { ExportColumn } from '@/lib/export'
import { usePermissions } from '@/hooks/usePermissions'
import { atLeast } from '@/lib/permissions'

const RISK_EXPORT_COLUMNS: ExportColumn<Risk>[] = [
  { key: 'risk_code', label: 'Risk ID', value: r => r.risk_code ?? r.id },
  { key: 'title', label: 'Risk', value: r => r.title },
  { key: 'category', label: 'Kateqoriya', value: r => CATEGORY_LABELS[r.category as RiskCategory] ?? r.category },
  { key: 'status', label: 'Status', value: r => STATUS_LABELS[r.status] ?? r.status },
  { key: 'level', label: 'Inherent', value: r => r.level },
  { key: 'residual_level', label: 'Residual', value: r => r.residual_level ?? '' },
  { key: 'treatment_plan', label: 'Treatment', value: r => r.treatment_plan ?? '' },
  { key: 'due_date', label: 'Due', value: r => r.due_date ? new Date(r.due_date).toLocaleDateString('az-AZ') : '' },
  { key: 'owner_dept', label: 'Owner structure', value: r => r.owner_dept ?? '' },
  { key: 'owner_name', label: 'Owner', value: r => r.owner_name ?? '' },
]

const LEVELS: (RiskLevel | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'minimal']
const CATEGORIES: (RiskCategory | 'all')[] = ['all', ...RISK_CATEGORY_VALUES]
const STATUSES: (RiskStatus | 'all')[] = ['all', ...RISK_STATUS_VALUES]

export function RiskTable() {
  const { can, isSuperAdmin } = usePermissions()
  const [risks, setRisks] = useState<Risk[]>([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<RiskLevel | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<RiskStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editRisk, setEditRisk] = useState<Risk | null>(null)
  const [detailRisk, setDetailRisk] = useState<Risk | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [openStatusRiskId, setOpenStatusRiskId] = useState<string | null>(null)
  const [jiraConfig, setJiraConfig] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const handleOutsideClick = () => {
      setMenuOpen(null)
      setOpenStatusRiskId(null)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  useEffect(() => {
    async function load() {
      const data = await db.getRisks()
      setRisks(data)
      const config = await db.getJiraConfig()
      setJiraConfig(config)
      setProfile(await getCurrentProfile())
    }
    load()
  }, [])

  // Risk team (auditor+) hamısını görür; adi əməkdaş isə sahibi olduğu
  // VƏ YA ÖZÜNÜN YARATDIĞI riskləri görür (created_by — phase49).
  const isManager = atLeast(profile, 'auditor')
  const myId = profile?.id
  const myName = profile?.full_name

  const filtered = risks.filter(r => {
    const matchTier = isManager
      || r.owner_id === myId
      || r.created_by === myId
      || (!!myName && (r.owner_name === myName || r.created_by_name === myName))
    const matchSearch = (r.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchLevel = levelFilter === 'all' || r.level === levelFilter
    const matchCat = categoryFilter === 'all' || r.category === categoryFilter
    const matchStatus = statusFilter === 'all' || normalizeStatus(r.status) === statusFilter
    return matchTier && matchSearch && matchLevel && matchCat && matchStatus
  })

  // Group by category (registry view): RISK_CATEGORIES order, newest/updated on top
  const grouped = RISK_CATEGORIES
    .map(cat => ({
      cat,
      items: filtered
        .filter(r => r.category === cat.value)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    }))
    .filter(g => g.items.length > 0)

  const handleDelete = async (id: string) => {
    await db.deleteRisk(id)
    setRisks(prev => prev.filter(r => r.id !== id))
    setMenuOpen(null)
  }

  const handleSave = async (risk: Risk) => {
    const saved = await db.saveRisk(risk)
    setRisks(prev => {
      const idx = prev.findIndex(r => r.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next
      }
      return [saved, ...prev]
    })
    setShowForm(false)
    setEditRisk(null)
  }


  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Risk Register"
        subtitle={`${filtered.length} of ${risks.length} risks`}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" /> New Risk
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search risks…"
            aria-label="Search risks"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--foreground)' }}
          />
        </div>

        {/* Level filter */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {LEVELS.map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all', {
                'bg-sky-500 text-white shadow': levelFilter === l,
                'hover:bg-black/5 dark:hover:bg-white/5': levelFilter !== l,
              })}
              style={{ color: levelFilter === l ? 'white' : 'var(--muted-fg)' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as RiskStatus | 'all')}
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : STATUS_LABELS[s]}</option>)}
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as RiskCategory | 'all')}
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : CATEGORY_LABELS[c]}</option>)}
        </select>

        <ExportMenu columns={RISK_EXPORT_COLUMNS} rows={filtered} filename="risk-register" title="Risk Register" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Risk ID', 'Risk', 'Category', 'Status', 'Jira Issue', 'Treatment', 'Mitigation plan', 'Due', 'Inherent', 'Residual', 'Control activities', 'Degree', 'Owner structure', 'Owner', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: 'var(--muted-fg)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .map((risk, i) => {
                  const absoluteIndex = i
                  const isNearBottom = filtered.length > 2 && absoluteIndex >= filtered.length - 2
                  return (
                    <motion.tr
                      key={risk.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onClick={() => setDetailRisk(risk)}
                    >
                      <td className="px-3 py-3.5">
                        <span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                          {risk.risk_code ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 max-w-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-sky-500 transition-colors"
                            style={{ color: 'var(--foreground)' }}>
                            {risk.title}
                          </p>
                          {risk.approval_status === 'pending' && (
                            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/25">
                              Gözləmədə
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-fg)' }}>
                          {risk.description.slice(0, 50)}…
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs font-semibold capitalize" style={{ color: 'var(--foreground)' }}>
                          {CATEGORY_LABELS[risk.category] ?? risk.category}
                        </span>
                      </td>
                      <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block">
                          {/* Status axını risk komandasının işidir (risk_manager+);
                              adi əməkdaş üçün statik nişan — dəyişə bilməz */}
                          {can('edit') ? (
                          <button
                            onClick={() => setOpenStatusRiskId(openStatusRiskId === risk.id ? null : risk.id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-transparent cursor-pointer transition-all hover:brightness-110 shadow-sm outline-none',
                              STATUS_CLASSES[normalizeStatus(risk.status)]
                            )}
                          >
                            <span>{STATUS_LABELS[normalizeStatus(risk.status)] ?? risk.status}</span>
                            <ChevronDown className="w-3 h-3 shrink-0 opacity-80" />
                          </button>
                          ) : (
                          <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-transparent shadow-sm',
                            STATUS_CLASSES[normalizeStatus(risk.status)])}>
                            {STATUS_LABELS[normalizeStatus(risk.status)] ?? risk.status}
                          </span>
                          )}
                          {openStatusRiskId === risk.id && can('edit') && (
                            <div
                              className="absolute left-0 mt-1.5 w-40 rounded-xl shadow-2xl z-50 border py-1 animate-in fade-in slide-in-from-top-1 duration-150"
                              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                            >
                              {RISK_STATUSES.map(s => (
                                <button
                                  key={s.value}
                                  onClick={async () => {
                                    const updated = { ...risk, status: s.value as any }
                                    await handleSave(updated)
                                    setOpenStatusRiskId(null)
                                    toast.success('Status updated successfully')
                                  }}
                                  className={cn(
                                    "w-full flex items-center px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors font-semibold",
                                    risk.status === s.value ? "text-sky-500" : "text-[var(--foreground)]"
                                  )}
                                  style={{ color: risk.status === s.value ? '#38bdf8' : 'var(--foreground)' }}
                                >
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full mr-2 shrink-0",
                                    s.value === 'open' ? 'bg-red-500' :
                                    s.value === 'backlog' ? 'bg-slate-400' :
                                    s.value === 'in_progress' ? 'bg-blue-500' :
                                    s.value === 'review' ? 'bg-amber-500' :
                                    s.value === 'done' ? 'bg-green-500' :
                                    'bg-emerald-400'
                                  )} />
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {risk.jira_issue_key ? (
                          <a
                            href={jiraConfig?.connected ? `https://${jiraConfig.instanceUrl}/browse/${risk.jira_issue_key}` : '#'}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-455 text-indigo-400 hover:text-indigo-300 font-mono font-bold border border-indigo-500/10 text-[10px]"
                          >
                            {risk.jira_issue_key}
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs capitalize" style={{ color: 'var(--muted-fg)' }}>
                          {risk.mitigation ? TREATMENT_STRATEGY_LABELS[risk.mitigation as TreatmentStrategy] ?? risk.mitigation : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        {risk.mitigation === 'mitigate' ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditRisk(risk); setShowForm(true) }}
                            title={risk.treatment_plan || 'Mitigasiya planını idarə et'}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors max-w-[170px]"
                            style={{ background: 'rgba(14,165,233,0.12)', color: 'var(--brand-500)', border: '1px solid rgba(14,165,233,0.25)' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.2)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.12)')}
                          >
                            <Wrench className="w-3 h-3 shrink-0" />
                            <span className="truncate">{risk.treatment_plan ? risk.treatment_plan : 'Mitigation planı'}</span>
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>
                          {risk.due_date ? formatDistanceToNow(new Date(risk.due_date), { addSuffix: true }) : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <RiskLevelBadge level={risk.level} />
                      </td>
                      <td className="px-3 py-3.5">
                        {risk.residual_level
                          ? <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{residualLevelWord(risk.residual_level)}</span>
                          : <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>}
                      </td>
                      <td className="px-3 py-3.5">
                        {(() => {
                          const n = (risk.triggers ?? []).reduce((s, t) => s + (t.controls?.length ?? 0), 0)
                          return <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>{n > 0 ? `${n} control` : '—'}</span>
                        })()}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                          {risk.control_effectiveness ? (CONTROL_RATING_INFO[risk.control_effectiveness as ControlRating]?.label ?? String(risk.control_effectiveness).replace(/_/g, ' ')) : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>{risk.owner_dept ?? '—'}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={risk.owner_name ?? '?'} size={24} />
                          <span className="text-xs whitespace-nowrap font-medium" style={{ color: 'var(--foreground)' }}>
                            {risk.owner_name ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button
                            onClick={() => setMenuOpen(menuOpen === risk.id ? null : risk.id)}
                            aria-label="Risk actions"
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                          </button>
                          {menuOpen === risk.id && (
                            <div className={cn(
                              "absolute right-0 w-40 rounded-xl shadow-xl z-50 border py-1",
                              isNearBottom ? "bottom-full mb-1" : "top-full mt-1"
                            )}
                              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                              <button onClick={() => { setDetailRisk(risk); setMenuOpen(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left"
                                style={{ color: 'var(--foreground)' }}>
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              {isSuperAdmin && (
                              <button onClick={() => { setEditRisk(risk); setShowForm(true); setMenuOpen(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left"
                                style={{ color: 'var(--foreground)' }}>
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                              )}
                              {risk.approval_status === 'pending' && can('approve') && (
                              <button onClick={async () => {
                                  await handleSave({ ...risk, approval_status: 'approved' })
                                  setMenuOpen(null)
                                  toast.success(`Risk təsdiqləndi: ${risk.title}`)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left text-emerald-600 font-semibold">
                                <Check className="w-3.5 h-3.5" /> Təsdiq et
                              </button>
                              )}
                              {can('delete') && (
                              <button onClick={() => handleDelete(risk.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-500">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
              <p className="text-sm">No risks match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showForm && (
        <RiskFormDialog
          key={editRisk?.id ?? 'new'}
          risk={editRisk}
          onClose={() => { setShowForm(false); setEditRisk(null) }}
          onSave={handleSave}
        />
      )}
      {detailRisk && (
        <RiskDetailSheet
          risk={detailRisk}
          onClose={() => setDetailRisk(null)}
          onUpdate={(updated) => {
            setRisks(prev => prev.map(r => r.id === updated.id ? updated : r))
            setDetailRisk(updated)
          }}
          onEdit={(risk) => {
            setEditRisk(risk)
            setShowForm(true)
            setDetailRisk(null)
          }}
        />
      )}
    </div>
  )
}

