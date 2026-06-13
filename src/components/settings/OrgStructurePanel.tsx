'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/db'
import type { OrgUnit, OrgUnitType, UserProfile } from '@/types'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Building2, X } from 'lucide-react'

const UNIT_TYPES: { value: OrgUnitType; label: string }[] = [
  { value: 'executive', label: 'Executive' },
  { value: 'committee', label: 'Committee' },
  { value: 'department', label: 'Department' },
  { value: 'division', label: 'Division (şöbə)' },
]

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-sky-500/30'
const inputSty = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }

function emptyUnit(orderIndex: number): OrgUnit {
  const now = new Date().toISOString()
  return {
    id: `ou-${Date.now()}`,
    org_id: 'org1',
    name: '',
    code: '',
    type: 'department',
    parent_id: null,
    head_user_id: null,
    head_role: null,
    order_index: orderIndex,
    created_at: now,
    updated_at: now,
  }
}

export function OrgStructurePanel() {
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [editing, setEditing] = useState<OrgUnit | null>(null)

  async function reload() {
    const [u, p] = await Promise.all([db.getOrgUnits(), db.getProfiles()])
    setUnits([...u].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)))
    setProfiles(p)
  }

  useEffect(() => { reload() }, [])

  const unitName = (id: string | null | undefined) => units.find(u => u.id === id)?.name ?? '—'
  const profileName = (id: string | null | undefined) => profiles.find(p => p.id === id)?.full_name ?? '—'

  const handleSave = async () => {
    if (!editing) return
    if (!editing.name.trim()) {
      toast.error('Unit name is required')
      return
    }
    await db.saveOrgUnit(editing)
    setEditing(null)
    await reload()
    toast.success('Org unit saved')
  }

  const handleDelete = async (id: string) => {
    const hasChildren = units.some(u => u.parent_id === id)
    if (hasChildren) {
      toast.error('Reassign or delete child units first')
      return
    }
    await db.deleteOrgUnit(id)
    await reload()
    toast.success('Org unit deleted')
  }

  const startNew = () => {
    const maxOrder = units.reduce((m, u) => Math.max(m, u.order_index ?? 0), 0)
    setEditing(emptyUnit(maxOrder + 1))
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Building2 className="w-4 h-4" /> Organizational Structure
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
            Departments feed the Risk form&apos;s Owner Department dropdown. The unit head auto-fills the Risk Owner.
          </p>
        </div>
        <button onClick={startNew}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> New Unit
        </button>
      </div>

      {/* Editor */}
      {editing && (
        <div className="mb-5 p-4 rounded-xl border space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              {units.some(u => u.id === editing.id) ? 'Edit Unit' : 'New Unit'}
            </h4>
            <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Name *</label>
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Risklərin idarəedilməsi şöbəsi" className={inputCls} style={{ ...inputSty, background: 'var(--card)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Type</label>
              <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as OrgUnitType })}
                className={inputCls} style={{ ...inputSty, background: 'var(--card)' }}>
                {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Code <span className="font-normal text-slate-500">(Risk ID prefiksi, məs. IT)</span></label>
              <input value={editing.code ?? ''} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                placeholder="IT" className={inputCls} style={{ ...inputSty, background: 'var(--card)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Parent Unit</label>
              <select value={editing.parent_id ?? ''} onChange={e => setEditing({ ...editing, parent_id: e.target.value || null })}
                className={inputCls} style={{ ...inputSty, background: 'var(--card)' }}>
                <option value="">— None (top level) —</option>
                {units.filter(u => u.id !== editing.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Head (Risk Owner)</label>
              <select value={editing.head_user_id ?? ''} onChange={e => setEditing({ ...editing, head_user_id: e.target.value || null })}
                className={inputCls} style={{ ...inputSty, background: 'var(--card)' }}>
                <option value="">— Unassigned —</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Head Role / Title</label>
              <input value={editing.head_role ?? ''} onChange={e => setEditing({ ...editing, head_role: e.target.value || null })}
                placeholder="e.g. Risklərin idarəedilməsi şöbəsinin rəhbəri" className={inputCls} style={{ ...inputSty, background: 'var(--card)' }} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Cancel
            </button>
            <button onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 cursor-pointer">
              Save Unit
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Code', 'Type', 'Parent', 'Head', 'Role', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-3 py-2.5 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{u.name}</td>
                <td className="px-3 py-2.5">
                  {u.code
                    ? <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400">{u.code}</span>
                    : <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>{u.type}</span>
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--muted-fg)' }}>{unitName(u.parent_id)}</td>
                <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--muted-fg)' }}>{profileName(u.head_user_id)}</td>
                <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--muted-fg)' }}>{u.head_role ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setEditing({ ...u })} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" title="Edit">
                      <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer" title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {units.length === 0 && (
          <p className="text-center text-xs py-8" style={{ color: 'var(--muted-fg)' }}>No org units yet. Click “New Unit” to start.</p>
        )}
      </div>
    </div>
  )
}
