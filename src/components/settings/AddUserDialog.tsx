'use client'

import { useState } from 'react'
import { UserPlus, X, Loader2, Copy, Check, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_LABEL, ROLE_LEVEL } from '@/lib/permissions'
import type { UserRole } from '@/types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

// İlk mərhələ: Super Admin yalnız Risk Manager yarada bilər.
// Yeni rol açılanda həm burada, həm də /api/admin/users içindəki
// CREATABLE_ROLES ağ siyahısında əlavə olunmalıdır — server son sözü deyir.
const CREATABLE_ROLES: UserRole[] = ['risk_manager']

// Super Admin yeni hesab yaradır. Açıq qeydiyyat bağlıdır, hesablar yalnız buradan açılır.
export function AddUserDialog({ onClose, onCreated }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>(CREATABLE_ROLES[0])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit() {
    if (fullName.trim().length < 2) { toast.error('Enter the full name'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { toast.error('Enter a valid email'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), role }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.ok) {
        toast.error(body?.message ?? 'User could not be created')
        return
      }
      if (body.audit_logged === false) {
        toast.warning('User created, but the audit log entry failed')
      }
      setResult({ email: body.user.email, password: body.temp_password })
      onCreated()
    } catch {
      toast.error('Network error — user could not be created')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyCredentials() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(`Email: ${result.email}\nTemporary password: ${result.password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed — select the text manually')
    }
  }

  const inputStyle = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }
  const inputClass = 'w-full px-3 py-2.5 rounded-lg text-sm border outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {result ? 'Account created' : 'Add user'}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]">
            <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          </button>
        </div>

        {result ? (
          // ── Nəticə: parol YALNIZ bir dəfə göstərilir ───────────────────────
          <div className="px-6 py-5 space-y-4">
            <div className="flex gap-2.5 p-3 rounded-lg" style={{ background: 'var(--muted)' }}>
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-500)' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                This temporary password is shown <strong style={{ color: 'var(--foreground)' }}>once only</strong> and is
                stored nowhere. Copy it and hand it over securely. The user should change it after first sign-in.
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-2.5" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--muted-fg)' }}>Email</p>
                <p className="text-sm font-mono mt-0.5 break-all" style={{ color: 'var(--foreground)' }}>{result.email}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--muted-fg)' }}>Temporary password</p>
                <p className="text-base font-mono font-bold mt-0.5 tracking-wider" style={{ color: 'var(--foreground)' }}>{result.password}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={copyCredentials}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-colors hover:bg-black/[0.04]"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors">
                Done
              </button>
            </div>
          </div>
        ) : (
          // ── Form ───────────────────────────────────────────────────────────
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
              Public sign-up is closed. Accounts are created here by the Super Admin only.
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Ali Hasanov" className={inputClass} style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Work email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="ali@company.com" className={inputClass} style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value as UserRole)}
                className={`${inputClass} cursor-pointer`} style={inputStyle}>
                {CREATABLE_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]} ({ROLE_LEVEL[r]})</option>
                ))}
              </select>
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted-fg)' }}>
                Only Risk Manager can be created for now. Other roles are assigned from the list below after creation.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors hover:bg-black/[0.04]"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                Cancel
              </button>
              <button type="button" onClick={submit} disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-60 transition-colors">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
