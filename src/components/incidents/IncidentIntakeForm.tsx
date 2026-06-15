'use client'

import { useState, useMemo, useEffect } from 'react'
import { Upload, X, Calendar, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import type { Incident, IncidentPriority, AttachedFile, OrgUnit } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'

// ── Priority calculator ─────────────────────────────────────────────────────
export function calcPriority(likelihood: number, impact: number): IncidentPriority {
  const score = likelihood * impact
  if (score >= 20) return 'P1_critical'
  if (score >= 15) return 'P2_high'
  if (score >= 10) return 'P3_medium'
  if (score >= 5) return 'P4_low'
  return 'P5_minimal'
}

export const PRIORITY_CONFIG: Record<IncidentPriority, { label: string; classes: string }> = {
  P1_critical: { label: 'P1 — Critical', classes: 'bg-red-500/15 text-red-400 border-red-500/25' },
  P2_high: { label: 'P2 — High', classes: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  P3_medium: { label: 'P3 — Medium', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  P4_low: { label: 'P4 — Low', classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  P5_minimal: { label: 'P5 — Minimal', classes: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
}

const LIKELIHOOD_DESC = [
  'Nadir (1-2%)', 'Az ehtimallı (3-10%)', 'Mümkün (11-20%)', 'Ehtimallı (21-50%)', 'Demək olar ki mütləq (>50%)',
]
const IMPACT_DESC = [
  'Cüzi təsir', 'Kiçik təsir', 'Mülayim təsir', 'Əhəmiyyətli təsir', 'Fəlakətli təsir',
]

// ── Rating Scale Component ──────────────────────────────────────────────────
function RatingScale({ label, value, onChange, descriptions }: {
  label: string; value: number; onChange: (v: number) => void; descriptions: string[]
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{label}</label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={cn(
              'w-10 h-10 rounded-lg text-sm font-bold transition-all',
              value === n
                ? 'text-white scale-110 shadow-lg'
                : 'hover:brightness-110'
            )}
            style={
              value === n
                ? { background: 'var(--brand-500)', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }
                : { background: 'var(--muted)', color: 'var(--muted-fg)' }
            }>{n}</button>
        ))}
      </div>
      <p className="text-[10px] mt-1.5" style={{ color: 'var(--muted-fg)' }}>{descriptions[value - 1]}</p>
    </div>
  )
}

// ── Main Intake Form ────────────────────────────────────────────────────────
interface Props {
  data: Partial<Incident>
  onChange: (data: Partial<Incident>) => void
}

export function IncidentIntakeForm({ data, onChange }: Props) {
  const [departments, setDepartments] = useState<OrgUnit[]>([])

  useEffect(() => {
    db.getOrgUnits().then(units =>
      setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    )
  }, [])

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
  const pCfg = PRIORITY_CONFIG[priority]

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
          <input type="datetime-local" value={data.occurrence_datetime ?? ''}
            onChange={e => onChange({ ...data, occurrence_datetime: e.target.value })}
            className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Aşkarlanma Vaxtı (avtomatik)</label>
          <input type="text" readOnly
            value={data.discovery_datetime ? new Date(data.discovery_datetime).toLocaleString('az-AZ') : '—'}
            className={`${fieldCls} opacity-60 cursor-not-allowed`} style={inputStyle} />
        </div>
      </div>

      {/* Reporter Structure */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Reporter Structure (avtomatik)</label>
        <select value={data.reporter_structure ?? ''}
          onChange={e => onChange({ ...data, reporter_structure: e.target.value })}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">— Seçin —</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>Mail əsasında avtomatik doldurulur</p>
      </div>

      {/* Severity (5-level) */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Severity</label>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
          {(['minimal', 'low', 'medium', 'high', 'critical'] as const).map(s => (
            <button key={s} type="button" onClick={() => onChange({ ...data, severity: s })}
              className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all')}
              style={data.severity === s
                ? { background: 'var(--brand-500)', color: '#fff' }
                : { color: 'var(--muted-fg)' }
              }>{s}</button>
          ))}
        </div>
      </div>

      {/* Likelihood & Impact */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Priority (Auto-Calculated)
      </p>
      <div className="grid grid-cols-2 gap-4">
        <RatingScale label="Likelihood (1-5)" value={likelihood}
          onChange={v => onChange({ ...data, likelihood: v, priority: calcPriority(v, impact) })}
          descriptions={LIKELIHOOD_DESC} />
        <RatingScale label="Impact (1-5)" value={impact}
          onChange={v => onChange({ ...data, impact: v, priority: calcPriority(likelihood, v) })}
          descriptions={IMPACT_DESC} />
      </div>

      {/* Auto Priority Badge */}
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
          Calculated Priority:
        </span>
        <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold border', pCfg.classes)}>
          {pCfg.label}
        </span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--muted-fg)' }}>
          Score: {likelihood} × {impact} = {likelihood * impact}
        </span>
      </div>

      {/* Loss Effect */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Loss Effect
      </p>
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Maliyyə İtkisi Təsviri</label>
        <textarea value={data.loss_effect ?? ''} onChange={e => onChange({ ...data, loss_effect: e.target.value })} rows={2}
          placeholder="Hansı itkilər baş verdi və ya gözlənilir..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>İtki Məbləği</label>
          <input type="number" value={data.loss_amount ?? ''} onChange={e => onChange({ ...data, loss_amount: Number(e.target.value) || undefined })}
            placeholder="0.00" className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
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
