'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MOCK_RISKS } from '@/lib/seed-data'
import { db } from '@/lib/db'
import type { Risk, RiskLevel, RiskStatus, JiraConfig } from '@/types'
import { RISK_CATEGORY_VALUES, CATEGORY_LABELS, categoryLabel, type RiskCategory } from '@/lib/risk-categories'
import { RiskLevelBadge, RiskStatusBadge } from '@/components/shared/Badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus, Search, Filter, MoreHorizontal, Edit,
  Trash2, Eye, Zap, Clock, User, ChevronDown, Database, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { RiskFormDialog } from './RiskFormDialog'
import { RiskDetailSheet } from './RiskDetailSheet'

const LEVELS: (RiskLevel | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'minimal']
const CATEGORIES: (RiskCategory | 'all')[] = ['all', ...RISK_CATEGORY_VALUES]
const STATUSES: (RiskStatus | 'all')[] = ['all', 'open', 'in_progress', 'mitigated', 'accepted', 'closed']

export function RiskTable() {
  const [risks, setRisks] = useState<Risk[]>([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<RiskLevel | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<RiskStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editRisk, setEditRisk] = useState<Risk | null>(null)
  const [detailRisk, setDetailRisk] = useState<Risk | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [jiraConfig, setJiraConfig] = useState<JiraConfig | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await db.getRisks()
      setRisks(data)
      const config = await db.getJiraConfig()
      setJiraConfig(config)
    }
    load()
  }, [])


  const filtered = risks.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    const matchLevel = levelFilter === 'all' || r.level === levelFilter
    const matchCat = categoryFilter === 'all' || r.category === categoryFilter
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchLevel && matchCat && matchStatus
  })

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
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--foreground)' }}
          />
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
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
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace('_', ' ')}</option>)}
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
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Risk', 'Category', 'Level', 'Status', 'Jira Issue', 'Owner', 'Due Date', 'Score', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--muted-fg)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((risk, i) => (
                  <motion.tr
                    key={risk.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onClick={() => setDetailRisk(risk)}
                  >
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="text-sm font-medium truncate group-hover:text-sky-500 transition-colors"
                        style={{ color: 'var(--foreground)' }}>
                        {risk.title}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-fg)' }}>
                        {risk.description.slice(0, 60)}…
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
                        {categoryLabel(risk.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <RiskStatusBadge status={risk.status} />
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      {jiraConfig && jiraConfig.connected ? (
                        risk.jira_issue_key ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono font-bold border border-sky-500/10" title="Open in Jira">
                              {risk.jira_issue_key}
                            </span>
                            <span className="text-[10px] font-semibold uppercase px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {risk.jira_issue_status}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                setSyncingId(risk.id)
                                await new Promise(r => setTimeout(r, 1200))
                                const updated = await db.syncRiskToJira(risk.id)
                                setRisks(prev => prev.map(r => r.id === risk.id ? updated : r))
                                toast.success(`Risk synced to Jira issue: ${updated.jira_issue_key}`)
                              } catch (err) {
                                toast.error('Failed to sync to Jira')
                              } finally {
                                setSyncingId(null)
                              }
                            }}
                            disabled={syncingId !== null}
                            className="flex items-center gap-1 text-[10px] font-semibold text-sky-500 hover:text-sky-500 bg-sky-500/5 hover:bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-500/20 cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            {syncingId === risk.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Database className="w-3 h-3" />
                            )}
                            Sync
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-white text-[10px] font-bold">
                          {risk.owner_name?.[0] ?? '?'}
                        </div>
                        <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                          {risk.owner_name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                        {risk.due_date
                          ? formatDistanceToNow(new Date(risk.due_date), { addSuffix: true })
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{
                            background: risk.likelihood * risk.impact >= 16 ? '#ef444420' :
                              risk.likelihood * risk.impact >= 9 ? '#f9731620' :
                                risk.likelihood * risk.impact >= 4 ? '#eab30820' : '#22c55e20',
                            color: risk.likelihood * risk.impact >= 16 ? '#ef4444' :
                              risk.likelihood * risk.impact >= 9 ? '#f97316' :
                                risk.likelihood * risk.impact >= 4 ? '#eab308' : '#22c55e',
                          }}>
                          {risk.likelihood * risk.impact}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === risk.id ? null : risk.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                        </button>
                        {menuOpen === risk.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl z-20 border py-1"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                            <button onClick={() => { setDetailRisk(risk); setMenuOpen(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left"
                              style={{ color: 'var(--foreground)' }}>
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button onClick={() => { setEditRisk(risk); setShowForm(true); setMenuOpen(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left"
                              style={{ color: 'var(--foreground)' }}>
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={() => handleDelete(risk.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-500">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
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
        />
      )}
    </div>
  )
}

