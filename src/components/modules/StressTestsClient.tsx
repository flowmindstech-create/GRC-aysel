'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import type { StressTest, StressTestOutcome } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, FlaskConical, X, Save } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const OUTCOME: Record<StressTestOutcome, { label: string; cls: string }> = {
  pass:      { label: 'Pass',       cls: 'bg-emerald-500/15 text-emerald-400' },
  attention: { label: 'Attention',  cls: 'bg-amber-500/15 text-amber-400' },
  fail:      { label: 'Fail',       cls: 'bg-red-500/15 text-red-400' },
}

function FormDialog({ item, onClose, onSave }: { item: StressTest | null; onClose: () => void; onSave: (i: StressTest) => Promise<void> }) {
  const isEdit = !!item
  const [scenario, setScenario] = useState(item?.scenario ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [assumption, setAssumption] = useState(item?.assumption ?? '')
  const [resultImpact, setResultImpact] = useState(item?.result_impact ?? '')
  const [outcome, setOutcome] = useState<StressTestOutcome>(item?.outcome ?? 'attention')
  const [testedAt, setTestedAt] = useState(item?.tested_at ?? '')
  const [owner, setOwner] = useState(item?.owner ?? '')
  const [loading, setLoading] = useState(false)
  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const labelCls = 'block text-xs font-medium mb-1.5'

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!scenario.trim()) return; setLoading(true)
    const now = new Date().toISOString()
    await onSave({ id: item?.id ?? crypto.randomUUID(), org_id: item?.org_id ?? '', code: item?.code ?? '',
      scenario: scenario.trim(), description: description.trim() || undefined, assumption: assumption.trim() || undefined,
      result_impact: resultImpact.trim() || undefined, outcome, tested_at: testedAt || undefined, owner: owner.trim() || undefined,
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
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Stress Test' : 'New Stress Test / Scenario'}</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Scenario <span className="text-red-400">*</span></label>
              <input value={scenario} onChange={e => setScenario(e.target.value)} placeholder="e.g. 30% market downturn" className={fieldCls} style={inputStyle} required /></div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={`${fieldCls} resize-none`} style={inputStyle} /></div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Stress Assumption</label>
              <textarea value={assumption} onChange={e => setAssumption(e.target.value)} rows={2} placeholder="Assumptions applied…" className={`${fieldCls} resize-none`} style={inputStyle} /></div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Result / Modelled Impact</label>
              <textarea value={resultImpact} onChange={e => setResultImpact(e.target.value)} rows={2} className={`${fieldCls} resize-none`} style={inputStyle} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Outcome</label>
                <select value={outcome} onChange={e => setOutcome(e.target.value as StressTestOutcome)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(OUTCOME) as StressTestOutcome[]).map(o => <option key={o} value={o}>{OUTCOME[o].label}</option>)}</select></div>
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Tested At</label>
                <input type="date" value={testedAt} onChange={e => setTestedAt(e.target.value)} className={fieldCls} style={inputStyle} /></div>
            </div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Owner</label>
              <input value={owner} onChange={e => setOwner(e.target.value)} className={fieldCls} style={inputStyle} /></div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-white/5" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={!scenario.trim() || loading} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function StressTestsClient() {
  const [items, setItems] = useState<StressTest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<StressTest | null>(null)
  const [search, setSearch] = useState('')

  async function reload() { setItems(await db.getStressTests()); setLoading(false) }
  useEffect(() => { reload() }, [])

  const filtered = items.filter(i => !search || i.scenario.toLowerCase().includes(search.toLowerCase()))

  async function handleSave(i: StressTest) { await db.saveStressTest(i); setShowForm(false); setEditItem(null); reload(); toast.success(editItem ? 'Updated' : 'Created') }
  async function handleDelete(id: string) { await db.deleteStressTest(id); reload(); toast.success('Deleted') }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search scenarios…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New Stress Test
        </button>
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Code', 'Scenario', 'Assumption', 'Result', 'Outcome', 'Tested', 'Owner', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={8} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={8} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}><div className="flex flex-col items-center gap-2"><FlaskConical className="w-8 h-8 opacity-30" /><p className="text-sm">No stress tests yet</p></div></td></tr>)
          : filtered.map((it, i) => (
            <motion.tr key={it.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{it.code}</span></td>
              <td className="px-3 py-3.5 max-w-xs"><span className="text-sm font-medium truncate block" style={{ color: 'var(--foreground)' }}>{it.scenario}</span></td>
              <td className="px-3 py-3.5 max-w-[160px]"><span className="text-xs truncate block" style={{ color: it.assumption ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.assumption || '—'}</span></td>
              <td className="px-3 py-3.5 max-w-[160px]"><span className="text-xs truncate block" style={{ color: it.result_impact ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.result_impact || '—'}</span></td>
              <td className="px-3 py-3.5">{(() => { const o = OUTCOME[it.outcome] ?? { label: String(it.outcome ?? '—'), cls: 'bg-zinc-500/15 text-zinc-400' }; return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', o.cls)}>{o.label}</span> })()}</td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: it.tested_at ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.tested_at ? format(new Date(it.tested_at), 'd MMM yyyy') : '—'}</span></td>
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
