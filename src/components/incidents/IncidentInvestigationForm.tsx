'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import type { Incident, OrgUnit, Risk, Control } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'

const ROOT_CAUSE_CATEGORIES = [
  { value: 'process',    label: 'Proses', desc: 'Proses çatışmazlığı / pozuntusu' },
  { value: 'technology', label: 'Texnologiya', desc: 'Sistem / proqram xətası' },
  { value: 'people',     label: 'İnsan amili', desc: 'Səhv / səhlənkarlıq' },
  { value: 'external',   label: 'Xarici', desc: 'Xarici təhdid / hadisə' },
] as const

interface Props {
  data: Partial<Incident>
  onChange: (data: Partial<Incident>) => void
}

export function IncidentInvestigationForm({ data, onChange }: Props) {
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [controls, setControls] = useState<Control[]>([])

  useEffect(() => {
    db.getOrgUnits().then(units =>
      setDepartments(units.filter(u => u.type === 'department' || u.type === 'division'))
    )
    db.getRisks().then(setRisks)
    db.getControls().then(setControls)
  }, [])

  // Auto-set investigation start
  useEffect(() => {
    if (!data.investigation_start) {
      onChange({ ...data, investigation_start: new Date().toISOString() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleDept(name: string) {
    const current = data.affected_departments ?? []
    const next = current.includes(name) ? current.filter(d => d !== name) : [...current, name]
    onChange({ ...data, affected_departments: next })
  }

  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors'
  const labelCls = 'block text-xs font-medium mb-1.5'
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--brand-500)')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')

  return (
    <div className="space-y-4">
      {/* Investigation Lead */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Araşdırma Rəhbəri</label>
        <select value={data.investigation_lead ?? ''}
          onChange={e => onChange({ ...data, investigation_lead: e.target.value })}
          className={`${fieldCls} cursor-pointer`} style={inputStyle}>
          <option value="">— Seçin —</option>
          {MOCK_USERS.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
        </select>
      </div>

      {/* Investigation Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Başlanğıc Tarixi</label>
          <input type="date" value={data.investigation_start?.split('T')[0] ?? ''}
            onChange={e => onChange({ ...data, investigation_start: e.target.value })}
            className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
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
          <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Əlaqəli Control</label>
          <select value={data.control_id ?? ''} onChange={e => onChange({ ...data, control_id: e.target.value || undefined })}
            className={`${fieldCls} cursor-pointer`} style={inputStyle}>
            <option value="">— Yoxdur —</option>
            {controls.map(c => <option key={c.id} value={c.id}>{c.control_id + ' · ' + c.title}</option>)}
          </select>
        </div>
      </div>

      {/* Root Cause Category */}
      <p className="text-[11px] font-bold uppercase tracking-wide pt-1" style={{ color: 'var(--brand-500)' }}>
        Root Cause Analysis
      </p>
      <div className="grid grid-cols-2 gap-2">
        {ROOT_CAUSE_CATEGORIES.map(cat => (
          <button key={cat.value} type="button"
            onClick={() => onChange({ ...data, root_cause_category: cat.value })}
            className={cn('p-3 rounded-xl text-left transition-all border')}
            style={data.root_cause_category === cat.value
              ? { background: 'rgba(14,165,233,0.1)', borderColor: 'var(--brand-500)', color: 'var(--foreground)' }
              : { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--muted-fg)' }
            }>
            <p className="text-xs font-semibold">{cat.label}</p>
            <p className="text-[10px] mt-0.5 opacity-70">{cat.desc}</p>
          </button>
        ))}
      </div>

      {/* Root Cause Detail */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Root Cause Təfərrüatı</label>
        <textarea value={data.root_cause ?? ''} onChange={e => onChange({ ...data, root_cause: e.target.value })} rows={3}
          placeholder="Əsas səbəbi ətraflı izah edin..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Investigation Notes */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Araşdırma Qeydləri</label>
        <textarea value={data.investigation_notes ?? ''} onChange={e => onChange({ ...data, investigation_notes: e.target.value })} rows={3}
          placeholder="Araşdırma prosesi, tapıntılar, sübutlar..."
          className={`${fieldCls} resize-none`} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Affected Systems */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Təsirlənmiş Sistemlər</label>
        <input value={(data.affected_systems ?? []).join(', ')}
          onChange={e => onChange({ ...data, affected_systems: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          placeholder="CRM, ERP, Core Banking... (vergüllə ayırın)"
          className={fieldCls} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {/* Affected Departments */}
      <div>
        <label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Təsirlənmiş Departamentlər</label>
        <div className="flex flex-wrap gap-1.5">
          {departments.map(d => {
            const on = (data.affected_departments ?? []).includes(d.name)
            return (
              <button key={d.id} type="button" onClick={() => toggleDept(d.name)}
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
    </div>
  )
}
