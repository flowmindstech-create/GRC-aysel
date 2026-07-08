'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import type { UserProfile, UserRole } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'
import { ROLE_ORDER, ROLE_LABEL, ROLE_LEVEL } from '@/lib/permissions'
import { ShieldCheck, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Yalnız super_admin görür. Rolları təyin edir.
// DB tərəfdə guard_role_change trigger-i + one_super_admin_per_org index qoruyur (phase45).
export function UserManagementPanel() {
  const { profile: me, isSuperAdmin, loading: permLoading } = usePermissions()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    db.getProfiles()
      .then(setUsers)
      .catch(() => toast.error('İstifadəçilər yüklənmədi'))
      .finally(() => setLoading(false))
  }, [])

  const hasSuperAdmin = users.some(u => u.role === 'super_admin')

  async function changeRole(user: UserProfile, role: UserRole) {
    if (role === user.role) return
    setSavingId(user.id)
    const res = await db.updateProfileRole(user.id, role)
    setSavingId(null)
    if (!res.ok) {
      toast.error(res.error?.includes('one_super_admin') ? 'Yalnız bir super_admin ola bilər' : (res.error ?? 'Rol dəyişmədi'))
      return
    }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u))
    toast.success(`${user.full_name} → ${ROLE_LABEL[role]}`)
  }

  if (permLoading) return <div className="card p-6 flex items-center gap-2 text-sm" style={{ color: 'var(--muted-fg)' }}><Loader2 className="w-4 h-4 animate-spin" /> Yüklənir…</div>

  // Super_admin olmayan hər kəs üçün qapalı
  if (!isSuperAdmin) {
    return (
      <div className="card p-8 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
          <Lock className="w-5 h-5" style={{ color: 'var(--muted-fg)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Giriş məhduddur</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>İstifadəçi idarəsi yalnız Super Admin üçündür.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>İstifadəçi İdarəsi</h3>
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--muted-fg)' }}>
        Rol təyin et. Yüksək rütbə çox icazə deməkdir. Super Admin yeganədir — silmə və istifadəçi idarəsi yalnız ona aiddir.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['İstifadəçi', 'Rütbə', 'Rol'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-10 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Yüklənir…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={3} className="py-10 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>İstifadəçi yoxdur</td></tr>
            ) : users.map(u => {
              const isMe = u.id === me?.id
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--brand-500)' }}>
                        {(u.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {u.full_name}{isMe && <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>sən</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{ROLE_LEVEL[u.role] ?? 0}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        disabled={savingId === u.id || isMe}
                        onChange={e => changeRole(u, e.target.value as UserRole)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                        title={isMe ? 'Öz rolunu dəyişə bilməzsən' : undefined}
                      >
                        {ROLE_ORDER.map(r => (
                          <option
                            key={r}
                            value={r}
                            // super_admin seçimi: yalnız mövcud super_admin yoxdursa və ya bu elə odursa
                            disabled={r === 'super_admin' && hasSuperAdmin && u.role !== 'super_admin'}
                          >
                            {ROLE_LABEL[r]} ({ROLE_LEVEL[r]})
                          </option>
                        ))}
                      </select>
                      {savingId === u.id && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--muted-fg)' }} />}
                    </div>
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
