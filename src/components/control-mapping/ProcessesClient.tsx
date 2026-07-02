'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import { resolveOwnerFromUnit } from '@/lib/org'
import type { Process, ProcessStatus, Control, OrgUnit, UserProfile, Policy, Risk, ComplianceObligation, ObligationCriticality, InternalDocument } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Workflow, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ProcessDetailSheet } from './ProcessDetailSheet'

const STATUS_CFG: Record<ProcessStatus, { label: string; cls: string }> = {
  active:   { label: 'Active',   cls: 'bg-emerald-500/15 text-emerald-400' },
  draft:    { label: 'Draft',    cls: 'bg-amber-500/15 text-amber-400' },
  archived: { label: 'Archived', cls: 'bg-zinc-500/15 text-zinc-400' },
}
const CRIT_CFG: Record<ObligationCriticality, { label: string; cls: string }> = {
  minimal:  { label: 'Minimal',  cls: 'bg-slate-500/15 text-slate-400' },
  low:      { label: 'Low',      cls: 'bg-emerald-500/15 text-emerald-400' },
  medium:   { label: 'Medium',   cls: 'bg-amber-500/15 text-amber-400' },
  high:     { label: 'High',     cls: 'bg-orange-500/15 text-orange-400' },
  critical: { label: 'Critical', cls: 'bg-red-500/15 text-red-400' },
}
type ProcessAutomation = 'manual' | 'automated' | 'hybrid'
export const AUTO_CFG: Record<ProcessAutomation, { label: string; cls: string }> = {
  manual:    { label: 'Manual',    cls: 'bg-zinc-500/15 text-zinc-400' },
  automated: { label: 'Automated', cls: 'bg-emerald-500/15 text-emerald-400' },
  hybrid:    { label: 'Hybrid',    cls: 'bg-sky-500/15 text-sky-400' },
}
// CMMI process maturity levels (phase 41)
type ProcessMaturity = 1 | 2 | 3 | 4 | 5
export const MATURITY_CFG: Record<ProcessMaturity, { label: string; cls: string }> = {
  1: { label: '1 — Initial',    cls: 'bg-zinc-500/15 text-zinc-400' },
  2: { label: '2 — Repeatable', cls: 'bg-amber-500/15 text-amber-400' },
  3: { label: '3 — Defined',    cls: 'bg-sky-500/15 text-sky-400' },
  4: { label: '4 — Managed',    cls: 'bg-blue-500/15 text-blue-400' },
  5: { label: '5 — Optimized',  cls: 'bg-emerald-500/15 text-emerald-400' },
}

interface SaveLinks { controlIds: string[]; policyIds: string[]; riskIds: string[]; obligationIds: string[]; documentIds: string[] }

