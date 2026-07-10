'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { calculateInherentLevel } from '@/lib/rcsa'
import { inherentLevelWord } from '@/lib/rcsa-methodology'
import type { FinancialRisk, FinancialRiskKind } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Landmark, X, Save, Briefcase, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

function FormDialog({ item, kind, onClose, onSave }: { item: FinancialRisk | null; kind: FinancialRiskKind; onClose: () => void; onSave: (i: FinancialRisk) => Promise<void> }) {
  const isEdit = !!item
  const [title, setTitle] = useState(item?.title ?? '')
  const [exposure, setExposure] = useState(item?.exposure_amount?.toString() ?? '')
  const [currency, setCurrency] = useState(item?.currency ?? 'AZN')
  const [likelihood, setLikelihood] = useState(item?.likelihood ?? 3)
  const [impact, setImpact] = useState(item?.impact ?? 3)
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [owner, setOwner] = useState(item?.owner ?? '')
  const [loading, setLoading] = useState(false)
  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const labelCls = 'block text-xs font-medium mb-1.5'
  const level = calculateInherentLevel(likelihood, impact)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!title.trim()) return; setLoading(true)
    const now = new Date().toISOString()
    await onSave({ id: item?.id ?? crypto.randomUUID(), org_id: item?.org_id ?? '', code: item?.code ?? '',
      title: title.trim(), kind: item?.kind ?? kind, exposure_amount: exposure ? Number(exposure) : undefined,
      currency, likelihood, impact, level, notes: notes.trim() || undefined, owner: owner.trim() || undefined,
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
            <h2 className="text-sm font-semibold capitalize" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit' : `New ${kind} risk`}</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Title <span className="text-red-400">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. FX exposure on USD bonds" className={fieldCls} style={inputStyle} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Exposure Amount</label>
                <input type="number" value={exposure} onChange={e => setExposure(e.target.value)} placeholder="0.00" className={fieldCls} style={inputStyle} /></div>
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {['AZN','USD','EUR'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Likelihood (1-5)</label>
                <select value={likelihood} onChange={e => setLikelihood(Number(e.target.value))} className={`${fieldCls} cursor-pointer`} style={inputStyle}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Impact (1-5)</label>
                <select value={impact} onChange={e => setImpact(Number(e.target.value))} className={`${fieldCls} cursor-pointer`} style={inputStyle}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--muted)' }}>
              <span className="text-[10px] uppercase" style={{ color: 'var(--muted-fg)' }}>Risk Level (auto): </span>
              <span className="text-xs font-bold" style={{ color: 'var(--brand-500)' }}>{inherentLevelWord(level)}</span>
            </div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${fieldCls} resize-none`} style={inputStyle} /></div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Owner</label>
              <input value={owner} onChange={e => setOwner(e.target.value)} className={fieldCls} style={inputStyle} /></div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-black/[0.04]" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={!title.trim() || loading} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function FinancialRisksClient() {
  const [items, setItems] = useState<FinancialRisk[]>([])
  const [tab, setTab] = useState<FinancialRiskKind>('portfolio')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<FinancialRisk | null>(null)
  const [search, setSearch] = useState('')

  async function reload() { setItems(await db.getFinancialRisks()); setLoading(false) }
  useEffect(() => { reload() }, [])

  const filtered = items.filter(i => i.kind === tab && (!search || (i.title ?? '').toLowerCase().includes(search.toLowerCase())))

  async function handleSave(i: FinancialRisk) { await db.saveFinancialRisk(i); setShowForm(false); setEditItem(null); reload(); toast.success(editItem ? 'Updated' : 'Created') }
  async function handleDelete(id: string) { await db.deleteFinancialRisk(id); reload(); toast.success('Deleted') }

  const tabs: { id: FinancialRiskKind; label: string; icon: typeof Briefcase }[] = [
    { id: 'portfolio', label: 'Portfolio Risks', icon: Briefcase },
    { id: 'investment', label: 'Investment Risks', icon: TrendingUp },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t.id ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New {tab === 'portfolio' ? 'Portfolio' : 'Investment'} Risk
        </button>
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Code', 'Title', 'Exposure', 'Likelihood', 'Impact', 'Level', 'Owner', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={8} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={8} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}><div className="flex flex-col items-center gap-2"><Landmark className="w-8 h-8 opacity-30" /><p className="text-sm">No {tab} risks yet</p></div></td></tr>)
          : filtered.map((it, i) => (
            <motion.tr key={it.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{it.code}</span></td>
              <td className="px-3 py-3.5 max-w-xs"><span className="text-sm font-medium truncate block" style={{ color: 'var(--foreground)' }}>{it.title}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: it.exposure_amount != null ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.exposure_amount != null ? `${it.exposure_amount.toLocaleString()} ${it.currency || 'AZN'}` : '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: 'var(--muted-fg)' }}>{it.likelihood}/5</span></td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: 'var(--muted-fg)' }}>{it.impact}/5</span></td>
              <td className="px-3 py-3.5"><span className="text-xs font-semibold capitalize" style={{ color: 'var(--foreground)' }}>{it.level || inherentLevelWord(calculateInherentLevel(it.likelihood, it.impact))}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: it.owner ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.owner || '—'}</span></td>
              <td className="px-3 py-3.5"><div className="flex items-center gap-1">
                <button onClick={() => { setEditItem(it); setShowForm(true) }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"><Edit className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} /></button>
                <button onClick={() => handleDelete(it.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div></td>
            </motion.tr>
          ))}
        </tbody>
      </table></div></div>
      {showForm && <FormDialog key={editItem?.id ?? 'new'} item={editItem} kind={tab} onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />}
    </div>
  )
}
