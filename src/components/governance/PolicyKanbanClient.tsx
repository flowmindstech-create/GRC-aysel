'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { dbExt } from '@/lib/db-extensions'
import { db } from '@/lib/db'
import type { Policy, PolicyStatus, PolicyCategory, PolicyApproval, ComplianceObligation } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, X, Clock, ArrowRight, CheckCircle2, Search, History, BookOpen, Link2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
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
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg hover:bg-sky-500/10 transition-all cursor-pointer"
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
  const [linkedReqs, setLinkedReqs] = useState<string[]>([])
  const [obligations, setObligations] = useState<ComplianceObligation[]>([])

  useEffect(() => {
    db.getObligations().then(setObligations)
  }, [])

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
      linked_control_ids: [],
      linked_requirement_ids: linkedReqs,
      change_history: [
        { version: '1.0', changed_by: 'Ali Hasanov', changed_at: now, summary: 'Siyasət yaradıldı.' }
      ],
      created_at: now, updated_at: now,
    }
    const saved = await dbExt.savePolicy(policy)
    onCreate(saved); setSaving(false); onClose()
  }

  const toggleReq = (id: string) => {
    setLinkedReqs(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>New Policy</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
          {[
            { label: 'Title *', val: title, set: setTitle, ph: 'e.g. Information Security Policy' },
            { label: 'Owner Department', val: dept, set: setDept, ph: 'e.g. IT Security' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted-fg)' }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted-fg)' }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as PolicyCategory)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
              {(['information_security','operational','hr','financial','compliance','risk','other'] as PolicyCategory[]).map(c => (
                <option key={c} value={c}>{c.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted-fg)' }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Brief summary…"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>

          {/* Linked obligations selection */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-fg)' }}>
              Link Compliance Obligations
            </label>
            <div className="max-h-36 overflow-y-auto border rounded-xl p-2 space-y-1" style={{ borderColor: 'var(--border)', background: 'var(--muted)/10' }}>
              {obligations.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic p-1">No obligations available</p>
              ) : (
                obligations.map(o => {
                  const active = linkedReqs.includes(o.id)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleReq(o.id)}
                      className={cn(
                        'w-full flex items-center justify-between text-left text-[11px] p-2 rounded-lg border transition-all',
                        active ? 'border-sky-500 bg-sky-500/10' : 'border-transparent hover:bg-white/5'
                      )}
                    >
                      <span className="font-medium truncate mr-2 flex-1" style={{ color: 'var(--foreground)' }}>
                        <span className="font-mono text-[10px] mr-1 text-slate-500">[{o.obligation_code}]</span>
                        {o.title}
                      </span>
                      {active && <span className="text-sky-400 font-bold shrink-0">✓</span>}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!title.trim() || saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
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
  const [tab, setTab] = useState<'details' | 'history'>('details')
  const [approvals, setApprovals] = useState<PolicyApproval[]>([])
  const [comment, setComment]     = useState('')
  const [linkedObligations, setLinkedObligations] = useState<ComplianceObligation[]>([])

  useEffect(() => {
    dbExt.getPolicyApprovals(policy.id).then(setApprovals)
    
    // Load linked obligations based on linked_requirement_ids[]
    if (policy.linked_requirement_ids && policy.linked_requirement_ids.length > 0) {
      db.getObligations().then(list => {
        const filtered = list.filter(o => policy.linked_requirement_ids.includes(o.id))
        setLinkedObligations(filtered)
      })
    } else {
      setLinkedObligations([])
    }
  }, [policy.id, policy.linked_requirement_ids])

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

    const nextStatus: PolicyStatus = action === 'approved' && NEXT_STATUS[policy.status]
      ? NEXT_STATUS[policy.status]! : 'draft'
    
    // Build version upgrade if published
    let nextVersion = policy.version
    const changeHist = [...(policy.change_history || [])]
    if (nextStatus === 'published') {
      const parts = policy.version.split('.')
      const major = parseInt(parts[0] || '1') + 1
      nextVersion = `${major}.0`
      changeHist.push({
        version: nextVersion,
        changed_by: 'Ali Hasanov',
        changed_at: new Date().toISOString(),
        summary: `Siyasət təsdiqləndi və nəşr edildi (${approval.comments || 'Yenilənmə'}).`
      })
    }

    const updated = { 
      ...policy, 
      status: nextStatus, 
      version: nextVersion,
      change_history: changeHist,
      updated_at: new Date().toISOString() 
    }
    const saved = await dbExt.savePolicy(updated)
    onUpdate(saved)
    toast.success(action === 'approved' ? `Advanced to ${nextStatus.replace('_', ' ')}` : 'Returned to Draft')
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-md border-l flex flex-col h-full shadow-2xl"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="text-[10px] font-mono" style={{ color: 'var(--muted-fg)' }}>{policy.policy_id}</p>
            <h2 className="text-sm font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>{policy.title}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 cursor-pointer">
            <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b text-xs font-semibold shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setTab('details')}
            className={cn('flex items-center gap-1.5 px-5 py-3 border-b-2 transition-all cursor-pointer',
              tab === 'details' ? 'text-orange-500 border-orange-500' : 'text-slate-400 border-transparent hover:text-slate-300'
            )}
          >
            <BookOpen className="w-3.5 h-3.5" /> Details
          </button>
          <button
            onClick={() => setTab('history')}
            className={cn('flex items-center gap-1.5 px-5 py-3 border-b-2 transition-all cursor-pointer',
              tab === 'history' ? 'text-orange-500 border-orange-500' : 'text-slate-400 border-transparent hover:text-slate-300'
            )}
          >
            <History className="w-3.5 h-3.5" /> Version History
          </button>
        </div>

        {/* Tab contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'details' && (
            <>
              {/* Fields Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { label: 'Status',    value: policy.status.replace(/_/g, ' ') },
                  { label: 'Version',   value: `v${policy.version}` },
                  { label: 'Category',  value: policy.category.replace('_', ' ') },
                  { label: 'Owner',     value: policy.owner_dept ?? '—' },
                  { label: 'Effective', value: policy.effective_date ? format(new Date(policy.effective_date), 'dd.MM.yyyy') : '—' },
                  { label: 'Review',    value: policy.review_date ? format(new Date(policy.review_date), 'dd.MM.yyyy') : '—' },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5 text-slate-400">{f.label}</p>
                    <p className="text-xs font-semibold capitalize" style={{ color: 'var(--foreground)' }}>{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              {policy.description && (
                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Description</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>{policy.description}</p>
                </div>
              )}

              {/* Linked Compliance Requirements (T-3.4) */}
              <div className="space-y-2 pt-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-sky-400" /> Linked Compliance Obligations
                </p>
                {linkedObligations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No linked obligations.</p>
                ) : (
                  <div className="space-y-2">
                    {linkedObligations.map(ob => (
                      <div key={ob.id} className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--muted)/10' }}>
                        <span className="font-semibold truncate mr-2" style={{ color: 'var(--foreground)' }}>
                          <span className="font-mono text-[10px] text-slate-400 mr-1">[{ob.obligation_code}]</span>
                          {ob.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] shrink-0 font-medium capitalize border border-sky-500/10 bg-sky-500/5 text-sky-400">
                          {ob.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approval actions if next status is possible */}
              {NEXT_STATUS[policy.status] && (
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Approval Action</p>
                  <textarea value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Add review comment (optional)…" rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAction('rejected')}
                      className="py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      style={{ background: 'rgba(225,29,72,0.1)', color: '#e11d48', border: '1px solid rgba(225,29,72,0.3)' }}>
                      Reject / Revision
                    </button>
                    <button onClick={() => handleAction('approved')}
                      className="py-2 rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors"
                      style={{ background: 'var(--brand-500)' }}>
                      Approve →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <div className="space-y-6">
              {/* Change/Version History (T-3.3) */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Change History (Versiyalar)</p>
                {!policy.change_history || policy.change_history.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Hər hansı versiya tarixçəsi yoxdur.</p>
                ) : (
                  <div className="space-y-3">
                    {policy.change_history.map((h, idx) => (
                      <div key={idx} className="relative pl-4 border-l" style={{ borderColor: 'var(--border)' }}>
                        <div className="absolute left-[-5px] top-[4px] w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sky-400 font-mono">v{h.version}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{format(new Date(h.changed_at), 'dd.MM.yyyy HH:mm')}</span>
                          </div>
                          <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Yenilədi: {h.changed_by}</p>
                          <p className="leading-relaxed mt-1" style={{ color: 'var(--foreground)' }}>{h.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approval Log */}
              <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Workflow Approval Log</p>
                {approvals.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Heç bir təsdiq jurnalı yoxdur.</p>
                ) : (
                  <div className="space-y-2">
                    {approvals.map(a => (
                      <div key={a.id} className="p-2.5 rounded-lg border text-xs"
                        style={{ 
                          borderColor: 'var(--border)', 
                          background: a.action === 'approved' ? 'rgba(5,150,105,0.06)' : a.action === 'rejected' ? 'rgba(225,29,72,0.06)' : 'var(--muted)' 
                        }}>
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className={cn('capitalize', 
                            a.action === 'approved' ? 'text-emerald-400' : a.action === 'rejected' ? 'text-red-400' : 'text-slate-300'
                          )}>
                            {a.action} ({a.stage.replace(/_/g, ' ')})
                          </span>
                          <span className="text-[9px] text-slate-500 font-normal">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {a.actor_name && <p className="text-[10px] text-slate-400">Actor: {a.actor_name}</p>}
                        {a.comments && <p className="text-[11px] mt-1 italic text-slate-300">"{a.comments}"</p>}
                      </div>
                    ))}
                  </div>
                )}
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
  
  // Search and Filter state (T-3.2)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<PolicyCategory | 'all'>('all')

  useEffect(() => {
    dbExt.getPolicies().then(p => { setPolicies(p); setLoading(false) })
  }, [])

  async function handleAdvance(id: string, next: PolicyStatus) {
    const policy = policies.find(p => p.id === id)
    if (!policy) return

    let nextVersion = policy.version
    const changeHist = [...(policy.change_history || [])]
    if (next === 'published') {
      const parts = policy.version.split('.')
      const major = parseInt(parts[0] || '1') + 1
      nextVersion = `${major}.0`
      changeHist.push({
        version: nextVersion,
        changed_by: 'Ali Hasanov',
        changed_at: new Date().toISOString(),
        summary: 'Siyasət yayınlandı.'
      })
    }

    const saved = await dbExt.savePolicy({ 
      ...policy, 
      status: next, 
      version: nextVersion,
      change_history: changeHist,
      updated_at: new Date().toISOString() 
    })
    
    setPolicies(prev => prev.map(p => p.id === saved.id ? saved : p))
    toast.success(`Advanced to ${next.replace(/_/g, ' ')}`)
  }

  function handleUpdate(updated: Policy) {
    setPolicies(prev => prev.map(p => p.id === updated.id ? updated : p))
    setSelected(updated)
  }

  // Filter policies based on Search & Category (T-3.2)
  const filteredPolicies = policies.filter(p => {
    const matchesSearch = (p.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
                         (p.policy_id ?? '').toLowerCase().includes(search.toLowerCase()) ||
                         (p.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

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
            className="card p-4 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,rgba(${s.rgb},0.7),transparent)` }} />
            <p className="text-2xl font-bold" style={{ color: `rgb(${s.rgb})` }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar with Search and Filter (T-3.2) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-md min-w-52"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <Search className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search policies…" aria-label="Search policies"
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: 'var(--foreground)' }} />
          </div>
          
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as PolicyCategory | 'all')}
            className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
            <option value="all" className="text-slate-800 bg-white dark:bg-slate-900">All Categories</option>
            <option value="information_security" className="text-slate-800 bg-white dark:bg-slate-900">Information Security</option>
            <option value="operational" className="text-slate-800 bg-white dark:bg-slate-900">Operational</option>
            <option value="hr" className="text-slate-800 bg-white dark:bg-slate-900">HR</option>
            <option value="financial" className="text-slate-800 bg-white dark:bg-slate-900">Financial</option>
            <option value="compliance" className="text-slate-800 bg-white dark:bg-slate-900">Compliance</option>
            <option value="risk" className="text-slate-800 bg-white dark:bg-slate-900">Risk</option>
            <option value="other" className="text-slate-800 bg-white dark:bg-slate-900">Other</option>
          </select>
        </div>
        
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer shadow-lg shadow-sky-500/20"
          style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-fg)' }}>Loading…</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colPolicies = filteredPolicies.filter(p => p.status === col.status)
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
