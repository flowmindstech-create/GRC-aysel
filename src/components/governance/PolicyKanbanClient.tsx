'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { dbExt } from '@/lib/db-extensions'
import type { Policy, PolicyStatus, PolicyCategory, PolicyApproval } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, X, Clock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

const COLUMNS: { status: PolicyStatus; label: string; rgb: string }[] = [
  { status: 'draft',             label: 'Draft',            rgb: '100,116,139' },
  { status: 'in_review',        label: 'In Review',        rgb: '59,130,246'  },
  { status: 'committee_review', label: 'Committee Review', rgb: '168,85,247'  },
  { status: 'approved',         label: 'Approved',         rgb: '14,165,233'  },
  { status: 'published',        label: 'Published',        rgb: '5,150,105'   },
]

const NEXT_STATUS: Partial<Record<PolicyStatus, PolicyStatus>> = {
  draft:            'in_review',
  in_review:        'committee_review',
  committee_review: 'approved',
  approved:         'published',
}

const CATEGORY_COLOR: Record<PolicyCategory, string> = {
  information_security: 'text-blue-400',
  operational:          'text-orange-400',
  hr:                   'text-pink-400',
  financial:            'text-yellow-400',
  compliance:           'text-purple-400',
  risk:                 'text-red-400',
  other:                'text-slate-400',
}

// ── Policy Card ───────────────────────────────────────────────────────────────

function PolicyCard({ policy, onAdvance, onClick }: {
  policy: Policy
  onAdvance: (id: string, next: PolicyStatus) => void
  onClick: () => void
}) {
  const next    = NEXT_STATUS[policy.status]
  const elapsed = formatDistanceToNow(new Date(policy.created_at), { addSuffix: true })

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="card p-3.5 cursor-pointer group" onClick={onClick}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-mono" style={{ color: 'var(--muted-fg)' }}>{policy.policy_id}</span>
            <span className={cn('text-[9px] font-semibold uppercase', CATEGORY_COLOR[policy.category])}>
              {policy.category.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs font-semibold leading-snug group-hover:text-sky-400 transition-colors"
            style={{ color: 'var(--foreground)' }}>{policy.title}</p>
        </div>
        <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded font-medium"
          style={{ background: 'rgba(14,165,233,0.1)', color: 'var(--brand-500)' }}>
          v{policy.version}
        </span>
      </div>
      {policy.owner_dept && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--muted-fg)' }}>{policy.owner_dept}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--muted-fg)' }}>
          <Clock className="w-2.5 h-2.5" />{elapsed}
        </span>
        {next ? (
          <button onClick={e => { e.stopPropagation(); onAdvance(policy.id, next) }}
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg hover:bg-sky-500/10 transition-all"
            style={{ color: 'var(--brand-500)' }}>
            Advance <ArrowRight className="w-3 h-3" />
          </button>
        ) : policy.status === 'published' ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : null}
      </div>
    </motion.div>
  )
}

// ── New Policy Dialog ─────────────────────────────────────────────────────────

function NewPolicyDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Policy) => void }) {
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState<PolicyCategory>('information_security')
  const [dept, setDept]         = useState('')
  const [desc, setDesc]         = useState('')
  const [saving, setSaving]     = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setSaving(true)
    const now = new Date().toISOString()
    const seq = String(Math.floor(Math.random() * 900) + 100)
    const policy: Policy = {
      id: crypto.randomUUID(), org_id: '00000000-0000-0000-0000-000000000001',
      policy_id: `POL-${new Date().getFullYear()}-${seq}`,
      title: title.trim(), description: desc.trim(), category,
      version: '1.0', status: 'draft', owner_dept: dept.trim(),
      linked_control_ids: [], linked_requirement_ids: [], change_history: [],
      created_at: now, updated_at: now,
    }
    const saved = await dbExt.savePolicy(policy)
    onCreate(saved); setSaving(false); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border shadow-2xl"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>New Policy</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { label: 'Title *', val: title, set: setTitle, ph: 'e.g. Information Security Policy' },
            { label: 'Owner Department', val: dept, set: setDept, ph: 'e.g. IT Security' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as PolicyCategory)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
              {(['information_security','operational','hr','financial','compliance','risk','other'] as PolicyCategory[]).map(c => (
                <option key={c} value={c}>{c.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Brief summary…"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!title.trim() || saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--brand-500)' }}>
            {saving ? 'Creating…' : 'Create Policy'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Policy Detail Drawer ──────────────────────────────────────────────────────

function PolicyDetailDrawer({ policy, onClose, onUpdate }: { policy: Policy; onClose: () => void; onUpdate: (p: Policy) => void }) {
  const [approvals, setApprovals] = useState<PolicyApproval[]>([])
  const [comment, setComment]     = useState('')

  useEffect(() => {
    dbExt.getPolicyApprovals(policy.id).then(setApprovals)
  }, [policy.id])

  async function handleAction(action: 'approved' | 'rejected') {
    const stageMap: Partial<Record<PolicyStatus, PolicyApproval['stage']>> = {
      in_review: 'internal_review', committee_review: 'committee_review', approved: 'final_approval',
    }
    const approval: PolicyApproval = {
      id: crypto.randomUUID(), policy_id: policy.id, org_id: policy.org_id,
      stage: stageMap[policy.status] ?? 'internal_review',
      action, actor_name: 'Ali Hasanov', comments: comment.trim(),
      created_at: new Date().toISOString(),
    }
    await dbExt.addPolicyApproval(approval)
    setApprovals(prev => [...prev, approval])
    setComment('')

    const newStatus: PolicyStatus = action === 'approved' && NEXT_STATUS[policy.status]
      ? NEXT_STATUS[policy.status]! : 'draft'
    const updated = { ...policy, status: newStatus, updated_at: new Date().toISOString() }
    const saved = await dbExt.savePolicy(updated)
    onUpdate(saved)
    toast.success(action === 'approved' ? `Advanced to ${newStatus.replace('_', ' ')}` : 'Returned to Draft')
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-md border-l flex flex-col overflow-y-auto"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="text-[10px] font-mono" style={{ color: 'var(--muted-fg)' }}>{policy.policy_id}</p>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{policy.title}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          </button>
        </div>
        <div className="flex-1 p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Status',    value: policy.status.replace(/_/g, ' ') },
              { label: 'Version',   value: `v${policy.version}` },
              { label: 'Category',  value: policy.category.replace('_', ' ') },
              { label: 'Owner',     value: policy.owner_dept ?? '—' },
              { label: 'Effective', value: policy.effective_date ?? '—' },
              { label: 'Review',    value: policy.review_date ?? '—' },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>{f.label}</p>
                <p className="text-xs font-medium capitalize" style={{ color: 'var(--foreground)' }}>{f.value}</p>
              </div>
            ))}
          </div>
          {policy.description && (
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>Description</p>
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{policy.description}</p>
            </div>
          )}
          {approvals.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>Approval History</p>
              <div className="space-y-2">
                {approvals.map(a => (
                  <div key={a.id} className="p-2.5 rounded-lg"
                    style={{ background: a.action === 'approved' ? 'rgba(5,150,105,0.08)' : a.action === 'rejected' ? 'rgba(225,29,72,0.08)' : 'var(--muted)' }}>
                    <p className="text-[10px] font-semibold capitalize" style={{ color: 'var(--foreground)' }}>
                      {a.action.replace('_', ' ')} — {a.stage.replace('_', ' ')}
                    </p>
                    {a.actor_name && <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>by {a.actor_name}</p>}
                    {a.comments && <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--muted-fg)' }}>"{a.comments}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {NEXT_STATUS[policy.status] && (
            <div className="space-y-3">
              <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>Approval Action</p>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Add review comment (optional)…" rows={2}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleAction('rejected')}
                  className="py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(225,29,72,0.1)', color: '#e11d48', border: '1px solid rgba(225,29,72,0.3)' }}>
                  Reject
                </button>
                <button onClick={() => handleAction('approved')}
                  className="py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: 'var(--brand-500)' }}>
                  Approve →
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function PolicyKanbanClient() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Policy | null>(null)

  useEffect(() => {
    dbExt.getPolicies().then(p => { setPolicies(p); setLoading(false) })
  }, [])

  async function handleAdvance(id: string, next: PolicyStatus) {
    const policy = policies.find(p => p.id === id)
    if (!policy) return
    const saved = await dbExt.savePolicy({ ...policy, status: next, updated_at: new Date().toISOString() })
    setPolicies(prev => prev.map(p => p.id === saved.id ? saved : p))
    toast.success(`Advanced to ${next.replace(/_/g, ' ')}`)
  }

  function handleUpdate(updated: Policy) {
    setPolicies(prev => prev.map(p => p.id === updated.id ? updated : p))
    setSelected(updated)
  }

  const stats = {
    total:     policies.length,
    published: policies.filter(p => p.status === 'published').length,
    pending:   policies.filter(p => ['in_review','committee_review'].includes(p.status)).length,
    draft:     policies.filter(p => p.status === 'draft').length,
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Policies', value: stats.total,     rgb: '14,165,233' },
          { label: 'Published',      value: stats.published, rgb: '5,150,105'  },
          { label: 'Pending Review', value: stats.pending,   rgb: '217,119,6'  },
          { label: 'In Draft',       value: stats.draft,     rgb: '100,116,139'},
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card p-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,rgba(${s.rgb},0.7),transparent)` }} />
            <p className="text-2xl font-bold" style={{ color: `rgb(${s.rgb})` }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-fg)' }}>Loading…</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colPolicies = policies.filter(p => p.status === col.status)
            return (
              <div key={col.status} className="flex-shrink-0 w-60">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: `rgb(${col.rgb})` }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{col.label}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `rgba(${col.rgb},0.15)`, color: `rgb(${col.rgb})` }}>
                    {colPolicies.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-20">
                  <AnimatePresence>
                    {colPolicies.length === 0 ? (
                      <div className="text-center py-6 rounded-xl border border-dashed text-[10px]"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>Empty</div>
                    ) : colPolicies.map(p => (
                      <PolicyCard key={p.id} policy={p} onAdvance={handleAdvance} onClick={() => setSelected(p)} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <NewPolicyDialog onClose={() => setShowForm(false)} onCreate={p => setPolicies(prev => [p, ...prev])} />}
      <AnimatePresence>
        {selected && <PolicyDetailDrawer policy={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
      </AnimatePresence>
    </div>
  )
}