function ProcessFormDialog({ process, controls, departments, profiles, policies, risks, obligations, documents, onClose, onSave }: {
  process: Process | null
  controls: Control[]
  departments: OrgUnit[]
  profiles: UserProfile[]
  policies: Policy[]
  risks: Risk[]
  obligations: ComplianceObligation[]
  documents: InternalDocument[]
  onClose: () => void
  onSave: (p: Process, links: SaveLinks) => Promise<void>
}) {
  const isEdit = !!process
  const [name, setName] = useState(process?.name ?? '')
  const [ownerDept, setOwnerDept] = useState(process?.owner_dept ?? '')
  const [ownerName, setOwnerName] = useState(process?.owner_name ?? '')
  const [ownerId, setOwnerId] = useState(process?.owner_id ?? '')
  const [status, setStatus] = useState<ProcessStatus>(process?.status ?? 'active')
  const [criticality, setCriticality] = useState<ObligationCriticality>(process?.criticality ?? 'medium')
  const [automation, setAutomation] = useState<ProcessAutomation>(process?.automation ?? 'manual')
  const [maturity, setMaturity] = useState<ProcessMaturity>(process?.maturity ?? 1)
  const [subProcesses, setSubProcesses] = useState<string[]>(process?.sub_processes ?? [])
  const [subProcessInput, setSubProcessInput] = useState('')
  const [participantDepts, setParticipantDepts] = useState<string[]>(process?.participant_depts ?? [])
  const [participantPeople, setParticipantPeople] = useState<string[]>(process?.participant_people ?? [])
  const [description, setDescription] = useState(process?.description ?? '')
  const [linkedControlIds, setLinkedCtrl] = useState<string[]>([])
  const [linkedPolicyIds, setLinkedPol] = useState<string[]>([])
  const [linkedRiskIds, setLinkedRisk] = useState<string[]>([])
  const [linkedObligationIds, setLinkedObl] = useState<string[]>([])
  const [linkedDocumentIds, setLinkedDoc] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (process?.id) {
        const [c, p, r, o, d] = await Promise.all([
          db.getProcessControlIds(process.id), db.getProcessPolicyIds(process.id),
          db.getProcessRiskIds(process.id), db.getProcessObligationIds(process.id),
          db.getProcessDocumentIds(process.id),
        ])
        if (!active) return
        setLinkedCtrl(c); setLinkedPol(p); setLinkedRisk(r); setLinkedObl(o); setLinkedDoc(d)
      }
    })()
    return () => { active = false }
  }, [process?.id])

  function addSubProcess() {
    const v = subProcessInput.trim()
    if (v && !subProcesses.includes(v)) setSubProcesses([...subProcesses, v])
    setSubProcessInput('')
  }

  // Owner dependency: dept selected → auto-fill owner person (head)
  function handleDeptChange(deptName: string) {
    setOwnerDept(deptName)
    const unit = departments.find(u => u.name === deptName)
    if (unit) {
      const resolved = resolveOwnerFromUnit(unit, profiles)
      setOwnerName(resolved.owner_name || '')
      setOwnerId(resolved.owner_id || '')
    } else { setOwnerName(''); setOwnerId('') }
  }

  const toggle = (list: string[], v: string, set: (x: string[]) => void) =>
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v])

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const labelCls = 'block text-xs font-medium mb-1.5'
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const now = new Date().toISOString()
    await onSave({
      id: process?.id ?? crypto.randomUUID(),
      org_id: process?.org_id ?? '',
      code: process?.code ?? '',
      name: name.trim(),
      owner_dept: ownerDept.trim() || undefined,
      owner_id: ownerId || undefined,
      owner_name: ownerName.trim() || undefined,
      status,
      criticality,
      automation,
      maturity,
      sub_processes: subProcesses,
      participant_depts: participantDepts,
      participant_people: participantPeople,
      description: description.trim() || undefined,
      created_at: process?.created_at ?? now,
      updated_at: now,
    }, { controlIds: linkedControlIds, policyIds: linkedPolicyIds, riskIds: linkedRiskIds, obligationIds: linkedObligationIds, documentIds: linkedDocumentIds })
    setLoading(false)
  }

  // Reusable dropdown+chips picker for participant structures / people
  const chipPicker = (label: string, options: string[], selected: string[], set: (x: string[]) => void, addLabel: string) => (
    <div>
      <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>{label}</label>
      <select value=""
        onChange={e => { const v = e.target.value; if (v && !selected.includes(v)) set([...selected, v]) }}
        className={`${fieldCls} cursor-pointer`} style={inputStyle}>
        <option value="">{addLabel}</option>
        {options.filter(o => !selected.includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(n => (
            <span key={n} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'var(--brand-500)', color: '#fff' }}>
              {n}
              <button type="button" aria-label={`${n} sil`}
                onClick={() => set(selected.filter(x => x !== n))}
                className="hover:opacity-80 font-bold leading-none">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )

  const multiBox = (label: string, hint: string, items: { id: string; code: string; title: string }[], selected: string[], set: (x: string[]) => void) => (
    <div>
      <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>{label}</label>
      {hint && <p className="text-[10px] mb-1.5" style={{ color: 'var(--muted-fg)' }}>{hint}</p>}
      <div className="rounded-lg border max-h-32 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
        {items.length === 0 ? (
          <p className="text-xs px-3 py-2" style={{ color: 'var(--muted-fg)' }}>None available.</p>
        ) : items.map(it => (
          <label key={it.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-white/5" style={{ color: 'var(--foreground)' }}>
            <input type="checkbox" checked={selected.includes(it.id)} onChange={() => toggle(selected, it.id, set)} />
            <span className="font-mono text-[10px]" style={{ color: 'var(--brand-500)' }}>{it.code}</span>
            <span className="truncate">{it.title}</span>
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }} className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Process' : 'New Business Process'}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{isEdit ? `Editing ${process.code}` : 'Code will be auto-generated (PRC-…)'}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <div className="h-0.5 mx-6" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Name <span className="text-red-400">*</span></label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Financial Payments / Procurement / Onboarding"
                className={fieldCls} style={inputStyle} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Owner Department</label>
                <select value={ownerDept} onChange={e => handleDeptChange(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  <option value="">— None —</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Owner (auto)</label>
                <input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Auto from department head" className={fieldCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as ProcessStatus)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(STATUS_CFG) as ProcessStatus[]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Criticality (Tier)</label>
                <select value={criticality} onChange={e => setCriticality(e.target.value as ObligationCriticality)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(CRIT_CFG) as ObligationCriticality[]).map(c => <option key={c} value={c}>{CRIT_CFG[c].label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Automation (avtomat / manual)</label>
                <select value={automation} onChange={e => setAutomation(e.target.value as ProcessAutomation)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(AUTO_CFG) as ProcessAutomation[]).map(a => <option key={a} value={a}>{AUTO_CFG[a].label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Maturity (yetkinlik)</label>
                <select value={maturity} onChange={e => setMaturity(Number(e.target.value) as ProcessMaturity)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {([1, 2, 3, 4, 5] as ProcessMaturity[]).map(m => <option key={m} value={m}>{MATURITY_CFG[m].label}</option>)}
                </select>
              </div>
            </div>
            {/* Sub-processes — free text + Enter → chips */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Alt proseslər</label>
              <div className="flex gap-2">
                <input value={subProcessInput} onChange={e => setSubProcessInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubProcess() } }}
                  placeholder="Alt proses yaz və Enter bas…" className={fieldCls} style={inputStyle} />
                <button type="button" onClick={addSubProcess} disabled={!subProcessInput.trim()}
                  className="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: 'var(--brand-500)' }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {subProcesses.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {subProcesses.map(sp => (
                    <span key={sp} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      {sp}
                      <button type="button" aria-label={`${sp} sil`}
                        onClick={() => setSubProcesses(subProcesses.filter(x => x !== sp))}
                        className="hover:opacity-80 font-bold leading-none text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {chipPicker('İştirakçı strukturlar', departments.map(d => d.name), participantDepts, setParticipantDepts, '— Struktur əlavə et —')}
            {chipPicker('İştirakçı şəxslər', profiles.map(p => p.full_name), participantPeople, setParticipantPeople, '— Şəxs əlavə et —')}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this process covers…"
                className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            {multiBox('Controls in this Process', 'Incidents on this process can only select from these controls.',
              controls.map(c => ({ id: c.id, code: c.control_id, title: c.title })), linkedControlIds, setLinkedCtrl)}
            {multiBox('Related Risks', '', risks.map(r => ({ id: r.id, code: r.risk_code ?? '—', title: r.title })), linkedRiskIds, setLinkedRisk)}
            {multiBox('Related Obligations', '', obligations.map(o => ({ id: o.id, code: o.obligation_code, title: o.title })), linkedObligationIds, setLinkedObl)}
            {multiBox('Related Policies', '', policies.map(p => ({ id: p.id, code: p.policy_id, title: p.title })), linkedPolicyIds, setLinkedPol)}
            {multiBox('Internal Documents (daxili sənədlər)', 'Mapping Matrix-də "Internal Policy" sütununda görünür.',
              documents.map(d => ({ id: d.id, code: d.doc_uid, title: d.name })), linkedDocumentIds, setLinkedDoc)}
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-white/5" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={!name.trim() || loading}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export function ProcessesClient() {
  const [processes, setProcesses] = useState<Process[]>([])
  const [controls, setControls] = useState<Control[]>([])
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [obligations, setObligations] = useState<ComplianceObligation[]>([])
  const [documents, setDocuments] = useState<InternalDocument[]>([])
  const [linkMaps, setLinkMaps] = useState<Record<string, { controlIds: string[]; riskIds: string[]; obligationIds: string[]; policyIds: string[]; documentIds: string[] }>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Process | null>(null)
  const [detailItem, setDetailItem] = useState<Process | null>(null)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const [data, maps, controlList, units, people, policyList, riskList, oblList, docList] = await Promise.all([
      db.getProcesses(), db.getProcessLinkMaps(), db.getControls(),
      db.getOrgUnits(), db.getProfiles(), dbExt.getPolicies(), db.getRisks(), db.getObligations(),
      dbExt.getInternalDocuments(),
    ])
    setProcesses(data)
    setLinkMaps(maps)
    setControls(controlList)
    setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    setProfiles(people)
    setPolicies(policyList)
    setRisks(riskList)
    setObligations(oblList)
    setDocuments(docList)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => processes.filter(p =>
    !search || (p.name ?? '').toLowerCase().includes(search.toLowerCase()) || (p.code ?? '').toLowerCase().includes(search.toLowerCase())
  ), [processes, search])

  // Code lookups for chips
  const ctrlById = useMemo(() => Object.fromEntries(controls.map(c => [c.id, c])), [controls])
  const riskById = useMemo(() => Object.fromEntries(risks.map(r => [r.id, r])), [risks])
  const oblById = useMemo(() => Object.fromEntries(obligations.map(o => [o.id, o])), [obligations])
  const polById = useMemo(() => Object.fromEntries(policies.map(p => [p.id, p])), [policies])
  const docById = useMemo(() => Object.fromEntries(documents.map(d => [d.id, d])), [documents])

  // Generic chip cell: up to 2 codes + "+N"
  function chipCell(codes: string[], cls: string) {
    if (codes.length === 0) return <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
    return (
      <span className="inline-flex flex-wrap gap-1">
        {codes.slice(0, 2).map(c => (
          <span key={c} className={cn('px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap', cls)}>{c}</span>
        ))}
        {codes.length > 2 && <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>+{codes.length - 2}</span>}
      </span>
    )
  }

  // Control effectiveness → status dot colour
  const ctrlDot = (s?: string) =>
    s === 'pass' ? '#34d399' : s === 'fail' ? '#f87171' : s === 'partial' ? '#fbbf24' : 'var(--muted-fg)'

  // Control chips with a status dot (Gemini-style)
  function controlChipCell(ids: string[]) {
    const items = ids.map(id => ctrlById[id]).filter(Boolean)
    if (items.length === 0) return <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
    return (
      <span className="inline-flex flex-wrap gap-1">
        {items.slice(0, 2).map(c => (
          <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap bg-sky-500/12 text-sky-400">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ctrlDot(c.status) }} />
            {c.control_id}
          </span>
        ))}
        {items.length > 2 && <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>+{items.length - 2}</span>}
      </span>
    )
  }

  // Policy chips with version (Gemini-style: POL-HR-01 v1.4)
  function policyChipCell(ids: string[]) {
    const items = ids.map(id => polById[id]).filter(Boolean)
    if (items.length === 0) return <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
    return (
      <span className="inline-flex flex-wrap gap-1">
        {items.slice(0, 2).map(p => (
          <span key={p.id} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap bg-indigo-500/12 text-indigo-400">
            {p.policy_id}{p.version ? ` v${p.version}` : ''}
          </span>
        ))}
        {items.length > 2 && <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>+{items.length - 2}</span>}
      </span>
    )
  }

  async function handleSave(item: Process, links: SaveLinks) {
    const saved = await db.saveProcess(item)
    await Promise.all([
      db.setProcessControls(saved.id, links.controlIds),
      db.setProcessPolicies(saved.id, links.policyIds),
      db.setProcessRisks(saved.id, links.riskIds),
      db.setProcessObligations(saved.id, links.obligationIds),
      db.setProcessDocuments(saved.id, links.documentIds),
    ])
    setShowForm(false); setEditItem(null)
    reload()
    toast.success(editItem ? 'Process updated' : 'Process created')
  }

  async function handleDelete(id: string) {
    await db.deleteProcess(id)
    setMenuOpen(null)
    reload()
    toast.success('Process deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search processes…" aria-label="Search processes"
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg"
          style={{ background: 'var(--brand-500)', boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }}>
          <Plus className="w-4 h-4" /> New Process
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Code', 'Name', 'Owner Dept', 'Automation', 'Maturity', 'Description', 'Associated Policy', 'Internal Policy', 'Controls', 'Risks', 'Obligations', 'Criticality', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={14} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
                  <div className="flex flex-col items-center gap-2"><Workflow className="w-8 h-8 opacity-30" /><p className="text-sm">No business processes yet</p><p className="text-xs opacity-60">Add a process and attach its controls</p></div>
                </td></tr>
              ) : (
                filtered.map((p, i) => {
                  const lm = linkMaps[p.id] ?? { controlIds: [], riskIds: [], obligationIds: [], policyIds: [], documentIds: [] }
                  const riskCodes = lm.riskIds.map(id => riskById[id]?.risk_code).filter(Boolean) as string[]
                  const oblCodes = lm.obligationIds.map(id => oblById[id]?.obligation_code).filter(Boolean) as string[]
                  const docCodes = (lm.documentIds ?? []).map(id => docById[id]?.doc_uid).filter(Boolean) as string[]
                  const st = STATUS_CFG[p.status ?? 'active']
                  const cr = CRIT_CFG[p.criticality ?? 'medium']
                  const au = AUTO_CFG[p.automation ?? 'manual']
                  const mt = MATURITY_CFG[(p.maturity ?? 1) as ProcessMaturity]
                  return (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setDetailItem(p)}
                    className="group cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{p.code}</span></td>
                    <td className="px-3 py-3.5 max-w-[180px]"><span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{p.name}</span></td>
                    <td className="px-3 py-3.5">
                      <span className="text-xs whitespace-nowrap" style={{ color: p.owner_dept ? 'var(--foreground)' : 'var(--muted-fg)' }}>{p.owner_dept || '—'}</span>
                      {p.owner_name && <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{p.owner_name}</p>}
                    </td>
                    <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', au.cls)}>{au.label}</span></td>
                    <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap', mt.cls)}>{mt.label}</span></td>
                    <td className="px-3 py-3.5 max-w-[220px]"><span className="text-xs line-clamp-2" style={{ color: p.description ? 'var(--muted-fg)' : 'var(--muted-fg)' }} title={p.description || undefined}>{p.description || '—'}</span></td>
                    <td className="px-3 py-3.5 max-w-[160px]">{policyChipCell(lm.policyIds)}</td>
                    <td className="px-3 py-3.5 max-w-[160px]">{chipCell(docCodes, 'bg-teal-500/12 text-teal-400')}</td>
                    <td className="px-3 py-3.5 max-w-[160px]">{controlChipCell(lm.controlIds)}</td>
                    <td className="px-3 py-3.5 max-w-[130px]">{chipCell(riskCodes, 'bg-rose-500/12 text-rose-400')}</td>
                    <td className="px-3 py-3.5 max-w-[150px]">{chipCell(oblCodes, 'bg-violet-500/12 text-violet-400')}</td>
                    <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', cr.cls)}>{cr.label}</span></td>
                    <td className="px-3 py-3.5"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', st.cls)}>{st.label}</span></td>
                    <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id) }} aria-label="Process actions"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                        </button>
                        {menuOpen === p.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl z-20 border py-1" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditItem(p); setShowForm(true); setMenuOpen(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-left" style={{ color: 'var(--foreground)' }}>
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-500">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ProcessFormDialog key={editItem?.id ?? 'new'} process={editItem} controls={controls} departments={departments}
          profiles={profiles} policies={policies} risks={risks} obligations={obligations} documents={documents}
          onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />
      )}

      {detailItem && (
        <ProcessDetailSheet
          process={detailItem}
          links={linkMaps[detailItem.id] ?? { controlIds: [], riskIds: [], obligationIds: [], policyIds: [], documentIds: [] }}
          ctrlById={ctrlById} riskById={riskById} oblById={oblById} polById={polById} docById={docById}
          onEdit={() => { setEditItem(detailItem); setDetailItem(null); setShowForm(true) }}
          onClose={() => setDetailItem(null)} />
      )}
    </div>
  )
}
