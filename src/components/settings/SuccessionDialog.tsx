'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import type { UserProfile } from '@/types'
import { X, ArrowRightLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  fromUser: UserProfile
  users: UserProfile[]
  onClose: () => void
  onDone: () => void
}

// Vəzifə transferi (Succession) — köhnə şəxsin məsuliyyətlərini yeniyə köçürür.
export function SuccessionDialog({ fromUser, users, onClose, onDone }: Props) {
  const [toUserId, setToUserId] = useState('')
  const [preview, setPreview] = useState<{ risks: number; units: number; vendors: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const candidates = users.filter(u => u.id !== fromUser.id)

  useEffect(() => {
    db.previewTransfer(fromUser.id).then(setPreview).catch(() => setPreview({ risks: 0, units: 0, vendors: 0 }))
  }, [fromUser.id])

  async function submit() {
    if (!toUserId) { toast.error('Select new responsible person'); return }
    setSubmitting(true)
    const res = await db.transferOwnership(fromUser.id, toUserId)
    setSubmitting(false)
    if (!res.ok) { toast.error(res.error ?? 'Transfer failed'); return }
    const c = res.counts
    toast.success(`Transfer complete: ${c.risks} risks, ${c.units} divisions, ${c.vendors} vendors reassigned`)
    onDone()
  }

  const total = preview ? preview.risks + preview.units + preview.vendors : 0
  const toName = candidates.find(u => u.id === toUserId)?.full_name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Transfer role</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            All responsibilities of <strong style={{ color: 'var(--foreground)' }}>{fromUser.full_name}</strong> will be reassigned to the person you select.
          </p>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>New responsible person</label>
            <select value={toUserId} onChange={e => setToUserId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none cursor-pointer"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <option value="">— Select —</option>
              {candidates.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>

          {/* Xülasə */}
          <div className="rounded-xl p-4" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-fg)' }}>To be reassigned</p>
            {preview === null ? (
              <p className="text-xs flex items-center gap-2" style={{ color: 'var(--muted-fg)' }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> calculating…</p>
            ) : (
              <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--foreground)' }}>
                <span><strong>{preview.risks}</strong> risks</span>
                <span><strong>{preview.units}</strong> division heads</span>
                <span><strong>{preview.vendors}</strong> vendors</span>
              </div>
            )}
            {total === 0 && preview !== null && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--muted-fg)' }}>No objects are directly linked to this person — only the profile deactivation will apply.</p>
            )}
          </div>

          {/* Köhnə profilin taleyi — həmişə deaktivləşdirmə */}
          <div className="rounded-xl p-3" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Old profile will be deactivated</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
              They lose access immediately but stay in the audit trail. The profile row is kept on
              purpose: deleting it while the login still exists would recreate the account as a
              plain employee under the name it was registered with. To remove the person entirely,
              delete their user in Supabase → Authentication.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button>
          <button onClick={submit} disabled={submitting || !toUserId}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Transfer{toName ? ` → ${toName}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
