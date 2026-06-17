'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import type {
  RegulatoryChange, RegulatoryChangeStatus, ObligationSource, ComplianceObligation,
} from '@/types'

const SOURCES: ObligationSource[] = [
  'ISO 27001', 'GDPR', 'SOC 2', 'PCI DSS',
  'Local Regulation', 'Internal Policy', 'Contractual', 'Other',
]

const STATUSES: { value: RegulatoryChangeStatus; label: string }[] = [
  { value: 'new',              label: 'New' },
  { value: 'under_assessment', label: 'Under Assessment' },
  { value: 'implemented',      label: 'Implemented' },
  { value: 'closed',           label: 'Closed' },
]

interface Props {
  change: RegulatoryChange | null
  onClose: () => void
  onSave: (item: RegulatoryChange) => Promise<void>
  onSaved?: () => void
}

export function RegulatoryChangeFormDialog({ change, onClose, onSave, onSaved }: Props) {
  const isEdit = !!change

  const [title, setTitle]       = useState(change?.title ?? '')
  const [source, setSource]     = useState<ObligationSource>(change?.source ?? 'Local Regulation')
  const [regulator, setReg]     = useState(change?.regulator ?? '')
  const [changeDate, setDate]   = useState(change?.change_date ?? '')
  const [effectiveDate, setEffective] = useState(change?.effective_date ?? '')
  const [description, setDesc]  = useState(change?.description ?? '')
  const [impact, setImpact]     = useState(change?.impact_assessment ?? '')
  const [businessEffect, setBusinessEffect] = useState(change?.business_effect ?? '')
  const [assessor, setAssessor] = useState(change?.assessor ?? '')
  const [actionPlan, setActionPlan] = useState(change?.action_plan ?? '')
  const [respStructure, setRespStructure] = useState(change?.responsible_structure ?? '')
  const [respPerson, setRespPerson] = useState(change?.responsible_person ?? '')
  const [requirementLinkId, setRequirementLink] = useState(change?.requirement_link_id ?? '')
  const [status, setStatus]     = useState<RegulatoryChangeStatus>(change?.status ?? 'new')
  const [affected, setAffected] = useState<string[]>([])
  const [obligations, setObligations] = useState<ComplianceObligation[]>([])
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const list = await db.getObligations()
      if (!active) return
      setObligations(list)
      if (change?.id) {
        const ids = await db.getRegulatoryChangeObligationIds(change.id)
        if (!active) return
        setAffected(ids)
      }
    })()
    return () => { active = false }
  }, [change?.id])

  function toggle(id: string) {
    setAffected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (!effectiveDate || !businessEffect.trim()) return // effective date + business effect are mandatory
    setLoading(true)
    const now = new Date().toISOString()
    const item: RegulatoryChange = {
      id:                change?.id ?? crypto.randomUUID(),
      org_id:            change?.org_id ?? '',
      change_code:       change?.change_code ?? '',
      title:             title.trim(),
      source,
      regulator:         regulator.trim() || undefined,
      change_date:       changeDate || undefined,
      effective_date:    effectiveDate || undefined,
      description:       description.trim(),
      impact_assessment: impact.trim() || undefined,
      business_effect:   businessEffect.trim() || undefined,
      assessor:          assessor.trim() || undefined,
      action_plan:       actionPlan.trim() || undefined,
      responsible_structure: respStructure.trim() || undefined,
      responsible_person:    respPerson.trim() || undefined,
      requirement_link_id:   requirementLinkId || undefined,
      status,
      created_at:        change?.created_at ?? now,
      updated_at:        now,
    }
    await onSave(item)
    await db.setRegulatoryChangeObligations(item.id, affected)
    onSaved?.()
    setLoading(false)
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const labelCls = 'block text-xs font-medium mb-1.5'
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--brand-500)')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Regulatory Change' : 'New Regulatory Change'}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{isEdit ? `Editing ${change.change_code}` : 'Code will be auto-generated (RCM-…)'}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          <div className="h-0.5 mx-6" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Title <span className="text-red-400">*</span></label>
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Amendment to Data Protection Law, Art. 12"
                className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Source</label>
                <select value={source} onChange={e => setSource(e.target.value as ObligationSource)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as RegulatoryChangeStatus)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Regulator / Issuer</label>
                <input value={regulator} onChange={e => setReg(e.target.value)} placeholder="e.g. Central Bank"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Change Date</label>
                <input type="date" value={changeDate} onChange={e => setDate(e.target.value)}
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Effective Date <span className="text-red-400">*</span></label>
                <input type="date" value={effectiveDate} onChange={e => setEffective(e.target.value)}
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} required />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Assessor</label>
                <input value={assessor} onChange={e => setAssessor(e.target.value)} placeholder="Who evaluated the change"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Linked Requirement (obligation)</label>
              <select value={requirementLinkId} onChange={e => setRequirementLink(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— None —</option>
                {obligations.map(o => <option key={o.id} value={o.id}>{o.obligation_code} · {o.title}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Description</label>
              <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2}
                placeholder="What changed…" className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Impact Assessment / Gap Analysis</label>
              <textarea value={impact} onChange={e => setImpact(e.target.value)} rows={2}
                placeholder="Gap analysis and what must change…" className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Business Effect <span className="text-red-400">*</span></label>
              <textarea value={businessEffect} onChange={e => setBusinessEffect(e.target.value)} rows={2}
                placeholder="How it impacts business operations…" className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} required />
            </div>

            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Action Plan</label>
              <textarea value={actionPlan} onChange={e => setActionPlan(e.target.value)} rows={2}
                placeholder="Steps / tasks to take due to this change…" className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Responsible Structure</label>
                <input value={respStructure} onChange={e => setRespStructure(e.target.value)} placeholder="Department"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Responsible Person</label>
                <input value={respPerson} onChange={e => setRespPerson(e.target.value)} placeholder="Owner"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Affected Obligations</label>
              <div className="rounded-lg border max-h-36 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                {obligations.length === 0 ? (
                  <p className="text-xs px-3 py-2" style={{ color: 'var(--muted-fg)' }}>No obligations in the register yet.</p>
                ) : obligations.map(o => (
                  <label key={o.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-white/5" style={{ color: 'var(--foreground)' }}>
                    <input type="checkbox" checked={affected.includes(o.id)} onChange={() => toggle(o.id)} />
                    <span className="font-mono text-[10px]" style={{ color: 'var(--brand-500)' }}>{o.obligation_code}</span>
                    <span className="truncate">{o.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={!title.trim() || !effectiveDate || !businessEffect.trim() || loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
