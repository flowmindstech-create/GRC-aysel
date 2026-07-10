'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import { resolveOwnerFromUnit } from '@/lib/org'
import type { InternalPolicy, InternalPolicyDocType, ApprovingBody, InternalPolicyStatus, OrgUnit, UserProfile } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, MoreHorizontal, Edit, Trash2, FileText, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { ExportMenu } from '@/components/shared/ExportMenu'
import type { ExportColumn } from '@/lib/export'

const POLICY_EXPORT_COLUMNS: ExportColumn<InternalPolicy>[] = [
  { key: 'code', label: 'Kod', value: p => p.code },
  { key: 'policy_name', label: 'Sənəd adı', value: p => p.policy_name },
  { key: 'document_type', label: 'Tip', value: p => p.document_type },
  { key: 'approving_body', label: 'Təsdiq orqanı', value: p => p.approving_body },
  { key: 'version', label: 'Versiya', value: p => p.version },
  { key: 'document_number', label: 'Sənəd №', value: p => p.document_number ?? '' },
  { key: 'status', label: 'Status', value: p => p.status },
  { key: 'publish_time', label: 'Dərc tarixi', value: p => p.publish_time ? new Date(p.publish_time).toLocaleDateString('az-AZ') : '' },
  { key: 'validity_period', label: 'Qüvvə müddəti', value: p => p.validity_period ? new Date(p.validity_period).toLocaleDateString('az-AZ') : '' },
  { key: 'responsible_structure', label: 'Struktur', value: p => p.responsible_structure ?? '' },
  { key: 'responsible_person', label: 'Cavabdeh', value: p => p.responsible_person ?? '' },
]

export const DOC_TYPE_CFG: Record<InternalPolicyDocType, { label: string; cls: string }> = {
  policy:      { label: 'Policy',      cls: 'bg-indigo-500/15 text-indigo-500' },
  procedure:   { label: 'Procedure',   cls: 'bg-emerald-500/15 text-emerald-600' },
  rules:       { label: 'Rules',       cls: 'bg-sky-500/15 text-sky-600' },
  instruction: { label: 'Instruction', cls: 'bg-amber-500/15 text-amber-600' },
}
export const APPROVING_CFG: Record<ApprovingBody, string> = {
  trustees_body: 'Trustees Body',
  ceo: 'CEO',
}
export const STATUS_CFG: Record<InternalPolicyStatus, { label: string; cls: string }> = {
  in_progress: { label: 'In Progress', cls: 'bg-amber-500/15 text-amber-600' },
  approved:    { label: 'Approved',    cls: 'bg-sky-500/15 text-sky-600' },
  published:   { label: 'Published',   cls: 'bg-emerald-500/15 text-emerald-600' },
  rejected:    { label: 'Rejected',    cls: 'bg-red-500/15 text-red-500' },
  defunct:     { label: 'Defunct',     cls: 'bg-zinc-500/15 text-zinc-500' },
}
const VERSIONS = ['1.0', '1.1', '1.2', '2.0', '2.1', '3.0', '3.1', '4.0']

