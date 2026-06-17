'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { residualLevelWord, inherentLevelWord } from '@/lib/rcsa-methodology'
import { resolveOwnerFromUnit } from '@/lib/org'
import type {
  ComplianceObligation, ObligationStatus, ObligationSource,
  ObligationSourceType, ObligationCriticality, ObligationType, OrgUnit, Risk, Control, UserProfile,
} from '@/types'

const SOURCES: ObligationSource[] = [
  'ISO 27001', 'GDPR', 'SOC 2', 'PCI DSS',
  'Local Regulation', 'Internal Policy', 'Contractual', 'Other',
]

const SOURCE_TYPES: { value: ObligationSourceType; label: string }[] = [
  { value: 'external',    label: 'External' },
  { value: 'internal',    label: 'Internal' },
  { value: 'contractual', label: 'Contractual' },
]

const STATUSES: { value: ObligationStatus; label: string }[] = [
  { value: 'compliant',      label: 'Compliant' },
  { value: 'non_compliant',  label: 'Non-Compliant' },
  { value: 'under_review',   label: 'Under Review' },
  { value: 'not_applicable', label: 'Not Applicable' },
]

const CRITICALITIES: { value: ObligationCriticality; label: string }[] = [
  { value: 'minimal',  label: 'Minimal (1)' },
  { value: 'low',      label: 'Low (2)' },
  { value: 'medium',   label: 'Medium (3)' },
  { value: 'high',     label: 'High (4)' },
  { value: 'critical', label: 'Critical (5)' },
]

const OBLIGATION_TYPES: { value: ObligationType; label: string }[] = [
  { value: 'requirement', label: 'Mandatory (legal)' },
  { value: 'commitment',  label: 'Voluntary (internal/contract)' },
]

interface Props {
  obligation: ComplianceObligation | null
  onClose: () => void
  onSave: (item: ComplianceObligation) => Promise<void>
  onSaved?: () => void
}

