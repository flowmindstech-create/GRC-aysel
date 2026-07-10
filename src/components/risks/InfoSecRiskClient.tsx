'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import { calculateInherentLevel } from '@/lib/rcsa'
import { inherentLevelWord, IMPACT_DOMAINS } from '@/lib/rcsa-methodology'
import { resolveOwnerFromUnit } from '@/lib/org'
import { RcsaDropdown } from '@/components/risks/RcsaDropdown'
import { ScoreChip } from '@/components/shared/ScoreChip'
import type { InfoSecRisk, Control, Process, OrgUnit, UserProfile } from '@/types'
import { Plus, Search, MoreHorizontal, Edit, Trash2, ShieldAlert, X, Save, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { ExportMenu } from '@/components/shared/ExportMenu'
import type { ExportColumn } from '@/lib/export'
import { usePermissions } from '@/hooks/usePermissions'
const maxImpactOf = (im?: Record<string, number>) => im ? Math.max(0, ...Object.values(im)) : 0

// Max of the entered impact dimension scores (defaults to 1 when nothing set)
function maxImpact(impacts?: Record<string, number>): number {
  const vals = Object.values(impacts ?? {}).filter(v => v >= 1)
  return vals.length ? Math.max(...vals) : 1
}

function InfoSecFormDialog({ item, controls, processes, departments, profiles, onClose, onSave }: {
  item: InfoSecRisk | null
  controls: Control[]
  processes: Process[]
  departments: OrgUnit[]
  profiles: UserProfile[]
  onClose: () => void
  onSave: (r: InfoSecRisk) => Promise<void>
}) {
  const isEdit = !!item
  const [process, setProcess] = useState(item?.process ?? '')
  const [asset, setAsset] = useState(item?.asset ?? '')
  const [threat, setThreat] = useState(item?.threat ?? '')
  const [vulnerability, setVulnerability] = useState(item?.vulnerability ?? '')
  const [description, setDescription] = useState(item?.risk_description ?? '')
  const [trigger, setTrigger] = useState(item?.risk_trigger ?? '')
  const [probability, setProbability] = useState(item?.probability ?? 3)
  const [impacts, setImpacts] = useState<Record<string, number>>(item?.impacts ?? {})
  const [controlId, setControlId] = useState(item?.current_control_id ?? '')
  const [resProb, setResProb] = useState(item?.residual_probability ?? 2)
  const [resImp, setResImp] = useState(item?.residual_impact ?? 2)
  const [treatment, setTreatment] = useState(item?.treatment_plan ?? '')
  const [mitigation, setMitigation] = useState(item?.mitigation_plan ?? '')
  // 🔒 Locked after creation — set once, then read-only on edit
  const [deadline, setDeadline] = useState(item?.deadline?.slice(0, 10) ?? '')
  const [respStructure, setRespStructure] = useState(item?.responsible_structure ?? '')
  const [respPerson, setRespPerson] = useState(item?.responsible_person ?? '')
  const [loading, setLoading] = useState(false)

  const mImp = maxImpact(impacts)
  const inherent = probability * mImp
  const level = calculateInherentLevel(probability, mImp)
  const residual = resProb * resImp
  const resLevel = calculateInherentLevel(resProb, resImp)

  // Responsible structure → auto owner (dept head), only when creating
  function handleStructure(deptName: string) {
    setRespStructure(deptName)
    const unit = departments.find(u => u.name === deptName)
    if (unit) setRespPerson(resolveOwnerFromUnit(unit, profiles).owner_name || '')
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const lockedStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--muted-fg)', opacity: 0.7, cursor: 'not-allowed' as const }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const labelCls = 'block text-xs font-medium mb-1.5'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!asset.trim() || !threat.trim() || !vulnerability.trim() || !description.trim()) {
      toast.error('Asset, Threat, Vulnerability və Risk Description məcburidir'); return
    }
    setLoading(true)
    const now = new Date().toISOString()
    await onSave({
      id: item?.id ?? crypto.randomUUID(),
      org_id: item?.org_id ?? '',
      code: item?.code ?? '',
      process: process.trim() || undefined,
      asset: asset.trim(), threat: threat.trim(), vulnerability: vulnerability.trim(),
      risk_description: description.trim(),
      risk_trigger: trigger.trim() || undefined,
      probability, impacts, inherent_score: inherent,
      current_control_id: controlId || undefined,
      residual_probability: resProb, residual_impact: resImp, residual_score: residual,
      treatment_plan: treatment.trim() || undefined,
      mitigation_plan: mitigation.trim() || undefined,
      // Locked fields: on edit keep original values, never overwrite
      deadline: isEdit ? item.deadline : (deadline || undefined),
      responsible_structure: isEdit ? item.responsible_structure : (respStructure || undefined),
      responsible_person: isEdit ? item.responsible_person : (respPerson || undefined),
      created_at: item?.created_at ?? now,
      updated_at: now,
    })
    setLoading(false)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[92vh] overflow-y-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? `Edit — ${item.code}` : 'New Information Security Risk'}</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            {/* Context */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Process</label>
                <select value={process} onChange={e => setProcess(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  <option value="">— Seçin —</option>
                  {processes.map(p => <option key={p.id} value={p.name}>{p.code} · {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Asset <span className="text-red-400">*</span></label>
                <input value={asset} onChange={e => setAsset(e.target.value)} placeholder="məs. Core Banking DB, AD server…" className={fieldCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Threat <span className="text-red-400">*</span></label>
                <input value={threat} onChange={e => setThreat(e.target.value)} placeholder="məs. Ransomware, data sızması…" className={fieldCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Vulnerability <span className="text-red-400">*</span></label>
                <input value={vulnerability} onChange={e => setVulnerability(e.target.value)} placeholder="məs. köhnəlmiş patch, zəif şifrələmə…" className={fieldCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Risk Description <span className="text-red-400">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Riskin ümumi təsviri…" className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Risk Trigger</label>
              <input value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="Riski aktivləşdirən hadisə…" className={fieldCls} style={inputStyle} />
            </div>

            {/* Probability + Impact per RCSA dimensions */}
            <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
              Qiymətləndirmə — Probability × Impact (kateqoriyalar üzrə, ən yüksəyi götürülür)
            </p>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Probability (1-5)</label>
              <select value={probability} onChange={e => setProbability(Number(e.target.value))} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {IMPACT_DOMAINS.map(d => (
                <RcsaDropdown key={d.key} label={d.label} value={impacts[d.key] ?? 1}
                  options={d.options} onChange={v => setImpacts(prev => ({ ...prev, [d.key]: v }))} />
              ))}
            </div>
            {/* Live inherent */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
              <ScoreChip score={inherent} level={level} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Inherent Risk: {inherentLevelWord(level)}</p>
                <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Max Impact: {mImp} · {probability} × {mImp} = {inherent} (avtomatik)</p>
              </div>
            </div>

            {/* Control + residual */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Current Control</label>
              <select value={controlId} onChange={e => setControlId(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— Yoxdur —</option>
                {controls.map(c => <option key={c.id} value={c.id}>{c.control_id} · {c.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Residual Probability (1-5)</label>
                <select value={resProb} onChange={e => setResProb(Number(e.target.value))} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Residual Impact (1-5)</label>
                <select value={resImp} onChange={e => setResImp(Number(e.target.value))} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
              <ScoreChip score={residual} level={resLevel} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Residual Risk: {inherentLevelWord(resLevel)}</p>
                <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{resProb} × {resImp} = {residual} (avtomatik)</p>
              </div>
            </div>

            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Risk Treatment Plan</label>
              <textarea value={treatment} onChange={e => setTreatment(e.target.value)} rows={2}
                placeholder="Mitigate / Accept / Transfer / Avoid + plan…" className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Mitigation Plan</label>
              <textarea value={mitigation} onChange={e => setMitigation(e.target.value)} rows={2}
                placeholder="Riskin azaldılması üçün fəaliyyət planı…" className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>

            {/* Locked management fields */}
            <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--brand-500)' }}>
                <Lock className="w-3.5 h-3.5" /> İdarəetmə sahələri {isEdit && '(dəyişdirilə bilməz)'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Deadline</label>
                  <input type="date" value={deadline} disabled={isEdit}
                    onChange={e => setDeadline(e.target.value)}
                    className={fieldCls} style={isEdit ? lockedStyle : { ...inputStyle, background: 'var(--card)' }} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Resp. Structure</label>
                  <select value={respStructure} disabled={isEdit} onChange={e => handleStructure(e.target.value)}
                    className={`${fieldCls} ${isEdit ? '' : 'cursor-pointer'}`} style={isEdit ? lockedStyle : { ...inputStyle, background: 'var(--card)' }}>
                    <option value="">— Seçin —</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Resp. Person</label>
                  <select value={respPerson} disabled={isEdit} onChange={e => setRespPerson(e.target.value)}
                    className={`${fieldCls} ${isEdit ? '' : 'cursor-pointer'}`} style={isEdit ? lockedStyle : { ...inputStyle, background: 'var(--card)' }}>
                    <option value="">— Seçin —</option>
                    {profiles.map(p => <option key={p.id} value={p.full_name}>{p.full_name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-black/[0.04]" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Register ──────────────────────────────────────────────────────────────────
export function InfoSecRiskClient() {
  const { can } = usePermissions()
  const [items, setItems] = useState<InfoSecRisk[]>([])
  const [controls, setControls] = useState<Control[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InfoSecRisk | null>(null)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const [r, c, p, units, people] = await Promise.all([
      dbExt.getInfoSecRisks(), db.getControls(), db.getProcesses(), db.getOrgUnits(), db.getProfiles(),
    ])
    setItems(r); setControls(c); setProcesses(p)
    setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    setProfiles(people); setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const ctrlById = useMemo(() => Object.fromEntries(controls.map(c => [c.id, c])), [controls])

  const filtered = items.filter(r =>
    !search
    || [r.code, r.asset, r.threat, r.vulnerability, r.risk_description, r.process]
      .some(v => (v ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const infosecExportColumns: ExportColumn<InfoSecRisk>[] = [
    { key: 'code', label: 'Code', value: r => r.code },
    { key: 'process', label: 'Process', value: r => r.process ?? '' },
    { key: 'asset', label: 'Asset', value: r => r.asset },
    { key: 'threat', label: 'Threat', value: r => r.threat },
    { key: 'vulnerability', label: 'Vulnerability', value: r => r.vulnerability },
    { key: 'risk_description', label: 'Risk Description', value: r => r.risk_description },
    { key: 'probability', label: 'Probability', value: r => r.probability ?? '' },
    { key: 'max_impact', label: 'Max Impact', value: r => maxImpactOf(r.impacts) || '' },
    { key: 'inherent_score', label: 'Inherent', value: r => r.inherent_score ?? '' },
    { key: 'current_control', label: 'Current Control', value: r => ctrlById[r.current_control_id ?? '']?.control_id ?? '' },
    { key: 'residual_score', label: 'Residual', value: r => r.residual_score ?? '' },
    { key: 'deadline', label: 'Deadline', value: r => r.deadline ? new Date(r.deadline).toLocaleDateString('az-AZ') : '' },
    { key: 'responsible_structure', label: 'Resp. Structure', value: r => r.responsible_structure ?? '' },
    { key: 'responsible_person', label: 'Resp. Person', value: r => r.responsible_person ?? '' },
  ]

  async function handleSave(r: InfoSecRisk) {
    await dbExt.saveInfoSecRisk(r)
    setShowForm(false); setEditItem(null); reload()
    toast.success(editItem ? 'Updated' : 'Created')
  }
  async function handleDelete(id: string) {
    await dbExt.deleteInfoSecRisk(id); setMenuOpen(null); reload(); toast.success('Deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search infosec risks…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <ExportMenu columns={infosecExportColumns} rows={filtered} filename="infosec-risk-register" title="InfoSec Risk Register" />
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New InfoSec Risk
        </button>
      </div>

      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Code', 'Process', 'Asset', 'Threat', 'Vulnerability', 'Risk Description', 'Probability', 'Max Impact', 'Inherent', 'Current Control', 'Residual', 'Deadline', 'Resp. Structure', 'Resp. Person', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={15} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={15} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
              <div className="flex flex-col items-center gap-2"><ShieldAlert className="w-8 h-8 opacity-30" /><p className="text-sm">Hələ infosec riski yoxdur</p></div>
            </td></tr>)
          : filtered.map((r, i) => {
            const mImp = maxImpact(r.impacts)
            const level = calculateInherentLevel(r.probability ?? 3, mImp)
            const resLevel = calculateInherentLevel(r.residual_probability ?? 2, r.residual_impact ?? 2)
            const ctrl = ctrlById[r.current_control_id ?? '']
            return (
            <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="group hover:bg-black/[0.02] align-top" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{r.code}</span></td>
              <td className="px-3 py-3.5 max-w-[130px]"><span className="text-xs line-clamp-2" style={{ color: r.process ? 'var(--foreground)' : 'var(--muted-fg)' }}>{r.process || '—'}</span></td>
              <td className="px-3 py-3.5 max-w-[130px]"><span className="text-xs font-medium line-clamp-2" style={{ color: 'var(--foreground)' }}>{r.asset}</span></td>
              <td className="px-3 py-3.5 max-w-[130px]"><span className="text-xs line-clamp-2" style={{ color: 'var(--foreground)' }}>{r.threat}</span></td>
              <td className="px-3 py-3.5 max-w-[130px]"><span className="text-xs line-clamp-2" style={{ color: 'var(--foreground)' }}>{r.vulnerability}</span></td>
              <td className="px-3 py-3.5 max-w-[190px]"><span className="text-xs line-clamp-2" style={{ color: 'var(--muted-fg)' }} title={r.risk_description}>{r.risk_description}</span></td>
              <td className="px-3 py-3.5 text-center"><span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{r.probability ?? '—'}</span></td>
              <td className="px-3 py-3.5 text-center"><span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{mImp}</span></td>
              <td className="px-3 py-3.5"><ScoreChip score={r.inherent_score ?? (r.probability ?? 3) * mImp} level={level} /></td>
              <td className="px-3 py-3.5">{ctrl
                ? <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/12 text-sky-500 whitespace-nowrap">{ctrl.control_id}</span>
                : <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>}</td>
              <td className="px-3 py-3.5"><ScoreChip score={r.residual_score ?? (r.residual_probability ?? 2) * (r.residual_impact ?? 2)} level={resLevel} /></td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: r.deadline ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                {r.deadline ? new Date(r.deadline).toLocaleDateString('az-AZ') : '—'}</span></td>
              <td className="px-3 py-3.5 max-w-[140px]"><span className="text-xs" style={{ color: r.responsible_structure ? 'var(--foreground)' : 'var(--muted-fg)' }}>{r.responsible_structure || '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: r.responsible_person ? 'var(--foreground)' : 'var(--muted-fg)' }}>{r.responsible_person || '—'}</span></td>
              <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                <div className="relative inline-block">
                  <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === r.id ? null : r.id) }} aria-label="Actions"
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors">
                    <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                  </button>
                  {menuOpen === r.id && (
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl z-50 border py-1" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditItem(r); setShowForm(true); setMenuOpen(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 text-left" style={{ color: 'var(--foreground)' }}>
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      {can('delete') && <button onClick={() => handleDelete(r.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-left text-red-500">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>}
                    </div>
                  )}
                </div>
              </td>
            </motion.tr>
            )
          })}
        </tbody>
      </table></div></div>

      {showForm && <InfoSecFormDialog key={editItem?.id ?? 'new'} item={editItem} controls={controls} processes={processes}
        departments={departments} profiles={profiles}
        onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />}
    </div>
  )
}
