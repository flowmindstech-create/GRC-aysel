'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import type { ComplianceAssessment, AssessmentResult, AssessmentFrequency, Control, ComplianceObligation, ComplianceAssessmentHistory } from '@/types'
import { cn } from '@/lib/utils'
import { ControlChecklist } from '@/components/compliance/ControlChecklist'
import { Plus, Search, Edit, Trash2, ClipboardCheck, X, Save, Upload, ListChecks, Gauge, AlertTriangle, History, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

const RESULT_CFG: Record<AssessmentResult, { label: string; cls: string }> = {
  compliant:           { label: 'Compliant',          cls: 'bg-emerald-500/15 text-emerald-400' },
  partially_compliant: { label: 'Partially',          cls: 'bg-amber-500/15 text-amber-400' },
  non_compliant:       { label: 'Non-Compliant',      cls: 'bg-red-500/15 text-red-400' },
  not_tested:          { label: 'Not Tested',         cls: 'bg-zinc-500/15 text-zinc-400' },
}
const ALL_RESULTS = Object.keys(RESULT_CFG) as AssessmentResult[]
const FREQUENCIES: AssessmentFrequency[] = ['monthly', 'quarterly', 'semiannual', 'annual', 'adhoc']

function isOverdue(a: ComplianceAssessment): boolean {
  if (!a.next_review_date || a.result === 'compliant') return false
  const d = new Date(a.next_review_date); d.setHours(23, 59, 59, 999)
  return d.getTime() < Date.now()
}

function FormDialog({ item, controls, obligations, onClose, onSave }: {
  item: ComplianceAssessment | null
  controls: Control[]
  obligations: ComplianceObligation[]
  onClose: () => void
  onSave: (a: ComplianceAssessment) => Promise<void>
}) {
  const isEdit = !!item
  const [controlId, setControlId] = useState(item?.control_id ?? '')
  const [obligationId, setObligationId] = useState(item?.obligation_id ?? '')
  const [frequency, setFrequency] = useState<AssessmentFrequency>(item?.frequency ?? 'quarterly')
  const [owner, setOwner] = useState(item?.owner ?? '')
  const [lastReview, setLastReview] = useState(item?.last_review_date ?? '')
  const [result, setResult] = useState<AssessmentResult>(item?.result ?? 'not_tested')
  const [observed, setObserved] = useState(item?.observed_state ?? '')
  const [evidenceUrl, setEvidenceUrl] = useState(item?.evidence_url ?? '')
  const [fileName, setFileName] = useState(item?.evidence_file_name ?? '')
  const [findings, setFindings] = useState(item?.findings ?? '')
  const [remediation, setRemediation] = useState(item?.remediation_plan ?? '')
  const [loading, setLoading] = useState(false)

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const labelCls = 'block text-xs font-medium mb-1.5'
  const needsFindings = result === 'non_compliant' || result === 'partially_compliant'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!observed.trim()) { toast.error('Müşahidə edilən vəziyyət (Observed State) məcburidir'); return }
    if (result === 'compliant' && !evidenceUrl.trim() && !fileName) { toast.error('Compliant üçün evidence (link və ya fayl) məcburidir'); return }
    if (needsFindings && !findings.trim()) { toast.error('Uyğunsuzluq üçün "Findings" doldurulmalıdır'); return }
    setLoading(true)
    const now = new Date().toISOString()
    const ctrl = controls.find(c => c.id === controlId)
    const obl = obligations.find(o => o.id === obligationId)
    await onSave({
      id: item?.id ?? crypto.randomUUID(), org_id: item?.org_id ?? '', code: item?.code ?? '',
      title: ctrl ? `${ctrl.control_id} · ${ctrl.title}` : (obl ? obl.title : 'Assessment'),
      control_id: controlId || undefined, obligation_id: obligationId || undefined,
      frequency, owner: owner.trim() || undefined, last_review_date: lastReview || now.slice(0, 10),
      result, observed_state: observed.trim() || undefined,
      evidence_url: evidenceUrl.trim() || undefined, evidence_file_name: fileName || undefined,
      findings: findings.trim() || undefined, remediation_plan: remediation.trim() || undefined,
      created_incident_id: item?.created_incident_id,
      created_at: item?.created_at ?? now, updated_at: now,
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
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Assessment' : 'New Compliance Assessment'}</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Control</label>
              <select value={controlId} onChange={e => setControlId(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— None —</option>
                {controls.map(c => <option key={c.id} value={c.id}>{c.control_id} · {c.title}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Mapped Obligation</label>
              <select value={obligationId} onChange={e => setObligationId(e.target.value)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— None —</option>
                {obligations.map(o => <option key={o.id} value={o.id}>{o.obligation_code} · {o.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Frequency</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value as AssessmentFrequency)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {FREQUENCIES.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Last Review</label>
                <input type="date" value={lastReview} onChange={e => setLastReview(e.target.value)} className={fieldCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Result</label>
                <select value={result} onChange={e => setResult(e.target.value as AssessmentResult)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {ALL_RESULTS.map(r => <option key={r} value={r}>{RESULT_CFG[r].label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Owner / Assessor</label>
                <input value={owner} onChange={e => setOwner(e.target.value)} className={fieldCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Observed State <span className="text-red-400">*</span></label>
              <textarea value={observed} onChange={e => setObserved(e.target.value)} rows={2} placeholder="Yoxlama zamanı real olaraq nə aşkarlandı… (məcburi)" className={`${fieldCls} resize-none`} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Evidence (link)</label>
                <input value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://…" className={fieldCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Attach file</label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs" style={inputStyle}>
                  <Upload className="w-3.5 h-3.5" /> <span className="truncate">{fileName || 'Choose…'}</span>
                  <input type="file" className="hidden" onChange={e => setFileName(e.target.files?.[0]?.name ?? '')} />
                </label>
              </div>
            </div>
            {needsFindings && (
              <>
                <div>
                  <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Findings <span className="text-red-400">*</span></label>
                  <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={2} placeholder="Aşkar edilmiş uyğunsuzluq…" className={`${fieldCls} resize-none`} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Remediation Plan</label>
                  <textarea value={remediation} onChange={e => setRemediation(e.target.value)} rows={2} placeholder="Düzəldici fəaliyyət…" className={`${fieldCls} resize-none`} style={inputStyle} />
                </div>
                {result === 'non_compliant' && !item?.created_incident_id && (
                  <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Yadda saxlananda avtomatik incident yaradılacaq.</p>
                )}
              </>
            )}
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

function AssessmentRegister() {
  const [items, setItems] = useState<ComplianceAssessment[]>([])
  const [controls, setControls] = useState<Control[]>([])
  const [obligations, setObligations] = useState<ComplianceObligation[]>([])
  const [linkMaps, setLinkMaps] = useState<Record<string, { controlIds: string[]; policyIds: string[] }>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ComplianceAssessment | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssessmentResult | 'all'>('all')
  const [freqFilter, setFreqFilter] = useState<AssessmentFrequency | 'all'>('all')
  const [historyFor, setHistoryFor] = useState<ComplianceAssessment | null>(null)
  const [historyRows, setHistoryRows] = useState<ComplianceAssessmentHistory[]>([])
  const [coverageDetail, setCoverageDetail] = useState<string | null>(null) // clicked framework name

  async function openHistory(a: ComplianceAssessment) {
    setHistoryFor(a)
    setHistoryRows(await db.getAssessmentHistory(a.id))
  }

  async function reload() {
    const [a, c, o, lm] = await Promise.all([
      db.getComplianceAssessments(), db.getControls(), db.getObligations(), db.getObligationLinkMaps(),
    ])
    setItems(a); setControls(c); setObligations(o); setLinkMaps(lm); setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const ctrlCode = (id?: string) => controls.find(c => c.id === id)?.control_id
  const oblCode = (id?: string) => obligations.find(o => o.id === id)?.obligation_code

  // Framework coverage: obligations with ≥1 linked control, grouped by source
  const coverage = useMemo(() => {
    const by: Record<string, { total: number; covered: number }> = {}
    obligations.forEach(o => {
      const fw = o.source || 'Other'
      if (!by[fw]) by[fw] = { total: 0, covered: 0 }
      by[fw].total++
      if ((linkMaps[o.id]?.controlIds.length ?? 0) > 0) by[fw].covered++
    })
    return Object.entries(by).map(([fw, v]) => ({ fw, ...v, pct: v.total ? Math.round((v.covered / v.total) * 100) : 0 }))
  }, [obligations, linkMaps])

  const filtered = items.filter(i =>
    (!search || (i.title ?? '').toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()))
    && (statusFilter === 'all' || i.result === statusFilter)
    && (freqFilter === 'all' || i.frequency === freqFilter)
  )

  async function handleSave(a: ComplianceAssessment) {
    const saved = await db.saveComplianceAssessment(a)
    setShowForm(false); setEditItem(null); reload()
    toast.success(saved.created_incident_id && a.result === 'non_compliant' ? 'Saved — incident yaradıldı' : (editItem ? 'Updated' : 'Created'))
  }
  async function handleDelete(id: string) { await db.deleteComplianceAssessment(id); reload(); toast.success('Deleted') }

  return (
    <div className="space-y-5">
      {/* Coverage cards — click a framework to see which obligations are covered */}
      {coverage.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {coverage.slice(0, 4).map(c => (
            <button key={c.fw} type="button" onClick={() => setCoverageDetail(c.fw)}
              className="card p-4 text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-[11px] flex items-center gap-1 mb-1" style={{ color: 'var(--muted-fg)' }}><Gauge className="w-3 h-3" /> {c.fw}</p>
              <p className="text-xl font-bold" style={{ color: c.pct >= 80 ? '#34d399' : c.pct >= 50 ? '#fbbf24' : '#f87171' }}>{c.pct}%</p>
              <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{c.covered}/{c.total} obligation covered · detallar üçün klik</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assessments…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {(['all', ...ALL_RESULTS] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap"
              style={statusFilter === s ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
              {s === 'all' ? 'All' : RESULT_CFG[s].label}
            </button>
          ))}
        </div>
        <select value={freqFilter} onChange={e => setFreqFilter(e.target.value as AssessmentFrequency | 'all')}
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer capitalize"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <option value="all">All Frequencies</option>
          {FREQUENCIES.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
        </select>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New Assessment
        </button>
      </div>

      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Code', 'Title', 'Control', 'Obligation', 'Freq', 'Owner', 'Result', 'Next Review', 'Evidence', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={10} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={10} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}><div className="flex flex-col items-center gap-2"><ClipboardCheck className="w-8 h-8 opacity-30" /><p className="text-sm">No assessments yet</p></div></td></tr>)
          : filtered.map((a, i) => {
            const overdue = isOverdue(a)
            return (
            <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{a.code}</span></td>
              <td className="px-3 py-3.5 max-w-[180px]"><span className="text-sm truncate block" style={{ color: 'var(--foreground)' }}>{a.title || '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono" style={{ color: a.control_id ? 'var(--brand-500)' : 'var(--muted-fg)' }}>{ctrlCode(a.control_id) || '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono" style={{ color: a.obligation_id ? 'var(--brand-500)' : 'var(--muted-fg)' }}>{oblCode(a.obligation_id) || '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs capitalize" style={{ color: 'var(--muted-fg)' }}>{a.frequency}</span></td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: a.owner ? 'var(--foreground)' : 'var(--muted-fg)' }}>{a.owner || '—'}</span></td>
              <td className="px-3 py-3.5">{(() => { const rc = RESULT_CFG[a.result] ?? { label: String(a.result ?? '—'), cls: 'bg-zinc-500/15 text-zinc-400' }; return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', rc.cls)}>{rc.label}</span> })()}</td>
              <td className="px-3 py-3.5"><span className={cn('text-xs whitespace-nowrap font-medium', overdue && 'text-red-400')} style={!overdue ? { color: a.next_review_date ? 'var(--foreground)' : 'var(--muted-fg)' } : undefined}>{a.next_review_date ? format(new Date(a.next_review_date), 'd MMM yyyy') : '—'}{overdue && ' ⚠'}</span></td>
              <td className="px-3 py-3.5 max-w-[120px]"><span className="text-xs truncate block" style={{ color: (a.evidence_url || a.evidence_file_name) ? 'var(--foreground)' : 'var(--muted-fg)' }}>{a.evidence_file_name || a.evidence_url || '—'}</span></td>
              <td className="px-3 py-3.5"><div className="flex items-center gap-1">
                <button onClick={() => openHistory(a)} title="History" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"><History className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} /></button>
                <button onClick={() => { setEditItem(a); setShowForm(true) }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"><Edit className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} /></button>
                <button onClick={() => handleDelete(a.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div></td>
            </motion.tr>
            )
          })}
        </tbody>
      </table></div></div>

      {showForm && <FormDialog key={editItem?.id ?? 'new'} item={editItem} controls={controls} obligations={obligations} onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />}

      {/* History Log (timeline) */}
      <AnimatePresence>
        {historyFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHistoryFor(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[80vh] overflow-y-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}><Clock className="w-4 h-4" /> Tarixçə — {historyFor.code}</h2>
                <button onClick={() => setHistoryFor(null)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
              </div>
              <div className="px-6 py-5">
                {historyRows.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Hələ tarixçə yoxdur.</p>
                ) : (
                  <div className="space-y-3 border-l pl-3" style={{ borderColor: 'var(--border)' }}>
                    {historyRows.map(h => (
                      <div key={h.id} className="relative">
                        <span className="absolute -left-[18px] top-1 w-2 h-2 rounded-full" style={{ background: 'var(--brand-500)' }} />
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', RESULT_CFG[(h.result as AssessmentResult) ?? 'not_tested'].cls)}>
                          {RESULT_CFG[(h.result as AssessmentResult) ?? 'not_tested'].label}
                        </span>
                        {h.observed_state && <p className="text-xs mt-1" style={{ color: 'var(--foreground)' }}>{h.observed_state}</p>}
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>{h.changed_by} · {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Framework coverage detail — which obligations are covered by which controls */}
      <AnimatePresence>
        {coverageDetail && (() => {
          const fwObligations = obligations.filter(o => (o.source || 'Other') === coverageDetail)
          const covered = fwObligations.filter(o => (linkMaps[o.id]?.controlIds.length ?? 0) > 0).length
          const pct = fwObligations.length ? Math.round((covered / fwObligations.length) * 100) : 0
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCoverageDetail(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[85vh] overflow-y-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{coverageDetail}</h2>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                      pct >= 80 ? 'bg-emerald-500/15 text-emerald-400' : pct >= 50 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400')}>
                      {covered}/{fwObligations.length} · {pct}%
                    </span>
                  </div>
                  <button onClick={() => setCoverageDetail(null)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
                </div>
                <div className="px-6 py-5 space-y-2">
                  {fwObligations.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Bu framework üzrə öhdəlik yoxdur.</p>
                  ) : fwObligations.map(o => {
                    const ctrlIds = linkMaps[o.id]?.controlIds ?? []
                    const ctrlCodes = ctrlIds.map(id => controls.find(c => c.id === id)?.control_id).filter(Boolean) as string[]
                    const isCovered = ctrlCodes.length > 0
                    return (
                      <div key={o.id} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                        <span className="mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap shrink-0 bg-violet-500/12 text-violet-400">{o.obligation_code}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{o.title}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {isCovered ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">✓ Covered</span>
                                {ctrlCodes.map(code => (
                                  <span key={code} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/12 text-sky-400">{code}</span>
                                ))}
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">✗ Not covered — kontrol bağlanmayıb</span>
                            )}
                            <span className="text-[10px] capitalize ml-auto" style={{ color: 'var(--muted-fg)' }}>{String(o.status ?? '').replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

export function ComplianceMonitoringClient() {
  const [tab, setTab] = useState<'assessments' | 'checklist'>('assessments')
  const tabs = [
    { id: 'assessments' as const, label: 'Assessments & Monitoring', icon: ClipboardCheck },
    { id: 'checklist' as const, label: 'Control Checklist', icon: ListChecks },
  ]
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t.id ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'assessments' ? <AssessmentRegister /> : <ControlChecklist />}
    </div>
  )
}
