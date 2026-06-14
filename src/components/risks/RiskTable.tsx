'use client'

import { useState, useEffect, Fragment } from 'react'
import { motion } from 'framer-motion'
import { db } from '@/lib/db'
import type { Risk, RiskLevel } from '@/types'
import { RISK_CATEGORIES, RISK_CATEGORY_VALUES, CATEGORY_LABELS, type RiskCategory } from '@/lib/risk-categories'
import { RISK_STATUSES, STATUS_CLASSES, RISK_STATUS_VALUES, STATUS_LABELS, normalizeStatus, type RiskStatus } from '@/lib/risk-status'
import { residualLevelWord, CONTROL_RATING_INFO } from '@/lib/rcsa-methodology'
import { TREATMENT_STRATEGY_LABELS, type TreatmentStrategy, type ControlRating } from '@/lib/rcsa'
import { RiskLevelBadge } from '@/components/shared/Badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RiskFormDialog } from './RiskFormDialog'
import { RiskDetailSheet } from './RiskDetailSheet'
import { toast } from 'sonner'

const LEVELS: (RiskLevel | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'minimal']
const CATEGORIES: (RiskCategory | 'all')[] = ['all', ...RISK_CATEGORY_VALUES]
const STATUSES: (RiskStatus | 'all')[] = ['all', ...RISK_STATUS_VALUES]

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

  useEffect(() => {
    async function load() {
      const data = await db.getRisks()
      setRisks(data)
    }
    load()
  }, [])


  const filtered = risks.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    const matchLevel = levelFilter === 'all' || r.level === levelFilter
    const matchCat = categoryFilter === 'all' || r.category === categoryFilter
    const matchStatus = statusFilter === 'all' || normalizeStatus(r.status) === statusFilter
    return matchSearch && matchLevel && matchCat && matchStatus
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
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Risk ID', 'Risk', 'Category', 'Status', 'Treatment', 'Due', 'Inherent', 'Residual', 'Control activities', 'Degree', 'Owner structure', 'Owner', ''].map(h => (
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
                  const isNearBottom = absoluteIndex >= filtered.length - 2
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
                        <p className="text-sm font-medium truncate group-hover:text-sky-500 transition-colors"
                          style={{ color: 'var(--foreground)' }}>
                          {risk.title}
                        </p>
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
                          <select
                            value={risk.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value as any
                              const updated = { ...risk, status: newStatus }
                              await handleSave(updated)
                              toast.success('Status updated successfully')
                            }}
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent cursor-pointer outline-none pr-6',
                              STATUS_CLASSES[normalizeStatus(risk.status)]
                            )}
                            style={{
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 4.5 6 7.5 9 4.5'></polyline></svg>")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.4rem center',
                            }}
                          >
                            {RISK_STATUSES.map(s => (
                              <option key={s.value} value={s.value} className="bg-slate-900 text-white">
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs capitalize" style={{ color: 'var(--muted-fg)' }}>
                          {risk.mitigation ? TREATMENT_STRATEGY_LABELS[risk.mitigation as TreatmentStrategy] ?? risk.mitigation : '—'}
                        </span>
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
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {risk.owner_name?.[0] ?? '?'}
                          </div>
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                            {risk.owner_name ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === risk.id ? null : risk.id)}
                            aria-label="Risk actions"
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                          </button>
                          {menuOpen === risk.id && (
                            <div className={cn(
                              "absolute right-0 w-40 rounded-xl shadow-xl z-20 border py-1",
                              isNearBottom ? "bottom-full mb-1" : "top-full mt-1"
                            )}
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

