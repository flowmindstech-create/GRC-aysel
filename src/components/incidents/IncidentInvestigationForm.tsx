'use client'

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { calculateInherentLevel, calculateResidualLevel, evaluateControlEffectiveness } from '@/lib/rcsa'
import { inherentLevelWord, residualLevelWord, CONTROL_SUBCRITERIA, CONTROL_RATING_INFO } from '@/lib/rcsa-methodology'
import { RcsaDropdown } from '@/components/risks/RcsaDropdown'
import { priorityFromLevel } from './IncidentIntakeForm'
import { resolveOwnerFromUnit } from '@/lib/org'
import type { Incident, OrgUnit, Risk, Control, ComplianceObligation, UserProfile, Vendor, InterestedParty } from '@/types'
import { toast } from 'sonner'

const ROOT_CAUSE_CATEGORIES = [
  { value: 'process',       label: 'Proses (Process)' },
  { value: 'human',         label: 'İnsan amili (Human factor)' },
  { value: 'control_gap',   label: 'Kontrol boşluğu (Control gap)' },
  { value: 'procedure_gap', label: 'Prosedur boşluğu (Procedure gap)' },
  { value: 'third_party',   label: 'Üçüncü tərəf (Third party)' },
] as const

// 6-stage incident status (same as the detail sheet) — also editable in investigation.
const STATUS_OPTIONS: { value: Incident['status']; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'review_by_risk_manager', label: 'Review by Risk Manager' },
  { value: 'root_cause_analysis', label: 'Root Cause Analysis' },
  { value: 'resolution', label: 'Resolution' },
  { value: 'done', label: 'Done' },
  { value: 'closed', label: 'Closed' },
]

// Fixed clarifying questions (replace the old free "investigation notes").
const CLARIFYING_QUESTIONS = [
  'Nə baş verdi?',
  'Necə aşkarlandı?',
  'Kim / nə təsirləndi?',
  'Nə vaxt baş verdi / nə qədər davam etdi?',
  'İlkin / ehtimal olunan səbəb nədir?',
]

const todayLocal = () => new Date().toISOString().slice(0, 10)

interface Props {
  data: Partial<Incident>
  onChange: (data: Partial<Incident>) => void
}

