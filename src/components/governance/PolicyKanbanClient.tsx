'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { dbExt } from '@/lib/db-extensions'
import type { Policy, PolicyStatus } from '@/types'
import { cn } from '@/lib/utils'
import {
  BookOpen, Plus, Search, FileText, CheckCircle2,
  Clock, AlertCircle, RefreshCw, Send, ShieldAlert
} from 'lucide-react'

const COLUMNS: { id: PolicyStatus; label: string; color: string; border: string }[] = [
  { id: 'draft', label: 'Draft', color: 'text-slate-400 bg-slate-400/5', border: 'border-slate-500/20' },
  { id: 'in_review', label: 'In Review', color: 'text-sky-400 bg-sky-400/5', border: 'border-sky-500/20' },
  { id: 'committee_review', label: 'Committee Review', color: 'text-amber-400 bg-amber-400/5', border: 'border-amber-500/20' },
  { id: 'approved', label: 'Approved', color: 'text-green-400 bg-green-400/5', border: 'border-green-500/20' },
  { id: 'published', label: 'Published', color: 'text-indigo-400 bg-indigo-400/5', border: 'border-indigo-500/20' }
]

export function PolicyKanbanClient() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newPolicy, setNewPolicy] = useState({
    policy_id: '',
    title: '',
    description: '',
    category: 'information_security' as const,
    version: '1.0',
    owner_dept: '',
    body: ''
  })

  useEffect(() => {
    dbExt.getPolicies().then(data => {
      setPolicies(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return policies.filter(p =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.policy_id.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    )
  }, [policies, search])

  async function handleAdd() {
    if (!newPolicy.policy_id || !newPolicy.title) return
    const policy: Policy = {
      id: crypto.randomUUID(),
      org_id: '00000000-0000-0000-0000-000000000001',
      status: 'draft',
      linked_control_ids: [],
      linked_requirement_ids: [],
      change_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newPolicy
    }
    const saved = await dbExt.savePolicy(policy)
    setPolicies(prev => [saved, ...prev])
    setShowAdd(false)
    setNewPolicy({
      policy_id: '',
      title: '',
      description: '',
      category: 'information_security',
      version: '1.0',
      owner_dept: '',
      body: ''
    })
  }

  async function handleMove(id: string, nextStatus: PolicyStatus) {
    const p = policies.find(x => x.id === id)
    if (!p) return
    const updated = { ...p, status: nextStatus, updated_at: new Date().toISOString() }
    const saved = await dbExt.savePolicy(updated)
    setPolicies(prev => prev.map(x => x.id === id ? saved : x))
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-card border rounded-xl px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search policies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-64"
            style={{ color: 'var(--foreground)' }}
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-4 h-4" /> Create Policy
        </button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading policies...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COLUMNS.map(col => {
            const items = filtered.filter(p => p.status === col.id)
            return (
              <div key={col.id} className="flex flex-col min-h-[500px] rounded-2xl bg-card/40 border p-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', 
                      col.id === 'draft' ? 'bg-slate-400' :
                      col.id === 'in_review' ? 'bg-sky-400' :
                      col.id === 'committee_review' ? 'bg-amber-400' :
                      col.id === 'approved' ? 'bg-green-400' : 'bg-indigo-400'
                    )} />
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{col.label}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{items.length}</span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {items.map(p => (
                    <div key={p.id} className="card p-3 space-y-3 relative group hover:border-sky-500/40 transition-all">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wide">{p.policy_id}</span>
                          <span className="text-[10px] text-muted-foreground">v{p.version}</span>
                        </div>
                        <h4 className="text-xs font-semibold mt-1" style={{ color: 'var(--foreground)' }}>{p.title}</h4>
                        {p.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                      </div>

                      {p.owner_dept && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <BookOpen className="w-3 h-3 text-muted-foreground/60" />
                          <span>{p.owner_dept}</span>
                        </div>
                      )}

                      {/* Moving buttons */}
                      <div className="flex items-center justify-end gap-1.5 border-t pt-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--border)' }}>
                        {col.id === 'draft' && (
                          <button
                            onClick={() => handleMove(p.id, 'in_review')}
                            className="flex items-center gap-1 text-[10px] font-medium text-sky-400 hover:text-sky-300"
                          >
                            Submit <Send className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {col.id === 'in_review' && (
                          <button
                            onClick={() => handleMove(p.id, 'committee_review')}
                            className="flex items-center gap-1 text-[10px] font-medium text-amber-400 hover:text-amber-300"
                          >
                            To Committee <ShieldAlert className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {col.id === 'committee_review' && (
                          <button
                            onClick={() => handleMove(p.id, 'approved')}
                            className="flex items-center gap-1 text-[10px] font-medium text-green-400 hover:text-green-300"
                          >
                            Approve <CheckCircle2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {col.id === 'approved' && (
                          <button
                            onClick={() => handleMove(p.id, 'published')}
                            className="flex items-center gap-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300"
                          >
                            Publish <BookOpen className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-28 border border-dashed rounded-xl" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] text-muted-foreground">No policies</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 bg-card" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Create Policy</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Policy Code *</label>
                <input
                  type="text"
                  placeholder="e.g. POL-2024-001"
                  value={newPolicy.policy_id}
                  onChange={e => setNewPolicy(prev => ({ ...prev, policy_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-muted border text-sm outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="Policy Title"
                  value={newPolicy.title}
                  onChange={e => setNewPolicy(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-muted border text-sm outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
                <textarea
                  placeholder="Brief description"
                  value={newPolicy.description}
                  onChange={e => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-muted border text-sm outline-none h-16 resize-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Category</label>
                  <select
                    value={newPolicy.category}
                    onChange={e => setNewPolicy(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-muted border text-sm outline-none cursor-pointer"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    <option value="information_security">InfoSec</option>
                    <option value="operational">Operational</option>
                    <option value="hr">HR</option>
                    <option value="financial">Financial</option>
                    <option value="compliance">Compliance</option>
                    <option value="risk">Risk</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. IT Security"
                    value={newPolicy.owner_dept}
                    onChange={e => setNewPolicy(prev => ({ ...prev, owner_dept: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-muted border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Policy Content / Body</label>
                <textarea
                  placeholder="Write the policy statement body content here..."
                  value={newPolicy.body}
                  onChange={e => setNewPolicy(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-muted border text-sm outline-none h-32 resize-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ color: 'var(--muted-fg)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newPolicy.policy_id || !newPolicy.title}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
