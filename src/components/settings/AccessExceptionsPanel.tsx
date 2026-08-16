'use client'

import { useState, useEffect, useMemo } from 'react'
import { db } from '@/lib/db'
import type { AccessException, AccessPermission, UserProfile, OrgUnit } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'
import { isExceptionActive } from '@/lib/permissions'
import { KeyRound, Lock, Loader2, Plus, Ban } from 'lucide-react'
import { toast } from 'sonner'

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Entities' },
  { value: 'risk', label: 'Risks' },
  { value: 'incident', label: 'Incidents' },
  { value: 'audit', label: 'Audits' },
  { value: 'org_unit', label: 'Division' },
]
const PERM_LABEL: Record<AccessPermission, string> = { view: 'Review', edit: 'Edit', approve: 'Approval' }
const entLabel = (t: string) => ENTITY_OPTIONS.find(o => o.value === t)?.label ?? t

function statusOf(ex: AccessException): { label: string; rgb: string } {
  if (ex.revoked) return { label: 'Cancelled', rgb: '100,116,139' }
  if (!isExceptionActive(ex)) return { label: 'Bitib', rgb: '217,119,6' }
  return { label: 'Aktiv', rgb: '5,150,105' }
}
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('az-AZ') : '—')

export function AccessExceptionsPanel() {
  const { isSuperAdmin, loading: permLoading } = usePermissions()
  const [items, setItems] = useState<AccessException[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [userId, setUserId] = useState('')
  const [entityType, setEntityType] = useState('risk')
  const [unitId, setUnitId] = useState('')
  const [permission, setPermission] = useState<AccessPermission>('view')
  const [reason, setReason] = useState('')
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10))
  const [expiresAt, setExpiresAt] = useState('')

  function reload() {
    Promise.all([db.getAccessExceptions(), db.getProfiles(), db.getOrgUnits()])
      .then(([ex, us, un]) => { setItems(ex); setUsers(us); setUnits(un) })
      .catch(() => toast.error('Failed to load access exceptions'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { reload() }, [])

  const userName = useMemo(() => {
    const map = Object.fromEntries(users.map(u => [u.id, u.full_name]))
    return (ex: AccessException) => ex.user_name || map[ex.user_id] || '—'
  }, [users])

  async function create() {
    if (!userId) { toast.error('Select User'); return }
    if (!reason.trim()) { toast.error('Reason is required'); return }
    if (entityType === 'org_unit' && !unitId) { toast.error('Select Department'); return }
    setSaving(true)
    const u = users.find(x => x.id === userId)
    const unit = units.find(x => x.id === unitId)
    const res = await db.createAccessException({
      user_id: userId,
      user_name: u?.full_name,
      entity_type: entityType,
      entity_id: entityType === 'org_unit' ? unitId : null,
      entity_label: entityType === 'org_unit' ? unit?.name : entLabel(entityType),
      permission,
      reason: reason.trim(),
      starts_at: startsAt || new Date().toISOString().slice(0, 10),
      expires_at: expiresAt || null,
    }).catch(() => null)
    setSaving(false)
    if (!res) { toast.error('Access not created'); return }
    toast.success('Access Granted')
    setShowForm(false); setUserId(''); setReason(''); setExpiresAt('')
    reload()
  }

  async function revoke(id: string) {
    await db.revokeAccessException(id)
    toast.success('Access revoked')
    setItems(prev => prev.map(e => (e.id === id ? { ...e, revoked: true } : e)))
  }

  if (permLoading) return <div className="card p-6 flex items-center gap-2 text-sm" style={{ color: 'var(--muted-fg)' }}><Loader2 className="w-4 h-4 animate-spin" /> Yüklənir…</div>
  if (!isSuperAdmin) {
    return (
      <div className="card p-8 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--muted)' }}><Lock className="w-5 h-5" style={{ color: 'var(--muted-fg)' }} /></div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Giriş məhduddur</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>Xüsusi icazələr yalnız Super Admin üçündür.</p>
        </div>
      </div>
    )
  }

  const inputSty = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Xüsusi icazələr</h3>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600">
          <Plus className="w-3.5 h-3.5" /> Yeni icazə
        </button>
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--muted-fg)' }}>İerarxiyadan kənar müvəqqəti giriş. Bitmə tarixi keçəndə avtomatik passiv olur.</p>

      {showForm && (
        <div className="rounded-xl p-4 mb-5 space-y-3" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>İstifadəçi</label>
              <select value={userId} onChange={e => setUserId(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputSty}>
                <option value="">— Seçin —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>İcazə növü</label>
              <select value={permission} onChange={e => setPermission(e.target.value as AccessPermission)} className={`${fieldCls} cursor-pointer`} style={inputSty}>
                {(['view', 'edit', 'approve'] as AccessPermission[]).map(p => <option key={p} value={p}>{PERM_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Hədəf</label>
              <select value={entityType} onChange={e => setEntityType(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputSty}>
                {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {entityType === 'org_unit' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Bölmə</label>
                <select value={unitId} onChange={e => setUnitId(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputSty}>
                  <option value="">— Seçin —</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Başlanğıc</label>
              <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={fieldCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Bitmə (müddət)</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={fieldCls} style={inputSty} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Səbəb <span className="text-red-400">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Why is this access granted…" className={`${fieldCls} resize-none`} style={inputSty} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Ləğv et</button>
            <button onClick={create} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} İcazə ver
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['User', 'Target', 'Permission', 'Reason', 'Duration', 'Status', ''].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Yüklənir…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Hələ xüsusi icazə yoxdur</td></tr>
            ) : items.map(ex => {
              const st = statusOf(ex)
              const canRevoke = !ex.revoked && isExceptionActive(ex)
              return (
                <tr key={ex.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-3 py-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{userName(ex)}</td>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--foreground)' }}>{ex.entity_label ?? entLabel(ex.entity_type)}</td>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--muted-fg)' }}>{PERM_LABEL[ex.permission]}</td>
                  <td className="px-3 py-3 text-xs max-w-[220px] truncate" style={{ color: 'var(--muted-fg)' }} title={ex.reason}>{ex.reason}</td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{fmt(ex.starts_at)} — {fmt(ex.expires_at)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `rgba(${st.rgb},0.14)`, color: `rgb(${st.rgb})` }}>{st.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    {canRevoke && (
                      <button onClick={() => revoke(ex.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:bg-red-500/10"
                        style={{ borderColor: 'rgba(225,29,72,0.3)', color: '#f43f5e' }}>
                        <Ban className="w-3.5 h-3.5" /> İcazəni ləğv et
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