export function IncidentInvestigationForm({ data, onChange }: Props) {
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [controls, setControls] = useState<Control[]>([])
  const [obligations, setObligations] = useState<ComplianceObligation[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [parties, setParties] = useState<InterestedParty[]>([])
  const [processControlIds, setProcessControlIds] = useState<string[] | null>(null)
  const [flagging, setFlagging] = useState(false)

  useEffect(() => {
    db.getOrgUnits().then(units =>
      setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    )
    db.getRisks().then(setRisks)
    db.getControls().then(setControls)
    db.getObligations().then(setObligations)
    db.getProfiles().then(setProfiles)
    db.getVendors().then(setVendors)
    db.getInterestedParties().then(setParties)
  }, [])

  // Assign resolution to a department's ERO (head) — dependent dropdown
  function handleAssignDept(deptName: string) {
    const unit = departments.find(u => u.name === deptName)
    const resolved = unit ? resolveOwnerFromUnit(unit, profiles) : null
    onChange({
      ...data,
      assigned_dept: deptName || undefined,
      resolution_assignee: resolved?.owner_id || undefined,
      resolution_assignee_name: resolved?.owner_name || undefined,
    })
  }

  // Flag the linked obligation as non-compliant (rule-based, explicit)
  async function flagNonCompliance() {
    if (!data.compliance_obligation_id || flagging) return
    setFlagging(true)
    try {
      const obl = obligations.find(o => o.id === data.compliance_obligation_id)
      if (obl) {
        await db.saveObligation({ ...obl, status: 'non_compliant' })
        toast.success(`Uyğunsuzluq işarələndi: ${obl.obligation_code}`)
      }
    } catch { toast.error('İşarələnə bilmədi') } finally { setFlagging(false) }
  }

  // 5-Why helpers
  const whys = data.root_cause_whys ?? ['', '', '', '', '']
  function setWhy(i: number, v: string) {
    const next = [...whys]; while (next.length < 5) next.push('')
    next[i] = v
    onChange({ ...data, root_cause_whys: next })
  }

  // If the incident is tied to a process, controls can only come from that process
  useEffect(() => {
    if (!data.process_id) { setProcessControlIds(null); return }
    let active = true
    db.getProcessControlIds(data.process_id).then(ids => { if (active) setProcessControlIds(ids) })
    return () => { active = false }
  }, [data.process_id])

  const selectableControls = useMemo(
    () => processControlIds ? controls.filter(c => processControlIds.includes(c.id)) : controls,
    [controls, processControlIds],
  )

  // Inherent (likelihood × impact) → current control → residual (risk-register engine)
  const inherentLevel = useMemo(
    () => calculateInherentLevel(data.likelihood ?? 3, data.impact ?? 3),
    [data.likelihood, data.impact],
  )
  // Control effectiveness from the 6-criteria RCSA assessment (same engine as the
  // risk register). Only counts once a current control is selected.
  const controlEval = useMemo(() => {
    if (!data.control_id) return null
    const a = data.incident_control_assessment ?? {}
    return evaluateControlEffectiveness(
      a.design_compliance ?? 3, a.design_strength ?? 3, a.design_timeliness ?? 3,
      a.impl_relevance ?? 3, a.impl_sustainability ?? 3, a.impl_traceability ?? 3,
    )
  }, [data.control_id, data.incident_control_assessment])

  const residualLevel = useMemo(
    () => controlEval ? calculateResidualLevel(inherentLevel, controlEval.rating) : inherentLevel,
    [inherentLevel, controlEval],
  )

  // Persist residual + derive priority FROM residual (residual → priority single source)
  useEffect(() => {
    const p = priorityFromLevel(residualLevel)
    if (data.incident_residual_level !== residualLevel || data.priority !== p) {
      onChange({ ...data, incident_residual_level: residualLevel, priority: p })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residualLevel])

  // Patch a single RCSA control sub-criterion on the incident
  function setControlCriterion(key: string, v: number) {
    onChange({ ...data, incident_control_assessment: { ...(data.incident_control_assessment ?? {}), [key]: v } })
  }

  // Auto-set investigation start
  useEffect(() => {
    if (!data.investigation_start) {
      onChange({ ...data, investigation_start: new Date().toISOString() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Risk management team — investigation lead & members are chosen from here only.
  const riskTeam = useMemo(() => profiles.filter(p => p.role === 'admin' || p.role === 'risk_manager'), [profiles])

  // Affected parties = all structures + vendors + interested/3rd parties (names, deduped).
  const affectedPartyOptions = useMemo(() => {
    const names = [
      ...departments.map(d => d.name),
      ...vendors.map(v => v.name),
      ...parties.map(p => p.name),
    ].filter(Boolean)
    return Array.from(new Set(names))
  }, [departments, vendors, parties])

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'
  const labelCls = 'block text-xs font-medium mb-1.5'
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--brand-500)')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')

  return (
    <div className="space-y-4">
      {/* Status (6-stage) + SLA — top of investigation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Status</label>
          <select value={data.status ?? 'open'}
            onChange={e => onChange({ ...data, status: e.target.value as Incident['status'] })}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>SLA (son tarix)</label>
          <input type="text" readOnly
            value={data.sla_due_date ? new Date(data.sla_due_date).toLocaleDateString('az-AZ') : '— (prioritetə görə təyin olunur)'}
            className={`${fieldCls} opacity-70`} style={inputStyle} />
        </div>
      </div>

      {/* Resolution assignment — Department → responsible person (auto) */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Həll üzrə Təyinat
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Assign Department</label>
          <select value={data.assigned_dept ?? ''} onChange={e => handleAssignDept(e.target.value)}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="">— Seçin —</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Məsul şəxs (avtomatik)</label>
          <input value={data.resolution_assignee_name ?? ''} readOnly placeholder="Departament rəhbəri"
            className={`${fieldCls} opacity-70`} style={inputStyle} />
        </div>
      </div>
      <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
        Departament seçiləndə məsul şəxs avtomatik gəlir; təyinatdan sonra həll yalnız bu şəxsdə açılır.
      </p>

      {/* Investigation Lead — chosen from the risk management team (dept head) */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Araşdırma Rəhbəri</label>
        <select value={data.investigation_lead ?? ''}
          onChange={e => onChange({ ...data, investigation_lead: e.target.value })}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">— Seçin (risk komandası) —</option>
          {riskTeam.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
        </select>
      </div>

      {/* Investigation Members — same risk team group; dropdown to add + chips */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Araşdırma Üzvləri</label>
        <select value=""
          onChange={e => {
            const name = e.target.value
            if (!name) return
            const cur = data.investigation_members ?? []
            if (!cur.includes(name)) onChange({ ...data, investigation_members: [...cur, name] })
          }}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">— Üzv əlavə et (risk komandası) —</option>
          {riskTeam
            .filter(u => u.full_name !== data.investigation_lead && !(data.investigation_members ?? []).includes(u.full_name))
            .map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
        </select>
        {(data.investigation_members ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(data.investigation_members ?? []).map(m => (
              <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ background: 'var(--brand-500)', color: '#fff' }}>
                {m}
                <button type="button" aria-label={`${m} sil`}
                  onClick={() => onChange({ ...data, investigation_members: (data.investigation_members ?? []).filter(x => x !== m) })}
                  className="hover:opacity-80 font-bold leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Investigation Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Başlanğıc Tarixi</label>
          <input type="date" max={todayLocal()} value={data.investigation_start?.split('T')[0] ?? ''}
            onChange={e => { const v = e.target.value; onChange({ ...data, investigation_start: v && v > todayLocal() ? todayLocal() : v }) }}
            className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>Gələcək tarix seçmək olmaz</p>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Bitmə Tarixi</label>
          <input type="date" value={data.investigation_end?.split('T')[0] ?? ''}
            onChange={e => onChange({ ...data, investigation_end: e.target.value })}
            className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      {/* GRC linkage — incident ↔ risk / control */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        GRC Əlaqəsi
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Əlaqəli Risk</label>
          <select value={data.risk_id ?? ''} onChange={e => onChange({ ...data, risk_id: e.target.value || undefined })}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="">— Yoxdur —</option>
            {risks.map(r => <option key={r.id} value={r.id}>{(r.risk_code ?? '—') + ' · ' + r.title}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Cari Kontrol</label>
          <select value={data.control_id ?? ''} onChange={e => onChange({ ...data, control_id: e.target.value || undefined })}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="">— Yoxdur —</option>
            {selectableControls.map(c => <option key={c.id} value={c.id}>{c.control_id + ' · ' + c.title}</option>)}
          </select>
          {processControlIds && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>Yalnız seçilmiş prosesin kontrolları</p>
          )}
        </div>
      </div>

      {/* Control effectiveness — RCSA 6 sub-criteria (same as risk register) */}
      {data.control_id && (
        <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand-500)' }}>Kontrol Effektivliyi (RCSA)</p>
            {controlEval && (
              <span className="text-[10px] font-black text-sky-400 uppercase">{CONTROL_RATING_INFO[controlEval.rating].label} · {controlEval.score.toFixed(2)}</span>
            )}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Nəzarətin dizaynı</span>
            <div className="grid grid-cols-3 gap-2">
              {CONTROL_SUBCRITERIA.filter(s => s.group === 'design').map(s => (
                <RcsaDropdown key={s.key} label={s.label} value={(data.incident_control_assessment?.[s.key as keyof NonNullable<Incident['incident_control_assessment']>] as number) || 3}
                  options={s.options} onChange={v => setControlCriterion(s.key, v)} />
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Nəzarətin tətbiqi</span>
            <div className="grid grid-cols-3 gap-2">
              {CONTROL_SUBCRITERIA.filter(s => s.group === 'implementation').map(s => (
                <RcsaDropdown key={s.key} label={s.label} value={(data.incident_control_assessment?.[s.key as keyof NonNullable<Incident['incident_control_assessment']>] as number) || 3}
                  options={s.options} onChange={v => setControlCriterion(s.key, v)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inherent → Residual → Priority (single source: 5×5 + RCSA) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
          <p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>İlkin (Inherent)</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{inherentLevelWord(inherentLevel)}</p>
        </div>
        <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
          <p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Residual</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--brand-500)' }}>{residualLevelWord(residualLevel)}</p>
        </div>
        <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
          <p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Priority</p>
          <p className="text-xs font-semibold capitalize" style={{ color: 'var(--foreground)' }}>{(data.priority ?? priorityFromLevel(residualLevel)).replace('_', ' — ')}</p>
        </div>
      </div>

      {/* Compliance linkage + non-compliance flag */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Əlaqəli Compliance Öhdəliyi</label>
        <div className="flex gap-2">
          <select value={data.compliance_obligation_id ?? ''} onChange={e => onChange({ ...data, compliance_obligation_id: e.target.value || undefined })}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="">— Yoxdur —</option>
            {obligations.map(o => <option key={o.id} value={o.id}>{o.obligation_code + ' · ' + o.title}</option>)}
          </select>
          {data.compliance_obligation_id && (
            <button type="button" onClick={flagNonCompliance} disabled={flagging}
              className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50" style={{ background: 'rgb(225,29,72)' }}>
              {flagging ? '…' : 'Uyğunsuzluq işarələ'}
            </button>
          )}
        </div>
        {data.compliance_obligation_id && (
          <p className="text-[10px] mt-0.5 text-red-400">Uyğunsuzluq aşkarlandı — öhdəlik "non_compliant" kimi işarələnəcək.</p>
        )}
      </div>

      {/* Root Cause Category (5 ISO options) */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Root Cause Analysis
      </p>
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Kök Səbəb Təsnifatı</label>
        <select value={data.root_cause_category ?? ''} onChange={e => onChange({ ...data, root_cause_category: (e.target.value || undefined) as Incident['root_cause_category'] })}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">— Seçin —</option>
          {ROOT_CAUSE_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
        </select>
      </div>

      {/* 5-Why */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>5 Niyə (5-Why)</label>
        <div className="space-y-2 pl-2 border-l-2" style={{ borderColor: 'var(--border)' }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i}>
              {i === 4 && <p className="text-[10px] text-amber-400 font-semibold mb-0.5">Yekun səbəb:</p>}
              <input value={whys[i] ?? ''} onChange={e => setWhy(i, e.target.value)}
                placeholder={i === 4 ? '5. Niyə? (yekun kök səbəb)' : `${i + 1}. Niyə?`}
                className={cn(fieldCls, i === 4 && 'font-medium')}
                style={i === 4 ? { background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', color: 'var(--foreground)' } : inputStyle}
                onFocus={focus} onBlur={blur} />
            </div>
          ))}
        </div>
      </div>

      {/* Root Cause Detail (free text) */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Root Cause Təfərrüatı</label>
        <textarea value={data.root_cause ?? ''} onChange={e => onChange({ ...data, root_cause: e.target.value })} rows={2}
          placeholder="Əsas səbəbi ətraflı izah edin..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Clarifying questions (replaces free investigation notes) */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Dəqiqləşdirmə sualları</label>
        <div className="space-y-2">
          {CLARIFYING_QUESTIONS.map((q, i) => (
            <div key={i}>
              <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--foreground)' }}>{i + 1}. {q}</p>
              <textarea rows={2}
                value={data.clarifying_qa?.[String(i)] ?? ''}
                onChange={e => onChange({ ...data, clarifying_qa: { ...(data.clarifying_qa ?? {}), [String(i)]: e.target.value } })}
                placeholder="Cavab..."
                className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
          ))}
        </div>
      </div>

      {/* Affected Parties — structures + vendors + interested/3rd parties (dropdown + chips) */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Təsirlənmiş Tərəflər</label>
        <select value=""
          onChange={e => {
            const name = e.target.value
            if (!name) return
            const cur = data.affected_departments ?? []
            if (!cur.includes(name)) onChange({ ...data, affected_departments: [...cur, name] })
          }}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">— Tərəf əlavə et (struktur / vendor / 3-cü tərəf) —</option>
          {affectedPartyOptions.filter(n => !(data.affected_departments ?? []).includes(n)).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {(data.affected_departments ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(data.affected_departments ?? []).map(n => (
              <span key={n} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ background: 'var(--brand-500)', color: '#fff' }}>
                {n}
                <button type="button" aria-label={`${n} sil`}
                  onClick={() => onChange({ ...data, affected_departments: (data.affected_departments ?? []).filter(x => x !== n) })}
                  className="hover:opacity-80 font-bold leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
