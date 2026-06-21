'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import type { AppetiteEntry, AppetiteEntryStatus } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Target, X, Save } from 'lucide-react'
import { toast } from 'sonner'

const STATUS: Record<AppetiteEntryStatus, { label: string; cls: string }> = {
  within:   { label: 'Within Appetite', cls: 'bg-emerald-500/15 text-emerald-400' },
  warning:  { label: 'Warning',         cls: 'bg-amber-500/15 text-amber-400' },
  breached: { label: 'Breached',        cls: 'bg-red-500/15 text-red-400' },
}

function FormDialog({ item, onClose, onSave }: { item: AppetiteEntry | null; onClose: () => void; onSave: (i: AppetiteEntry) => Promise<void> }) {
  const isEdit = !!item
  const [category, setCategory] = useState(item?.category ?? '')
  const [statement, setStatement] = useState(item?.statement ?? '')
  const [tolerance, setTolerance] = useState(item?.tolerance ?? '')
  const [measure, setMeasure] = useState(item?.measure ?? '')
  const [status, setStatus] = useState<AppetiteEntryStatus>(item?.status ?? 'within')
  const [owner, setOwner] = useState(item?.owner ?? '')
  const [loading, setLoading] = useState(false)
  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const labelCls = 'block text-xs font-medium mb-1.5'

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!statement.trim()) return; setLoading(true)
    const now = new Date().toISOString()
    await onSave({ id: item?.id ?? crypto.randomUUID(), org_id: item?.org_id ?? '', code: item?.code ?? '',
      category: category.trim() || undefined, statement: statement.trim(), tolerance: tolerance.trim() || undefined,
      measure: measure.trim() || undefined, status, owner: owner.trim() || undefined,
      created_at: item?.created_at ?? now, updated_at: now })
    setLoading(false)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Statement' : 'New Risk Appetite Statement'}</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Credit / Operational / Cyber" className={fieldCls} style={inputStyle} /></div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Statement <span className="text-red-400">*</span></label>
              <textarea value={statement} onChange={e => setStatement(e.target.value)} rows={2} placeholder="The organisation accepts…" className={`${fieldCls} resize-none`} style={inputStyle} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Tolerance / Limit</label>
                <input value={tolerance} onChange={e => setTolerance(e.target.value)} placeholder="e.g. ≤ 2% of capital" className={fieldCls} style={inputStyle} /></div>
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Measure (KRI)</label>
                <input value={measure} onChange={e => setMeasure(e.target.value)} placeholder="metric" className={fieldCls} style={inputStyle} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as AppetiteEntryStatus)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(STATUS) as AppetiteEntryStatus[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                </select></div>
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Owner</label>
                <input value={owner} onChange={e => setOwner(e.target.value)} className={fieldCls} style={inputStyle} /></div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-white/5" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={!statement.trim() || loading} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function RiskAppetiteClient() {
  const [items, setItems] = useState<AppetiteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<AppetiteEntry | null>(null)
  const [search, setSearch] = useState('')

  async function reload() { setItems(await db.getRiskAppetite()); setLoading(false) }
  useEffect(() => { reload() }, [])

  const filtered = items.filter(i => !search || i.statement.toLowerCase().includes(search.toLowerCase()) || (i.category ?? '').toLowerCase().includes(search.toLowerCase()))

  async function handleSave(i: AppetiteEntry) {
    await db.saveRiskAppetite(i); setShowForm(false); setEditItem(null); reload(); toast.success(editItem ? 'Updated' : 'Created')
  }
  async function handleDelete(id: string) { await db.deleteRiskAppetite(id); reload(); toast.success('Deleted') }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search statements…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New Statement
        </button>
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Code', 'Category', 'Statement', 'Tolerance', 'Measure', 'Status', 'Owner', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={8} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={8} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}><div className="flex flex-col items-center gap-2"><Target className="w-8 h-8 opacity-30" /><p className="text-sm">No statements yet</p></div></td></tr>)
          : filtered.map((it, i) => (
            <motion.tr key={it.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{it.code}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: it.category ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.category || '—'}</span></td>
              <td className="px-3 py-3.5 max-w-xs"><span className="text-sm truncate block" style={{ color: 'var(--foreground)' }}>{it.statement}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: it.tolerance ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.tolerance || '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: it.measure ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.measure || '—'}</span></td>
              <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS[it.status].cls)}>{STATUS[it.status].label}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: it.owner ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.owner || '—'}</span></td>
              <td className="px-3 py-3.5"><div className="flex items-center gap-1">
                <button onClick={() => { setEditItem(it); setShowForm(true) }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"><Edit className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} /></button>
                <button onClick={() => handleDelete(it.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div></td>
            </motion.tr>
          ))}
        </tbody>
      </table></div></div>
      {showForm && <FormDialog key={editItem?.id ?? 'new'} item={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />}
    </div>
  )
}
