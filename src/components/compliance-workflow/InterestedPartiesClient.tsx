'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import type { InterestedParty, PartyType, PartyInfluence } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Users, X, Save } from 'lucide-react'
import { toast } from 'sonner'

const PARTY_TYPES: { value: PartyType; label: string }[] = [
  { value: 'internal',   label: 'Internal' },
  { value: 'external',   label: 'External' },
  { value: 'regulator',  label: 'Regulator' },
  { value: 'customer',   label: 'Customer' },
  { value: 'supplier',   label: 'Supplier' },
  { value: 'employee',   label: 'Employee' },
  { value: 'community',  label: 'Community' },
]

const INFLUENCE: { value: PartyInfluence; label: string; cls: string }[] = [
  { value: 'low',    label: 'Low',    cls: 'bg-emerald-500/15 text-emerald-400' },
  { value: 'medium', label: 'Medium', cls: 'bg-amber-500/15 text-amber-400' },
  { value: 'high',   label: 'High',   cls: 'bg-red-500/15 text-red-400' },
]

const TYPE_COLOR: Record<PartyType, string> = {
  internal: 'bg-blue-500/12 text-blue-400', external: 'bg-purple-500/12 text-purple-400',
  regulator: 'bg-rose-500/12 text-rose-400', customer: 'bg-cyan-500/12 text-cyan-400',
  supplier: 'bg-orange-500/12 text-orange-400', employee: 'bg-indigo-500/12 text-indigo-400',
  community: 'bg-green-500/12 text-green-400',
}

// ── Form dialog ───────────────────────────────────────────────────────────────
function PartyFormDialog({ party, onClose, onSave }: { party: InterestedParty | null; onClose: () => void; onSave: (p: InterestedParty) => Promise<void> }) {
  const isEdit = !!party
  const [name, setName] = useState(party?.name ?? '')
  const [partyType, setPartyType] = useState<PartyType>(party?.party_type ?? 'external')
  const [influence, setInfluence] = useState<PartyInfluence>(party?.influence ?? 'medium')
  const [needs, setNeeds] = useState(party?.needs_expectations ?? '')
  const [owner, setOwner] = useState(party?.owner ?? '')
  const [notes, setNotes] = useState(party?.notes ?? '')
  const [loading, setLoading] = useState(false)

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const labelCls = 'block text-xs font-medium mb-1.5'
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const now = new Date().toISOString()
    await onSave({
      id: party?.id ?? crypto.randomUUID(),
      org_id: party?.org_id ?? '',
      party_code: party?.party_code ?? '',
      name: name.trim(),
      party_type: partyType,
      influence,
      needs_expectations: needs.trim() || undefined,
      owner: owner.trim() || undefined,
      notes: notes.trim() || undefined,
      created_at: party?.created_at ?? now,
      updated_at: now,
    })
    setLoading(false)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }} className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Interested Party' : 'New Interested Party'}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{isEdit ? `Editing ${party.party_code}` : 'Code will be auto-generated (IP-…)'}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <div className="h-0.5 mx-6" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Name <span className="text-red-400">*</span></label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. State Tax Service / Customers / Employees"
                className={fieldCls} style={inputStyle} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Type</label>
                <select value={partyType} onChange={e => setPartyType(e.target.value as PartyType)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {PARTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Influence</label>
                <select value={influence} onChange={e => setInfluence(e.target.value as PartyInfluence)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {INFLUENCE.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Needs & Expectations</label>
              <textarea value={needs} onChange={e => setNeeds(e.target.value)} rows={2} placeholder="What this party needs / expects from the organisation…"
                className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Owner</label>
              <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Relationship owner" className={fieldCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-white/5" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={!name.trim() || loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function InterestedPartiesClient() {
  const [parties, setParties] = useState<InterestedParty[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InterestedParty | null>(null)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const data = await db.getInterestedParties()
    setParties(data)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => parties.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.party_code ?? '').toLowerCase().includes(search.toLowerCase())
  ), [parties, search])

  async function handleSave(item: InterestedParty) {
    const saved = await db.saveInterestedParty(item)
    setParties(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
    setShowForm(false); setEditItem(null)
    toast.success(editItem ? 'Party updated' : 'Party created')
  }

  async function handleDelete(id: string) {
    await db.deleteInterestedParty(id)
    setParties(prev => prev.filter(p => p.id !== id))
    setMenuOpen(null)
    toast.success('Party deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search interested parties…" aria-label="Search interested parties"
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg"
          style={{ background: 'var(--brand-500)', boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}>
          <Plus className="w-4 h-4" /> New Party
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Code', 'Name', 'Type', 'Influence', 'Needs & Expectations', 'Owner', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
                  <div className="flex flex-col items-center gap-2"><Users className="w-8 h-8 opacity-30" /><p className="text-sm">No interested parties yet</p></div>
                </td></tr>
              ) : (
                filtered.map((p, i) => {
                  const inf = INFLUENCE.find(x => x.value === p.influence)!
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{p.party_code}</span></td>
                      <td className="px-3 py-3.5"><span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{p.name}</span></td>
                      <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize', TYPE_COLOR[p.party_type])}>{p.party_type}</span></td>
                      <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', inf.cls)}>{inf.label}</span></td>
                      <td className="px-3 py-3.5 max-w-xs"><span className="text-xs truncate block" style={{ color: p.needs_expectations ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.needs_expectations || '—'}</span></td>
                      <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: p.owner ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.owner || '—'}</span></td>
                      <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id) }} aria-label="Party actions"
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                            <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                          </button>
                          {menuOpen === p.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl z-20 border py-1" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setEditItem(p); setShowForm(true); setMenuOpen(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left" style={{ color: 'var(--foreground)' }}>
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-500">
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
        <PartyFormDialog key={editItem?.id ?? 'new'} party={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />
      )}
    </div>
  )
}
