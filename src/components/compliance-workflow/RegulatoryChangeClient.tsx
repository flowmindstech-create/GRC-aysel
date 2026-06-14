'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { db } from '@/lib/db'
import type { RegulatoryChange, RegulatoryChangeStatus } from '@/types'
import { cn } from '@/lib/utils'
import { RegulatoryChangeFormDialog } from './RegulatoryChangeFormDialog'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, RefreshCw,
  Sparkles, ClipboardCheck, CheckCircle2, Archive, Link2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<RegulatoryChangeStatus, { label: string; classes: string }> = {
  new:              { label: 'New',              classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  under_assessment: { label: 'Under Assessment', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  implemented:      { label: 'Implemented',      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  closed:           { label: 'Closed',           classes: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' },
}

const ALL_STATUSES: RegulatoryChangeStatus[] = ['new', 'under_assessment', 'implemented', 'closed']

export function RegulatoryChangeClient() {
  const [changes, setChanges]   = useState<RegulatoryChange[]>([])
  const [counts, setCounts]     = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<RegulatoryChange | null>(null)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<RegulatoryChangeStatus | 'all'>('all')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const [list, c] = await Promise.all([db.getRegulatoryChanges(), db.getRegulatoryChangeAffectedCounts()])
    setChanges(list)
    setCounts(c)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => changes.filter(c => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.change_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.regulator ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  }), [changes, search, statusFilter])

  const stats = useMemo(() => ({
    total:       changes.length,
    new:         changes.filter(c => c.status === 'new').length,
    assessment:  changes.filter(c => c.status === 'under_assessment').length,
    implemented: changes.filter(c => c.status === 'implemented').length,
  }), [changes])

  async function handleSave(item: RegulatoryChange) {
    const saved = await db.saveRegulatoryChange(item)
    setChanges(prev => {
      const idx = prev.findIndex(c => c.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
    setShowForm(false)
    setEditItem(null)
    toast.success(editItem ? 'Regulatory change updated' : 'Regulatory change created')
  }

  async function handleDelete(id: string) {
    await db.deleteRegulatoryChange(id)
    setChanges(prev => prev.filter(c => c.id !== id))
    setMenuOpen(null)
    reload()
    toast.success('Regulatory change deleted')
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Changes',     value: stats.total,       icon: RefreshCw,     color: '14,165,233' },
          { label: 'New',               value: stats.new,         icon: Sparkles,      color: '59,130,246' },
          { label: 'Under Assessment',  value: stats.assessment,  icon: ClipboardCheck, color: '234,179,8' },
          { label: 'Implemented',       value: stats.implemented, icon: CheckCircle2,  color: '5,150,105' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card p-4 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, rgba(${s.color},0.7), transparent)` }} />
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${s.color},0.12)` }}>
                <s.icon className="w-4 h-4" style={{ color: `rgb(${s.color})` }} />
              </div>
            </div>
            <p className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search regulatory changes…" aria-label="Search regulatory changes"
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {(['all', ...ALL_STATUSES] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={statusFilter === s ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg"
          style={{ background: 'var(--brand-500)', boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}>
          <Plus className="w-4 h-4" /> New Change
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Code', 'Change', 'Source', 'Regulator', 'Change Date', 'Status', 'Affected', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
                    <div className="flex flex-col items-center gap-2">
                      <Archive className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No regulatory changes</p>
                      <p className="text-xs opacity-60">Log a regulatory change to start tracking impact</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .map((item, i) => {
                    const isNearBottom = filtered.length > 2 && i >= filtered.length - 2
                    const sc = STATUS_CONFIG[item.status]
                    return (
                      <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{item.change_code}</span></td>
                        <td className="px-3 py-3.5 max-w-xs">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{item.title}</p>
                          {item.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-fg)' }}>{item.description.slice(0, 60)}{item.description.length > 60 ? '…' : ''}</p>}
                        </td>
                        <td className="px-3 py-3.5"><span className="text-xs" style={{ color: 'var(--muted-fg)' }}>{item.source}</span></td>
                        <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: item.regulator ? 'var(--foreground)' : 'var(--muted-fg)' }}>{item.regulator ?? '—'}</span></td>
                        <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{item.change_date ? format(new Date(item.change_date), 'd MMM yyyy') : '—'}</span></td>
                        <td className="px-3 py-3.5">
                          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border', sc.classes)}>{sc.label}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap" style={{ color: counts[item.id] ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                            <Link2 className="w-3 h-3" /> {counts[item.id] ?? 0}
                          </span>
                        </td>
                        <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === item.id ? null : item.id) }} aria-label="Change actions"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                              <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                            </button>
                            {menuOpen === item.id && (
                              <div className={cn("absolute right-0 w-40 rounded-xl shadow-xl z-20 border py-1", isNearBottom ? "bottom-full mb-1" : "top-full mt-1")}
                                style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => { setEditItem(item); setShowForm(true); setMenuOpen(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left" style={{ color: 'var(--foreground)' }}>
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button onClick={() => handleDelete(item.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <RegulatoryChangeFormDialog
          key={editItem?.id ?? 'new'}
          change={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSave={handleSave}
          onSaved={reload}
        />
      )}
    </div>
  )
}