function PolicyFormDialog({ item, departments, profiles, existingNumbers, onClose, onSave }: {
  item: InternalPolicy | null
  departments: OrgUnit[]
  profiles: UserProfile[]
  existingNumbers: string[]
  onClose: () => void
  onSave: (p: InternalPolicy) => Promise<void>
}) {
  const isEdit = !!item
  const [name, setName] = useState(item?.policy_name ?? '')
  const [docType, setDocType] = useState<InternalPolicyDocType>(item?.document_type ?? 'policy')
  const [approving, setApproving] = useState<ApprovingBody>(item?.approving_body ?? 'ceo')
  const [respStructure, setRespStructure] = useState(item?.responsible_structure ?? '')
  const [respPerson, setRespPerson] = useState(item?.responsible_person ?? '')
  const [version, setVersion] = useState(item?.version ?? '1.0')
  const [docNumber, setDocNumber] = useState(item?.document_number ?? '')
  const [publishTime, setPublishTime] = useState(item?.publish_time?.slice(0, 10) ?? '')
  const [validity, setValidity] = useState(item?.validity_period?.slice(0, 10) ?? '')
  const [status, setStatus] = useState<InternalPolicyStatus>(item?.status ?? 'in_progress')
  const [loading, setLoading] = useState(false)

  function handleStructure(deptName: string) {
    setRespStructure(deptName)
    const unit = departments.find(u => u.name === deptName)
    if (unit) setRespPerson(resolveOwnerFromUnit(unit, profiles).owner_name || '')
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const labelCls = 'block text-xs font-medium mb-1.5'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Policy name məcburidir'); return }
    setLoading(true)
    const now = new Date().toISOString()
    await onSave({
      id: item?.id ?? crypto.randomUUID(),
      org_id: item?.org_id ?? '',
      code: item?.code ?? '',
      policy_name: name.trim(),
      document_type: docType,
      approving_body: approving,
      responsible_structure: respStructure || undefined,
      responsible_person: respPerson || undefined,
      version,
      document_number: docNumber.trim() || undefined,
      publish_time: publishTime || undefined,
      validity_period: validity || undefined,
      status,
      created_at: item?.created_at ?? now,
      updated_at: now,
    })
    setLoading(false)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Internal Policy' : 'New Internal Policy'}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{isEdit ? `Code: ${item.code}` : 'Code avtomatik veriləcək (IP-…)'}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Policy Name <span className="text-red-400">*</span></label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="məs. İnformasiya Təhlükəsizliyi Siyasəti" className={fieldCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value as InternalPolicyDocType)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(DOC_TYPE_CFG) as InternalPolicyDocType[]).map(t => <option key={t} value={t}>{DOC_TYPE_CFG[t].label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Approving Body</label>
                <select value={approving} onChange={e => setApproving(e.target.value as ApprovingBody)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(APPROVING_CFG) as ApprovingBody[]).map(b => <option key={b} value={b}>{APPROVING_CFG[b]}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Responsible Structure</label>
                <select value={respStructure} onChange={e => handleStructure(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  <option value="">— Seçin —</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Responsible Person</label>
                <select value={respPerson} onChange={e => setRespPerson(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  <option value="">— Seçin —</option>
                  {profiles.map(p => <option key={p.id} value={p.full_name}>{p.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Version</label>
                <select value={version} onChange={e => setVersion(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {VERSIONS.map(v => <option key={v} value={v}>v{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Document Number</label>
                <input value={docNumber} onChange={e => setDocNumber(e.target.value)} list="doc-numbers"
                  placeholder="seç və ya yeni yaz…" className={fieldCls} style={inputStyle} />
                <datalist id="doc-numbers">
                  {existingNumbers.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Publish Time</label>
                <input type="date" value={publishTime} onChange={e => setPublishTime(e.target.value)} className={fieldCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Validity Period (bitmə)</label>
                <input type="date" value={validity} onChange={e => setValidity(e.target.value)} className={fieldCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as InternalPolicyStatus)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                {(Object.keys(STATUS_CFG) as InternalPolicyStatus[]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-black/[0.04]" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Register ──────────────────────────────────────────────────────────────────
export function InternalPoliciesClient() {
  const { can } = usePermissions()
  const [items, setItems] = useState<InternalPolicy[]>([])
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InternalPolicy | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InternalPolicyStatus | 'all'>('all')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const [data, units, people] = await Promise.all([
      dbExt.getInternalPolicies(), db.getOrgUnits(), db.getProfiles(),
    ])
    setItems(data)
    setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    setProfiles(people)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const existingNumbers = useMemo(() => Array.from(new Set(items.map(p => p.document_number).filter(Boolean))) as string[], [items])

  const filtered = items.filter(p =>
    (!search
      || (p.policy_name ?? '').toLowerCase().includes(search.toLowerCase())
      || (p.code ?? '').toLowerCase().includes(search.toLowerCase())
      || (p.document_number ?? '').toLowerCase().includes(search.toLowerCase()))
    && (statusFilter === 'all' || p.status === statusFilter)
  )

  async function handleSave(p: InternalPolicy) {
    await dbExt.saveInternalPolicy(p)
    setShowForm(false); setEditItem(null); reload()
    toast.success(editItem ? 'Updated' : 'Created')
  }
  async function handleDelete(id: string) {
    await dbExt.deleteInternalPolicy(id); setMenuOpen(null); reload(); toast.success('Deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search internal policies…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl flex-wrap" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {(['all', ...Object.keys(STATUS_CFG)] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s as InternalPolicyStatus | 'all')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap"
              style={statusFilter === s ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
              {s === 'all' ? 'All' : STATUS_CFG[s as InternalPolicyStatus].label}
            </button>
          ))}
        </div>
        <ExportMenu columns={POLICY_EXPORT_COLUMNS} rows={filtered} filename="internal-policies" title="Internal Policies" />
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Code', 'Policy Name', 'Document Type', 'Approving Body', 'Resp. Structure', 'Resp. Person', 'Version', 'Doc Number', 'Publish Time', 'Validity Period', 'Status', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={12} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={12} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
              <div className="flex flex-col items-center gap-2"><FileText className="w-8 h-8 opacity-30" /><p className="text-sm">Hələ daxili siyasət yoxdur</p></div>
            </td></tr>)
          : filtered.map((p, i) => {
            const dt = DOC_TYPE_CFG[p.document_type ?? 'policy']
            const st = STATUS_CFG[p.status ?? 'in_progress']
            return (
            <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="group hover:bg-black/[0.02]" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{p.code}</span></td>
              <td className="px-3 py-3.5 max-w-[210px]"><span className="text-sm font-medium line-clamp-2" style={{ color: 'var(--foreground)' }}>{p.policy_name}</span></td>
              <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', dt.cls)}>{dt.label}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{APPROVING_CFG[p.approving_body ?? 'ceo']}</span></td>
              <td className="px-3 py-3.5 max-w-[150px]"><span className="text-xs" style={{ color: p.responsible_structure ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.responsible_structure || '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: p.responsible_person ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.responsible_person || '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/12 text-sky-600">v{p.version}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: p.document_number ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.document_number || '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: p.publish_time ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.publish_time ? new Date(p.publish_time).toLocaleDateString('az-AZ') : '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: p.validity_period ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.validity_period ? new Date(p.validity_period).toLocaleDateString('az-AZ') : '—'}</span></td>
              <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', st.cls)}>{st.label}</span></td>
              <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                <div className="relative inline-block">
                  <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id) }} aria-label="Actions"
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors">
                    <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                  </button>
                  {menuOpen === p.id && (
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl z-50 border py-1" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditItem(p); setShowForm(true); setMenuOpen(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 text-left" style={{ color: 'var(--foreground)' }}>
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      {can('delete') && <button onClick={() => handleDelete(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-left text-red-500">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>}
                    </div>
                  )}
                </div>
              </td>
            </motion.tr>
            )
          })}
        </tbody>
      </table></div></div>

      {showForm && <PolicyFormDialog key={editItem?.id ?? 'new'} item={editItem} departments={departments} profiles={profiles}
        existingNumbers={existingNumbers} onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />}
    </div>
  )
}
