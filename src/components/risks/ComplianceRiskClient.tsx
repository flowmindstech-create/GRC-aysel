'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import { calculateInherentLevel } from '@/lib/rcsa'
import { inherentLevelWord } from '@/lib/rcsa-methodology'
import { ScoreChip } from '@/components/shared/ScoreChip'
import type { ComplianceRisk, ComplianceObligation, Control } from '@/types'
import { Plus, Search, MoreHorizontal, Edit, Trash2, ScrollText, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ExportMenu } from '@/components/shared/ExportMenu'
import type { ExportColumn } from '@/lib/export'
import { usePermissions } from '@/hooks/usePermissions'

function RiskFormDialog({ item, obligations, controls, onClose, onSave }: {
  item: ComplianceRisk | null
  obligations: ComplianceObligation[]
  controls: Control[]
  onClose: () => void
  onSave: (r: ComplianceRisk) => Promise<void>
}) {
  const isEdit = !!item
  const [obligationId, setObligationId] = useState(item?.obligation_id ?? '')
  const [requirement, setRequirement] = useState(item?.requirement ?? '')
  const [description, setDescription] = useState(item?.risk_description ?? '')
  const [likelihood, setLikelihood] = useState(item?.likelihood ?? 3)
  const [impact, setImpact] = useState(item?.impact ?? 3)
  const [trigger, setTrigger] = useState(item?.risk_trigger ?? '')
  const [controlId, setControlId] = useState(item?.control_id ?? '')
  const [mitigation, setMitigation] = useState(item?.mitigation_plan ?? '')
  const [treatment, setTreatment] = useState(item?.treatment_plan ?? '')
  const [loading, setLoading] = useState(false)

  const inherent = likelihood * impact
  const level = calculateInherentLevel(likelihood, impact)

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const labelCls = 'block text-xs font-medium mb-1.5'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { toast.error('Risk description məcburidir'); return }
    setLoading(true)
    const now = new Date().toISOString()
    await onSave({
      id: item?.id ?? crypto.randomUUID(),
      org_id: item?.org_id ?? '',
      code: item?.code ?? '',
      obligation_id: obligationId || undefined,
      requirement: requirement.trim() || undefined,
      risk_description: description.trim(),
      likelihood, impact, inherent_score: inherent,
      risk_trigger: trigger.trim() || undefined,
      control_id: controlId || undefined,
      mitigation_plan: mitigation.trim() || undefined,
      treatment_plan: treatment.trim() || undefined,
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
          className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? `Edit — ${item.code}` : 'New Compliance Risk'}</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Requirement (Compliance Register)</label>
              <select value={obligationId} onChange={e => setObligationId(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— Seçin —</option>
                {obligations.map(o => <option key={o.id} value={o.id}>{o.obligation_code} · {o.title}</option>)}
              </select>
              {!obligationId && (
                <input value={requirement} onChange={e => setRequirement(e.target.value)} placeholder="və ya tələbi sərbəst yaz…"
                  className={`${fieldCls} mt-2`} style={inputStyle} />
              )}
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Risk Description <span className="text-red-400">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Tələb pozulsa hansı risk yaranır…" className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Likelihood (1-5)</label>
                <select value={likelihood} onChange={e => setLikelihood(Number(e.target.value))} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Impact (1-5)</label>
                <select value={impact} onChange={e => setImpact(Number(e.target.value))} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {/* Inherent risk — auto */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
              <ScoreChip score={inherent} level={level} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Inherent Risk: {inherentLevelWord(level)}</p>
                <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{likelihood} × {impact} = {inherent} (avtomatik)</p>
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Risk Trigger</label>
              <input value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="Riski aktivləşdirən hal/hadisə…" className={fieldCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Related Control</label>
              <select value={controlId} onChange={e => setControlId(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— Yoxdur —</option>
                {controls.map(c => <option key={c.id} value={c.id}>{c.control_id} · {c.title}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Mitigation Plan</label>
              <textarea value={mitigation} onChange={e => setMitigation(e.target.value)} rows={2}
                placeholder="Riskin azaldılması planı…" className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Risk Treatment Plan</label>
              <textarea value={treatment} onChange={e => setTreatment(e.target.value)} rows={2}
                placeholder="Riskin idarəedilməsi planı (mitigate / accept / transfer / avoid)…" className={`${fieldCls} resize-none`} style={inputStyle} />
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
export function ComplianceRiskClient() {
  const { can } = usePermissions()
  const [items, setItems] = useState<ComplianceRisk[]>([])
  const [obligations, setObligations] = useState<ComplianceObligation[]>([])
  const [controls, setControls] = useState<Control[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ComplianceRisk | null>(null)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function reload() {
    const [r, o, c] = await Promise.all([dbExt.getComplianceRisks(), db.getObligations(), db.getControls()])
    setItems(r); setObligations(o); setControls(c); setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const oblById = useMemo(() => Object.fromEntries(obligations.map(o => [o.id, o])), [obligations])
  const ctrlById = useMemo(() => Object.fromEntries(controls.map(c => [c.id, c])), [controls])

  const filtered = items.filter(r =>
    !search
    || (r.risk_description ?? '').toLowerCase().includes(search.toLowerCase())
    || (r.code ?? '').toLowerCase().includes(search.toLowerCase())
    || (oblById[r.obligation_id ?? '']?.title ?? r.requirement ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave(r: ComplianceRisk) {
    await dbExt.saveComplianceRisk(r)
    setShowForm(false); setEditItem(null); reload()
    toast.success(editItem ? 'Updated' : 'Created')
  }
  async function handleDelete(id: string) {
    await dbExt.deleteComplianceRisk(id); setMenuOpen(null); reload(); toast.success('Deleted')
  }

  const exportColumns: ExportColumn<ComplianceRisk>[] = [
    { key: 'code', label: 'Code', value: r => r.code },
    { key: 'requirement', label: 'Requirement', value: r => oblById[r.obligation_id ?? '']?.title ?? r.requirement ?? '' },
    { key: 'risk_description', label: 'Risk Description', value: r => r.risk_description },
    { key: 'likelihood', label: 'Likelihood', value: r => r.likelihood ?? '' },
    { key: 'impact', label: 'Impact', value: r => r.impact ?? '' },
    { key: 'inherent_score', label: 'Inherent Risk', value: r => r.inherent_score ?? (r.likelihood && r.impact ? r.likelihood * r.impact : '') },
    { key: 'risk_trigger', label: 'Risk Trigger', value: r => r.risk_trigger ?? '' },
    { key: 'control', label: 'Related Control', value: r => ctrlById[r.control_id ?? '']?.control_id ?? '' },
    { key: 'mitigation_plan', label: 'Mitigation Plan', value: r => r.mitigation_plan ?? '' },
    { key: 'treatment_plan', label: 'Treatment Plan', value: r => r.treatment_plan ?? '' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search compliance risks…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <ExportMenu columns={exportColumns} rows={filtered} filename="compliance-risk-register" title="Compliance Risk Register" />
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New Compliance Risk
        </button>
      </div>

      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Code', 'Requirement', 'Risk Description', 'Likelihood', 'Impact', 'Inherent Risk', 'Risk Trigger', 'Related Control', 'Mitigation Plan', 'Treatment Plan', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={11} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={11} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
              <div className="flex flex-col items-center gap-2"><ScrollText className="w-8 h-8 opacity-30" /><p className="text-sm">Hələ compliance riski yoxdur</p></div>
            </td></tr>)
          : filtered.map((r, i) => {
            const obl = oblById[r.obligation_id ?? '']
            const ctrl = ctrlById[r.control_id ?? '']
            const level = calculateInherentLevel(r.likelihood ?? 3, r.impact ?? 3)
            return (
            <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="group hover:bg-black/[0.02] align-top" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{r.code}</span></td>
              <td className="px-3 py-3.5 max-w-[190px]">
                {obl
                  ? <><span className="text-[10px] font-mono font-bold text-violet-500">{obl.obligation_code}</span><p className="text-xs line-clamp-2" style={{ color: 'var(--foreground)' }}>{obl.title}</p></>
                  : <span className="text-xs" style={{ color: r.requirement ? 'var(--foreground)' : 'var(--muted-fg)' }}>{r.requirement || '—'}</span>}
              </td>
              <td className="px-3 py-3.5 max-w-[220px]"><span className="text-xs line-clamp-2" style={{ color: 'var(--foreground)' }} title={r.risk_description}>{r.risk_description}</span></td>
              <td className="px-3 py-3.5 text-center"><span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{r.likelihood ?? '—'}</span></td>
              <td className="px-3 py-3.5 text-center"><span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{r.impact ?? '—'}</span></td>
              <td className="px-3 py-3.5"><div className="flex items-center gap-2"><ScoreChip score={r.inherent_score ?? (r.likelihood ?? 3) * (r.impact ?? 3)} level={level} /><span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{inherentLevelWord(level)}</span></div></td>
              <td className="px-3 py-3.5 max-w-[150px]"><span className="text-xs line-clamp-2" style={{ color: r.risk_trigger ? 'var(--muted-fg)' : 'var(--muted-fg)' }}>{r.risk_trigger || '—'}</span></td>
              <td className="px-3 py-3.5">{ctrl
                ? <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/12 text-sky-500 whitespace-nowrap">{ctrl.control_id}</span>
                : <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>}</td>
              <td className="px-3 py-3.5 max-w-[160px]"><span className="text-xs line-clamp-2" style={{ color: 'var(--muted-fg)' }}>{r.mitigation_plan || '—'}</span></td>
              <td className="px-3 py-3.5 max-w-[160px]"><span className="text-xs line-clamp-2" style={{ color: 'var(--muted-fg)' }}>{r.treatment_plan || '—'}</span></td>
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

      {showForm && <RiskFormDialog key={editItem?.id ?? 'new'} item={editItem} obligations={obligations} controls={controls}
        onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />}
    </div>
  )
}