export function ObligationFormDialog({ obligation, onClose, onSave, onSaved }: Props) {
  const isEdit = !!obligation

  const [title, setTitle]                 = useState(obligation?.title ?? '')
  const [description, setDesc]            = useState(obligation?.description ?? '')
  const [source, setSource]               = useState<ObligationSource>(obligation?.source ?? 'ISO 27001')
  const [sourceType, setSourceType]       = useState<ObligationSourceType>(obligation?.source_type ?? 'external')
  const [sourceReference, setSourceRef]   = useState(obligation?.source_reference ?? '')
  const [sourceUrl, setSourceUrl]         = useState(obligation?.source_url ?? '')
  const [regulator, setRegulator]         = useState(obligation?.regulator ?? '')
  const [accountableOwner, setAccountable]= useState(obligation?.accountable_owner ?? '')
  const [responsibleParty, setResponsible]= useState(obligation?.responsible_party ?? '')
  const [responsibleRole, setRole]        = useState(obligation?.responsible_role ?? '')
  const [applicableDepts, setDepts]       = useState<string[]>(obligation?.applicable_depts ?? [])
  const [evidence, setEvidence]           = useState(obligation?.evidence ?? '')
  const [complianceCondition, setCondition]  = useState(obligation?.compliance_condition ?? '')
  const [responsibleStructure, setStructure] = useState(obligation?.responsible_structure ?? '')
  const [status, setStatus]               = useState<ObligationStatus>(obligation?.status ?? 'under_review')
  const [obligationType, setObligationType] = useState<ObligationType>(obligation?.obligation_type ?? 'requirement')
  const [criticality, setCriticality]     = useState<ObligationCriticality>(obligation?.criticality ?? 'medium')
  const [primaryRiskId, setPrimaryRisk]   = useState(obligation?.primary_risk_id ?? '')
  const [effectiveDate, setEffective]     = useState(obligation?.effective_date ?? '')
  const [nextReviewDate, setNextReview]   = useState(obligation?.next_review_date ?? '')
  const [linkedControlIds, setLinkedCtrl] = useState<string[]>([])
  const [loading, setLoading]             = useState(false)

  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [profiles, setProfiles]       = useState<UserProfile[]>([])
  const [risks, setRisks]             = useState<Risk[]>([])
  const [controls, setControls]       = useState<Control[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      const [units, people, riskList, controlList] = await Promise.all([
        db.getOrgUnits(), db.getProfiles(), db.getRisks(), db.getControls(),
      ])
      if (!active) return
      setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
      setProfiles(people)
      setRisks(riskList)
      setControls(controlList)
      if (obligation?.id) {
        const cids = await db.getObligationControlIds(obligation.id)
        if (!active) return
        setLinkedCtrl(cids)
      }
    })()
    return () => { active = false }
  }, [obligation?.id])

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  // Owner dependency: when a responsible structure (dept) is picked, auto-fill person + role
  function handleStructureChange(structureName: string) {
    setStructure(structureName)
    const unit = departments.find(u => u.name === structureName)
    if (unit) {
      const resolved = resolveOwnerFromUnit(unit, profiles)
      if (resolved.owner_name) setResponsible(resolved.owner_name)
      if (resolved.owner_role) setRole(resolved.owner_role)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)

    const now = new Date().toISOString()
    const item: ComplianceObligation = {
      id:               obligation?.id ?? crypto.randomUUID(),
      org_id:           obligation?.org_id ?? '',
      obligation_code:  obligation?.obligation_code ?? '',
      title:            title.trim(),
      description:      description.trim(),
      compliance_condition: complianceCondition.trim() || undefined,
      source,
      source_type:      sourceType,
      obligation_type:  obligationType,
      source_reference: sourceReference.trim() || undefined,
      source_url:       sourceUrl.trim() || undefined,
      regulator:        regulator.trim() || undefined,
      accountable_owner: accountableOwner.trim() || undefined,
      responsible_party: responsibleParty.trim() || undefined,
      responsible_role: responsibleRole.trim() || undefined,
      responsible_structure: responsibleStructure.trim() || undefined,
      applicable_depts: applicableDepts,
      evidence:         evidence.trim() || undefined,
      status,
      criticality,
      primary_risk_id:  primaryRiskId || undefined,
      effective_date:   effectiveDate || undefined,
      next_review_date: nextReviewDate || undefined,
      created_at:       obligation?.created_at ?? now,
      updated_at:       now,
    }

    await onSave(item)
    // Persist control links (obligation id is stable — db keeps the passed UUID)
    await db.setObligationControls(item.id, linkedControlIds)
    onSaved?.()
    setLoading(false)
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const labelCls = 'block text-xs font-medium mb-1.5'
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--brand-500)')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')

  const sectionTitle = (t: string) => (
    <p className="text-[11px] font-bold uppercase tracking-wide pt-2" style={{ color: 'var(--brand-500)' }}>{t}</p>
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {isEdit ? 'Edit Obligation' : 'New Obligation'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                {isEdit ? `Editing ${obligation.obligation_code}` : 'Code will be auto-generated (COMP-OBL-…)'}
              </p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          <div className="h-0.5 mx-6" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Title */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Title <span className="text-red-400">*</span></label>
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. GDPR Article 7 — Consent Management"
                className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} required />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Description</label>
              <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2}
                placeholder="What must be fulfilled…"
                className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            {/* Compliance condition */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Scope of Requirement</label>
              <textarea value={complianceCondition} onChange={e => setCondition(e.target.value)} rows={2}
                placeholder="The condition / criterion that must hold to be compliant…"
                className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            {sectionTitle('Source')}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Source Type</label>
                <select value={sourceType} onChange={e => setSourceType(e.target.value as ObligationSourceType)}
                  className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Framework / Standard</label>
                <select value={source} onChange={e => setSource(e.target.value as ObligationSource)}
                  className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Compliance Article (law article / clause)</label>
              <textarea value={sourceReference} onChange={e => setSourceRef(e.target.value)} rows={2}
                placeholder="e.g. GDPR Art. 7(1); Local Law No. 123, §5"
                className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Source URL</label>
                <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Regulator / Authority</label>
                <input value={regulator} onChange={e => setRegulator(e.target.value)} placeholder="e.g. State Tax Service"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            {sectionTitle('Accountability')}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Accountable Owner</label>
                <input value={accountableOwner} onChange={e => setAccountable(e.target.value)} placeholder="C-level / Manager"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Responsible Party</label>
                <input value={responsibleParty} onChange={e => setResponsible(e.target.value)} placeholder="Compliance Officer"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Responsible Structure</label>
                <select value={responsibleStructure} onChange={e => handleStructureChange(e.target.value)}
                  className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  <option value="">— None —</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Role / Position</label>
                <input value={responsibleRole} onChange={e => setRole(e.target.value)} placeholder="Auto-fills from structure"
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Applicable Departments</label>
              <div className="flex flex-wrap gap-1.5">
                {departments.length === 0 && <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>No departments found.</span>}
                {departments.map(d => {
                  const on = applicableDepts.includes(d.name)
                  return (
                    <button key={d.id} type="button" onClick={() => toggle(applicableDepts, d.name, setDepts)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
                      style={on
                        ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' }
                        : { background: 'var(--muted)', color: 'var(--muted-fg)', borderColor: 'var(--border)' }}>
                      {d.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {sectionTitle('Status & Criticality')}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Compliance Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as ObligationStatus)}
                  className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Criticality</label>
                <select value={criticality} onChange={e => setCriticality(e.target.value as ObligationCriticality)}
                  className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {CRITICALITIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Obligation Type (ISO 37301)</label>
              <select value={obligationType} onChange={e => setObligationType(e.target.value as ObligationType)}
                className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                {OBLIGATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {sectionTitle('Dates')}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Effective Date</label>
                <input type="date" value={effectiveDate} onChange={e => setEffective(e.target.value)}
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Next Review Date</label>
                <input type="date" value={nextReviewDate} onChange={e => setNextReview(e.target.value)}
                  className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            {sectionTitle('Related Risk')}
            <div>
              <select value={primaryRiskId} onChange={e => setPrimaryRisk(e.target.value)}
                className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                <option value="">— None —</option>
                {risks.map(r => <option key={r.id} value={r.id}>{(r.risk_code ?? '—') + ' · ' + r.title}</option>)}
              </select>
              {(() => {
                const r = risks.find(x => x.id === primaryRiskId)
                if (!r) return <p className="text-[10px] mt-1" style={{ color: 'var(--muted-fg)' }}>Degree, likelihood and initial degree auto-fill from the selected risk.</p>
                return (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
                      <p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Risk degree</p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{r.residual_level ? residualLevelWord(r.residual_level) : '—'}</p>
                    </div>
                    <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
                      <p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Likelihood</p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{r.likelihood ?? '—'}/5</p>
                    </div>
                    <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
                      <p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Initial degree</p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{inherentLevelWord(r.level)}</p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {sectionTitle('Linked Controls')}
            <div className="rounded-lg border max-h-32 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
              {controls.length === 0 ? (
                <p className="text-xs px-3 py-2" style={{ color: 'var(--muted-fg)' }}>No controls in the library yet.</p>
              ) : controls.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-white/5" style={{ color: 'var(--foreground)' }}>
                  <input type="checkbox" checked={linkedControlIds.includes(c.id)} onChange={() => toggle(linkedControlIds, c.id, setLinkedCtrl)} />
                  <span className="font-mono text-[10px]" style={{ color: 'var(--brand-500)' }}>{c.control_id}</span>
                  <span className="truncate">{c.title}</span>
                </label>
              ))}
            </div>

            {/* Evidence */}
            <div>
              <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Evidence</label>
              <textarea value={evidence} onChange={e => setEvidence(e.target.value)} rows={2}
                placeholder="Documentation / proof of compliance (reports, records, links)…"
                className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5" style={{ color: 'var(--muted-fg)' }}>
                Cancel
              </button>
              <button type="submit" disabled={!title.trim() || loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (
                  <>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
