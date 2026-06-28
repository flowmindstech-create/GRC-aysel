'use client'

import { useState, useMemo, useEffect } from 'react'
import { Upload, X, Calendar, AlertTriangle, Lock, Workflow, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { calculateInherentLevel } from '@/lib/rcsa'
import { resolveOwnerFromUnit } from '@/lib/org'
import type { Incident, IncidentPriority, IncidentSeverity, AttachedFile, OrgUnit, Process, Risk, Control, UserProfile } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'
import { RISK_CATEGORIES, type RiskCategory } from '@/lib/risk-categories'
import { incidentSubcategories } from '@/lib/incident-categories'
import { RcsaDropdown } from '@/components/risks/RcsaDropdown'
import { LIKELIHOOD_OPTIONS, IMPACT_LEVEL_LABELS, type ScaleOption } from '@/lib/rcsa-methodology'

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000

// Severity is derived from the 5×5 inherent matrix (same as the risk register) —
// never selected manually, so incident and risk stay consistent.
export function calcSeverity(likelihood: number, impact: number): IncidentSeverity {
  return calculateInherentLevel(likelihood, impact)
}

// Priority is a direct relabel of severity — SAME single source (the 5×5 matrix),
// so Severity and Priority can never disagree (e.g. Medium → P3-Medium).
const SEVERITY_TO_PRIORITY: Record<IncidentSeverity, IncidentPriority> = {
  critical: 'P1_critical',
  high:     'P2_high',
  medium:   'P3_medium',
  low:      'P4_low',
  minimal:  'P5_minimal',
}
export function calcPriority(likelihood: number, impact: number): IncidentPriority {
  return SEVERITY_TO_PRIORITY[calcSeverity(likelihood, impact)]
}

// Priority from an already-computed level (e.g. residual) — used in investigation.
export function priorityFromLevel(level: IncidentSeverity): IncidentPriority {
  return SEVERITY_TO_PRIORITY[level]
}

// Core systems list for the "Affected Systems" picker (intake). Editable here.
export const INCIDENT_SYSTEMS = [
  'Core Banking', 'CRM', 'ERP', 'Internet Banking', 'Mobile Banking',
  'Kart sistemi', 'AML / Sanksiya', 'HR sistemi', 'AD / Şəbəkə', 'Email',
  'EDMS (sənəd dövriyyəsi)', 'BI / Hesabatlıq', 'Digər',
]

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; classes: string }> = {
  minimal:  { label: 'Minimal',  classes: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
  low:      { label: 'Low',      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  medium:   { label: 'Medium',   classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  high:     { label: 'High',     classes: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  critical: { label: 'Critical', classes: 'bg-red-500/15 text-red-400 border-red-500/25' },
}

// Local datetime-local string for "now" (used to block future occurrence dates)
function nowLocalValue(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}

export const PRIORITY_CONFIG: Record<IncidentPriority, { label: string; classes: string }> = {
  P1_critical: { label: 'P1 — Critical', classes: 'bg-red-500/15 text-red-400 border-red-500/25' },
  P2_high: { label: 'P2 — High', classes: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  P3_medium: { label: 'P3 — Medium', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  P4_low: { label: 'P4 — Low', classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  P5_minimal: { label: 'P5 — Minimal', classes: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
}

// Generic single-impact scale (5 levels) with per-level meaning — used in the
// incident intake dropdown (same RcsaDropdown widget as the risk register).
const IMPACT_OPTIONS: ScaleOption[] = IMPACT_LEVEL_LABELS.map((label, i) => ({
  value: i + 1,
  label,
  desc: [
    'Cüzi təsir — əməliyyata/maliyyəyə demək olar təsir yoxdur',
    'Kiçik təsir — məhdud, asanlıqla aradan qaldırılan təsir',
    'Mülayim təsir — nəzərəçarpan, idarə oluna bilən təsir',
    'Əhəmiyyətli təsir — ciddi əməliyyat/maliyyə/nüfuz təsiri',
    'Fəlakətli təsir — kritik, geniş miqyaslı təsir',
  ][i],
}))

// ── Main Intake Form ────────────────────────────────────────────────────────
interface Props {
  data: Partial<Incident>
  onChange: (data: Partial<Incident>) => void
}

export function IncidentIntakeForm({ data, onChange }: Props) {
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [processControlIds, setProcessControlIds] = useState<string[]>([])
  const [allIncidents, setAllIncidents] = useState<Incident[]>([])
  const [allRisks, setAllRisks] = useState<Risk[]>([])
  const [allControls, setAllControls] = useState<Control[]>([])

  useEffect(() => {
    db.getOrgUnits().then(units =>
      setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    )
    db.getProfiles().then(setProfiles)
    db.getProcesses().then(setProcesses)
    db.getIncidents().then(setAllIncidents)
    db.getRisks().then(setAllRisks)
    db.getControls().then(setAllControls)
  }, [])

  // Reporter structure → reporter person (auto-fill to dept head; editable)
  function handleStructureChange(structureName: string) {
    const unit = departments.find(u => u.name === structureName)
    const head = unit ? resolveOwnerFromUnit(unit, profiles).owner_name : ''
    onChange({ ...data, reporter_structure: structureName, reporter_person: head || data.reporter_person })
  }

  // When a process is chosen, load its controls (incidents can only use these)
  useEffect(() => {
    if (!data.process_id) { setProcessControlIds([]); return }
    let active = true
    db.getProcessControlIds(data.process_id).then(ids => { if (active) setProcessControlIds(ids) })
    return () => { active = false }
  }, [data.process_id])

  // Related items surfaced from the selected process (rule-based, no AI)
  const related = useMemo(() => {
    if (!data.process_id) return null
    const controls = allControls.filter(c => processControlIds.includes(c.id))
    const incidentsOnProcess = allIncidents.filter(i => i.process_id === data.process_id && i.id !== data.id)
    const cutoff = Date.now() - THREE_MONTHS_MS
    const recent = incidentsOnProcess.filter(i => new Date(i.occurrence_datetime || i.created_at).getTime() >= cutoff)
    const risks = allRisks.filter(r => (r.control_mapped_ids ?? []).some(cid => processControlIds.includes(cid)))
    return { controls, incidentsOnProcess, recent, risks }
  }, [data.process_id, data.id, processControlIds, allControls, allIncidents, allRisks])

  // Auto-fill discovery datetime on mount
  useEffect(() => {
    if (!data.discovery_datetime) {
      onChange({ ...data, discovery_datetime: new Date().toISOString() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const likelihood = data.likelihood ?? 3
  const impact = data.impact ?? 3
  const priority = useMemo(() => calcPriority(likelihood, impact), [likelihood, impact])
  const severity = useMemo(() => calcSeverity(likelihood, impact), [likelihood, impact])
  const pCfg = PRIORITY_CONFIG[priority]
  const sCfg = SEVERITY_CONFIG[severity]

  // Keep derived severity/priority in sync on the persisted record
  useEffect(() => {
    if (data.severity !== severity || data.priority !== priority) {
      onChange({ ...data, severity, priority })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, priority])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const newFiles: AttachedFile[] = Array.from(e.target.files).map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      uploaded_at: new Date().toISOString(),
    }))
    onChange({ ...data, attached_files: [...(data.attached_files ?? []), ...newFiles] })
  }

  function removeFile(id: string) {
    onChange({ ...data, attached_files: (data.attached_files ?? []).filter(f => f.id !== id) })
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'
  const labelCls = 'block text-xs font-medium mb-1.5'
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--brand-500)')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Summary <span className="text-red-400">*</span></label>
        <input autoFocus value={data.title ?? ''} onChange={e => onChange({ ...data, title: e.target.value })}
          placeholder="Qısa təsvir — Hadisəni bir cümlə ilə izah edin"
          className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Risk Category (parent) → Incident Category (dependent sub-category) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Risk Kateqoriyası</label>
          <select value={data.risk_category ?? ''}
            onChange={e => {
              const rc = (e.target.value || undefined) as RiskCategory | undefined
              const stillValid = rc ? incidentSubcategories(rc).includes(data.incident_category ?? '') : false
              onChange({ ...data, risk_category: rc, incident_category: stillValid ? data.incident_category : undefined })
            }}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="">— Seçin —</option>
            {RISK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>İnsident Kateqoriyası</label>
          <select value={data.incident_category ?? ''} disabled={!data.risk_category}
            onChange={e => onChange({ ...data, incident_category: e.target.value || undefined })}
            className={`${fieldCls} ${data.risk_category ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`} style={inputStyle}>
            <option value="">{data.risk_category ? '— Seçin —' : 'Əvvəlcə risk kateqoriyası'}</option>
            {incidentSubcategories(data.risk_category).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Description <span className="text-red-400">*</span></label>
        <textarea value={data.description ?? ''} onChange={e => onChange({ ...data, description: e.target.value })} rows={3}
          placeholder="Hadisənin təfərrüatları — nə baş verdi, harada, nə zaman..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Dates — occurrence (manual) + discovery (auto) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>
            <Calendar className="w-3 h-3 inline mr-1" />Baş Vermə Tarixi (manual)
          </label>
          <input type="datetime-local" value={data.occurrence_datetime ?? ''} max={nowLocalValue()}
            onChange={e => {
              const v = e.target.value
              const max = nowLocalValue()
              onChange({ ...data, occurrence_datetime: v && v > max ? max : v })
            }}
            className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>Gələcək tarix seçmək olmaz</p>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Aşkarlanma Vaxtı (avtomatik)</label>
          <input type="text" readOnly
            value={data.discovery_datetime ? new Date(data.discovery_datetime).toLocaleString('az-AZ') : '—'}
            className={`${fieldCls} opacity-60 cursor-not-allowed`} style={inputStyle} />
        </div>
      </div>

      {/* Reporter Structure → Person (dependent) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Reporter Structure</label>
          <select value={data.reporter_structure ?? ''}
            onChange={e => handleStructureChange(e.target.value)}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="">— Seçin —</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Reporter Person</label>
          <select value={data.reporter_person ?? ''}
            onChange={e => onChange({ ...data, reporter_person: e.target.value })}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="">{data.reporter_structure ? 'Şəxs seçin…' : 'Əvvəlcə struktur'}</option>
            {profiles.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Business Process linkage */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Business Process
      </p>
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>
          <Workflow className="w-3 h-3 inline mr-1" />Əlaqəli Proses
        </label>
        <select value={data.process_id ?? ''} onChange={e => onChange({ ...data, process_id: e.target.value || undefined })}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">— Seçin —</option>
          {processes.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
        </select>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>Kontrollar yalnız bu prosesin siyahısından seçilə bilər</p>
      </div>

      {related && (
        <div className="space-y-2">
          {related.recent.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/25 bg-amber-500/10">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">
                Diqqət: bu proses üzrə son 3 ayda <b>{related.recent.length}</b> insident qeydə alınıb
                {related.incidentsOnProcess.length > related.recent.length ? ` (ümumilikdə ${related.incidentsOnProcess.length})` : ''}.
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
              <p className="text-[9px] uppercase flex items-center gap-1" style={{ color: 'var(--muted-fg)' }}><Link2 className="w-2.5 h-2.5" /> Kontrollar</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{related.controls.length}</p>
            </div>
            <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
              <p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Əlaqəli risk</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{related.risks.length}</p>
            </div>
            <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--muted)' }}>
              <p className="text-[9px] uppercase" style={{ color: 'var(--muted-fg)' }}>Əlaqəli insident</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{related.incidentsOnProcess.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Affected Systems — dropdown (add) + chips */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Təsirlənmiş Sistemlər</label>
        <select value=""
          onChange={e => {
            const s = e.target.value
            if (!s) return
            const cur = data.affected_systems ?? []
            if (!cur.includes(s)) onChange({ ...data, affected_systems: [...cur, s] })
          }}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">— Sistem əlavə et —</option>
          {INCIDENT_SYSTEMS.filter(s => !(data.affected_systems ?? []).includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(data.affected_systems ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(data.affected_systems ?? []).map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ background: 'var(--brand-500)', color: '#fff' }}>
                {s}
                <button type="button" aria-label={`${s} sil`}
                  onClick={() => onChange({ ...data, affected_systems: (data.affected_systems ?? []).filter(x => x !== s) })}
                  className="hover:opacity-80 font-bold leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Likelihood & Impact */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Severity & Priority (Auto-Calculated)
      </p>
      <div className="grid grid-cols-2 gap-4">
        <RcsaDropdown label="Likelihood (1-5)" value={likelihood}
          options={LIKELIHOOD_OPTIONS}
          onChange={v => onChange({ ...data, likelihood: v })} />
        <RcsaDropdown label="Impact (1-5)" value={impact}
          options={IMPACT_OPTIONS}
          onChange={v => onChange({ ...data, impact: v })} />
      </div>

      {/* Auto Severity + Priority Badges (derived from likelihood × impact) */}
      <div className="flex items-center gap-2 p-3 rounded-xl flex-wrap" style={{ background: 'var(--muted)' }}>
        <Lock className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>Severity:</span>
        <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold border', sCfg.classes)}>{sCfg.label}</span>
        <AlertTriangle className="w-4 h-4 ml-2" style={{ color: 'var(--brand-500)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>Priority:</span>
        <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold border', pCfg.classes)}>{pCfg.label}</span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--muted-fg)' }}>
          Score: {likelihood} × {impact} = {likelihood * impact}
        </span>
      </div>
      <p className="text-[10px] -mt-2" style={{ color: 'var(--muted-fg)' }}>
        Severity və Priority eyni 5×5 matrisdən (Likelihood × Impact) hesablanır — risk register ilə eyni metodologiya.
      </p>

      {/* Loss Effect — amount + currency only (free-text description removed: amount is enough) */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Loss Effect
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>İtki Məbləği <span className="text-red-400">*</span></label>
          <input type="number" min={0} step="0.01" inputMode="decimal" value={data.loss_amount ?? ''}
            onChange={e => {
              const v = e.target.value
              onChange({ ...data, loss_amount: v === '' ? undefined : Math.max(0, Number(v)) })
            }}
            placeholder="0.00 (məcburi — yalnız rəqəm)" className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>İtki yoxdursa 0 yazın</p>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Valyuta</label>
          <select value={data.loss_currency ?? 'AZN'} onChange={e => onChange({ ...data, loss_currency: e.target.value })}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="AZN">AZN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      {/* Assign Investigator */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Assign Investigator</label>
        <select value={data.assigned_to ?? ''} onChange={e => onChange({ ...data, assigned_to: e.target.value })}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">Unassigned</option>
          {MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      </div>

      {/* File Attachment */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Attach Files
      </p>
      <div>
        <label className={cn(
          'flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
          'hover:border-sky-500/50'
        )} style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
          <Upload className="w-4 h-4" />
          <span className="text-xs">Fayl əlavə et (sürüklə və ya klikləyin)</span>
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
        </label>
        {(data.attached_files ?? []).length > 0 && (
          <div className="mt-2 space-y-1">
            {(data.attached_files ?? []).map(f => (
              <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--muted)' }}>
                <span className="text-xs truncate flex-1" style={{ color: 'var(--foreground)' }}>{f.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
                  {(f.size / 1024).toFixed(0)}KB
                </span>
                <button type="button" onClick={() => removeFile(f.id)}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10">
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
