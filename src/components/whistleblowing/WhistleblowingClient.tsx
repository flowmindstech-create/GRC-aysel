'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { encryptBody, decryptBody } from '@/lib/whistleblow-crypto'
import type { WhistleblowReport, WhistleblowStatus } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Lock, Unlock, Eye, Trash2, ShieldAlert, X, KeyRound } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const STATUS: Record<WhistleblowStatus, { label: string; cls: string }> = {
  new:           { label: 'New',           cls: 'bg-blue-500/15 text-blue-400' },
  under_review:  { label: 'Under Review',  cls: 'bg-amber-500/15 text-amber-400' },
  substantiated: { label: 'Substantiated', cls: 'bg-red-500/15 text-red-400' },
  dismissed:     { label: 'Dismissed',     cls: 'bg-zinc-500/15 text-zinc-400' },
  closed:        { label: 'Closed',        cls: 'bg-emerald-500/15 text-emerald-400' },
}
const ALL_STATUS = Object.keys(STATUS) as WhistleblowStatus[]

function ReportDialog({ code, onClose, onSave }: { code: string; onClose: () => void; onSave: (subject: string, body: string) => Promise<void> }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-md rounded-2xl border shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>New Whistleblowing Report</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={async e => { e.preventDefault(); if (!body.trim()) return; setLoading(true); await onSave(subject.trim(), body.trim()); setLoading(false) }} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Subject (metadata, visible to team)</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Procurement concern" className={fieldCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Complaint Body <span className="text-red-400">*</span></label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Confidential details — encrypted with the access code…" className={`${fieldCls} resize-none`} style={inputStyle} required />
              <p className="text-[10px] mt-1 text-emerald-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Şifrələnir — yalnız kodu bilən görə bilər</p>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-black/[0.04]" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={!body.trim() || loading} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                <Plus className="w-3.5 h-3.5" /> {loading ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function WhistleblowingClient() {
  const [reports, setReports] = useState<WhistleblowReport[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState<string | null>(null) // session officer code (never stored)
  const [codeInput, setCodeInput] = useState('')
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)

  async function reload() { setReports(await db.getWhistleblowReports()); setLoading(false) }
  useEffect(() => { reload() }, [])

  async function handleUnlock() {
    if (!codeInput.trim()) return
    // Verify by trying to decrypt the first encrypted report (if any)
    const sample = reports.find(r => r.body_cipher && r.body_iv)
    if (sample) {
      try { await decryptBody(codeInput, sample.body_iv!, sample.body_cipher!) }
      catch { toast.error('Kod yanlışdır'); return }
    }
    setCode(codeInput); setCodeInput(''); toast.success('Kilid açıldı')
  }

  async function reveal(r: WhistleblowReport) {
    if (!code || !r.body_cipher || !r.body_iv) return
    try {
      const text = await decryptBody(code, r.body_iv, r.body_cipher)
      setRevealed(prev => ({ ...prev, [r.id]: text }))
    } catch { toast.error('Açıla bilmədi — kod yanlış ola bilər') }
  }

  async function handleSave(subject: string, body: string) {
    if (!code) return
    const { iv, cipher } = await encryptBody(code, body)
    const now = new Date().toISOString()
    await db.saveWhistleblowReport({
      id: crypto.randomUUID(), org_id: '', code: '', source: 'manual',
      subject: subject || undefined, body_iv: iv, body_cipher: cipher, status: 'new',
      received_at: now, created_at: now, updated_at: now,
    })
    setShowForm(false); reload(); toast.success('Report saved (encrypted)')
  }

  async function changeStatus(r: WhistleblowReport, status: WhistleblowStatus) {
    await db.saveWhistleblowReport({ ...r, status }); reload()
  }
  async function handleDelete(id: string) { await db.deleteWhistleblowReport(id); reload(); toast.success('Deleted') }

  return (
    <div className="space-y-5">
      {/* Unlock bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <ShieldAlert className="w-5 h-5" style={{ color: 'var(--brand-500)' }} />
        <div className="flex-1 min-w-52">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Confidential channel</p>
          <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>Şikayət məzmunu şifrələnir — görmək üçün officer kodu lazımdır (admin də kodsuz görə bilməz).</p>
        </div>
        {code ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400">
            <Unlock className="w-3.5 h-3.5" /> Açıqdır
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
              <KeyRound className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
              <input type="password" value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="Access code"
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                className="bg-transparent text-sm outline-none w-32" style={{ color: 'var(--foreground)' }} />
            </div>
            <button onClick={handleUnlock} className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--brand-500)' }}>Aç</button>
          </div>
        )}
        {code && (
          <button onClick={() => { setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
            <Plus className="w-4 h-4" /> New Report
          </button>
        )}
      </div>

      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Code', 'Source', 'Subject', 'Body', 'Status', 'Received', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : reports.length === 0 ? (<tr><td colSpan={7} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}><div className="flex flex-col items-center gap-2"><ShieldAlert className="w-8 h-8 opacity-30" /><p className="text-sm">No reports</p></div></td></tr>)
          : reports.map((r, i) => (
            <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] align-top" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{r.code}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs capitalize" style={{ color: 'var(--muted-fg)' }}>{r.source}</span></td>
              <td className="px-3 py-3.5 max-w-[180px]"><span className="text-sm truncate block" style={{ color: 'var(--foreground)' }}>{r.subject || '—'}</span></td>
              <td className="px-3 py-3.5 max-w-xs">
                {revealed[r.id] ? (
                  <span className="text-xs whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>{revealed[r.id]}</span>
                ) : !r.body_cipher ? (
                  <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
                ) : code ? (
                  <button onClick={() => reveal(r)} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--brand-500)' }}><Eye className="w-3 h-3" /> Aç</button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--muted-fg)' }}><Lock className="w-3 h-3" /> Şifrəli</span>
                )}
              </td>
              <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                {code ? (
                  <select value={r.status} onChange={e => changeStatus(r, e.target.value as WhistleblowStatus)}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold outline-none cursor-pointer" style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    {ALL_STATUS.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                ) : (
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', (STATUS[r.status] ?? { cls: 'bg-zinc-500/15 text-zinc-400' }).cls)}>{(STATUS[r.status] ?? { label: String(r.status ?? '—') }).label}</span>
                )}
              </td>
              <td className="px-3 py-3.5"><span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{r.received_at ? format(new Date(r.received_at), 'd MMM yyyy') : '—'}</span></td>
              <td className="px-3 py-3.5">{code && (<button onClick={() => handleDelete(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table></div></div>

      {showForm && code && <ReportDialog code={code} onClose={() => setShowForm(false)} onSave={handleSave} />}
    </div>
  )
}
