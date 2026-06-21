'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import type { Process, Control, OrgUnit } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Workflow, X, Save, Link2 } from 'lucide-react'
import { toast } from 'sonner'

// ── Form dialog ───────────────────────────────────────────────────────────────
function ProcessFormDialog({ process, controls, departments, onClose, onSave }: {
  process: Process | null
  controls: Control[]
  departments: OrgUnit[]
  onClose: () => void
  onSave: (p: Process, controlIds: string[]) => Promise<void>
}) {
  const isEdit = !!process
  const [name, setName] = useState(process?.name ?? '')
  const [ownerDept, setOwnerDept] = useState(process?.owner_dept ?? '')
  const [description, setDescription] = useState(process?.description ?? '')
  const [linkedControlIds, setLinkedCtrl] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (process?.id) {
        const ids = await db.getProcessControlIds(process.id)
        if (active) setLinkedCtrl(ids)
      }
    })()
    return () => { active = false }
  }, [process?.id])

  function toggleCtrl(id: string) {
    setLinkedCtrl(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const labelCls = 'block text-xs font-medium mb-1.5'
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const now = new Date().toISOString()
    await onSave({
      id: process?.id ?? crypto.randomUUID(),
      org_id: process?.org_id ?? '',
      code: process?.code ?? '',
      name: name.trim(),
      owner_dept: ownerDept.trim() || undefined,
      description: description.trim() || undefined,
      created_at: process?.created_at ?? now,
      updated_at: now,
    }, linkedControlIds)
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
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Process' : 'New Business Process'}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{isEdit ? `Editing ${process.code}` : 'Code will be auto-generated (PRC-…)'}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <div className="h-0.5 mx-6" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Name <span className="text-red-400">*</span></label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Financial Payments / Procurement / Onboarding"
                className={fieldCls} style={inputStyle} required />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Owner Department</label>
              <select value={ownerDept} onChange={e => setOwnerDept(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this process covers…"
                className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Controls in this Process</label>
              <p className="text-[10px] mb-1.5" style={{ color: 'var(--muted-fg)' }}>Incidents on this process can only select from these controls.</p>
              <div className="rounded-lg border max-h-40 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                {controls.length === 0 ? (
                  <p className="text-xs px-3 py-2" style={{ color: 'var(--muted-fg)' }}>No controls in the library yet.</p>
                ) : controls.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-white/5" style={{ color: 'var(--foreground)' }}>
                    <input type="checkbox" checked={linkedControlIds.includes(c.id)} onChange={() => toggleCtrl(c.id)} />
                    <span className="font-mono text-[10px]" style={{ color: 'var(--brand-500)' }}>{c.control_id}</span>
                    <span className="truncate">{c.title}</span>
                  </label>
                ))}
              </div>
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
export function ProcessesClient() {
  const [processes, setProcesses] = useState<Process[]>([])
  const [controls, setControls] = useState<Control[]>([])
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [ctrlCounts, setCtrlCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Process | null>(null)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const [data, counts, controlList, units] = await Promise.all([
      db.getProcesses(), db.getProcessControlCounts(), db.getControls(), db.getOrgUnits(),
    ])
    setProcesses(data)
    setCtrlCounts(counts)
    setControls(controlList)
    setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => processes.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.code ?? '').toLowerCase().includes(search.toLowerCase())
  ), [processes, search])

  async function handleSave(item: Process, controlIds: string[]) {
    const saved = await db.saveProcess(item)
    await db.setProcessControls(saved.id, controlIds)
    setShowForm(false); setEditItem(null)
    reload()
    toast.success(editItem ? 'Process updated' : 'Process created')
  }

  async function handleDelete(id: string) {
    await db.deleteProcess(id)
    setMenuOpen(null)
    reload()
    toast.success('Process deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search processes…" aria-label="Search processes"
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg"
          style={{ background: 'var(--brand-500)', boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}>
          <Plus className="w-4 h-4" /> New Process
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Code', 'Name', 'Owner Dept', 'Description', 'Controls', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
                  <div className="flex flex-col items-center gap-2"><Workflow className="w-8 h-8 opacity-30" /><p className="text-sm">No business processes yet</p><p className="text-xs opacity-60">Add a process and attach its controls</p></div>
                </td></tr>
              ) : (
                filtered.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{p.code}</span></td>
                    <td className="px-3 py-3.5"><span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{p.name}</span></td>
                    <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: p.owner_dept ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.owner_dept || '—'}</span></td>
                    <td className="px-3 py-3.5 max-w-xs"><span className="text-xs truncate block" style={{ color: p.description ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.description || '—'}</span></td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap" style={{ color: ctrlCounts[p.id] ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                        <Link2 className="w-3 h-3" /> {ctrlCounts[p.id] ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id) }} aria-label="Process actions"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ProcessFormDialog key={editItem?.id ?? 'new'} process={editItem} controls={controls} departments={departments}
          onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />
      )}
    </div>
  )
}
