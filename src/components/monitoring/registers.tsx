'use client'

import type { KRIItem, KCIItem, KPIItem, Control } from '@/types'
import { CATEGORY_LABELS } from '@/lib/risk-categories'
import { monitoringStatusAz, effectivenessAz, frequencyAz } from '@/lib/labels'
import { RegisterTable, Mono, Muted, Name, StatusPill } from './RegisterTable'
import type { RegisterColumn, RegisterGroup } from './RegisterTable'

// RAS reyestrinin sütun quruluşu KPI/KRI/KCI üçün uyğunlaşdırılıb.
// "Appetite" və "Appetite Statement" sütunları bilərəkdən yoxdur — onlar
// yalnız Risk Appetite modulunda mənalıdır.

const DASH = <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>
const txt = (v?: string | null) => v ? <Muted clamp={3}>{v}</Muted> : DASH
const num = (v?: number | null, color?: string) =>
  v === undefined || v === null ? DASH : <Mono color={color}>{Number(v).toFixed(2)}</Mono>

const GREEN = '#059669', AMBER = '#d97706', RED = '#e11d48'
const th = (v?: string, color?: string) =>
  <span className="text-[11px] whitespace-nowrap" style={{ color: color ?? 'var(--muted-fg)' }}>{v ?? '—'}</span>

const STATUS_RGB: Record<string, string> = {
  green: '5,150,105', amber: '217,119,6', red: '225,29,72',
  effective: '5,150,105', partially_effective: '217,119,6', ineffective: '225,29,72',
}
// Status xanası məzmundur — Azərbaycanca göstərilir, enum dəyəri dəyişmir.
// KRI/KPI svetofor dəyərləri (green/amber/red), KCI isə effektivlik dəyərləri
// işlədir, ona görə etiket iki lüğətdən uyğun olanı ilə götürülür.
const TRAFFIC = new Set(['green', 'amber', 'red'])
const pill = (s?: string) => {
  if (!s) return DASH
  const label = TRAFFIC.has(s) ? monitoringStatusAz(s) : effectivenessAz(s)
  return <StatusPill label={label} rgb={STATUS_RGB[s] ?? '113,113,122'} />
}

// Dövrilik, test üsulu, nəzarət növü — hamısı eyni sadə mətn kimi göstərilir
const capText = (f?: string) =>
  f ? <span className="text-[11px] capitalize whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{f}</span> : DASH

// ── KRI ─────────────────────────────────────────────────────────────────────

export function KriRegister({ rows }: { rows: KRIItem[] }) {
  // Rüb blokları datadan gəlir; RAS-dan gələn sətirlərdə Q1/Q2 doludur.
  const periods = Array.from(new Set(rows.flatMap(r => Object.keys(r.period_values ?? {})))).sort()

  const lead: RegisterColumn<KRIItem>[] = [
    { key: 'cat', label: 'Risk Area', value: r => r.risk_category
        ? <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{CATEGORY_LABELS[r.risk_category] ?? r.risk_category}</span>
        : DASH },
    { key: 'name', label: 'Indicator', value: r => <Name title={r.name} sub={r.kri_id} /> },
    { key: 'formula', label: 'Formula', wide: true, value: r => txt(r.formula) },
    { key: 'freq', label: 'Frequency', value: r => capText(frequencyAz(r.frequency)) },
    { key: 'unit', label: 'Unit', value: r => r.unit ? <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{r.unit}</span> : DASH },
  ]

  const groups: RegisterGroup<KRIItem>[] = [
    { label: 'Thresholds', columns: [
      { key: 'g', label: 'Green', value: r => th(r.threshold_green, GREEN) },
      { key: 'a', label: 'Amber', value: r => th(r.threshold_amber, AMBER) },
      { key: 'r', label: 'Red',   value: r => th(r.threshold_red, RED) },
    ] },
    ...periods.map(p => ({
      label: p,
      columns: [0, 1, 2].map(i => ({
        key: `${p}-${i}`, label: `M${i + 1}`,
        value: (r: KRIItem) => num((r.period_values?.[p] ?? [])[i] ?? null),
      })),
    })),
  ]

  const trail: RegisterColumn<KRIItem>[] = [
    { key: 'status', label: 'Status', value: r => pill(r.current_status) },
    { key: 'owner', label: 'Risk Owner', value: r => txt(r.risk_owner) },
    { key: 'src', label: 'Data Source', value: r => txt(r.data_source) },
    { key: 'note', label: 'Note', wide: true, value: r => txt(r.note) },
  ]

  return <RegisterTable rows={rows} rowKey={r => r.id} lead={lead} groups={groups} trail={trail}
    empty="No KRI records" />
}

// ── KCI ─────────────────────────────────────────────────────────────────────

export function KciRegister({ rows, controls = [] }: { rows: KCIItem[]; controls?: Control[] }) {
  // kci_items.control_id controls(id)-ə UUID istinadıdır — sətirdə xam UUID
  // göstərmək mənasızdır, ona görə nəzarətin kodu ilə əvəz olunur.
  const codeOf = (id?: string) => id ? controls.find(c => c.id === id)?.control_id : undefined
  const lead: RegisterColumn<KCIItem>[] = [
    { key: 'name', label: 'Indicator', value: r => <Name title={r.name} sub={codeOf(r.control_id)} /> },
    { key: 'obj', label: 'Objective', wide: true, value: r => txt(r.objective ?? r.description) },
    { key: 'type', label: 'Control Type', value: r => r.control_type
        ? <span className="text-[11px] capitalize whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{r.control_type}</span> : DASH },
    { key: 'method', label: 'Test Method', value: r => capText(r.test_method) },
    { key: 'freq', label: 'Frequency', value: r => capText(frequencyAz(r.frequency)) },
  ]

  const groups: RegisterGroup<KCIItem>[] = [
    { label: 'Thresholds', columns: [
      { key: 'e', label: 'Effective',   value: r => th(r.threshold_effective, GREEN) },
      { key: 'p', label: 'Partial',     value: r => th(r.threshold_partial, AMBER) },
      { key: 'i', label: 'Ineffective', value: r => th(r.threshold_ineffective, RED) },
    ] },
    { label: 'Result', columns: [
      { key: 'succ', label: 'Success %', value: r => num(r.success_rate) },
      { key: 'fail', label: 'Failure %', value: r => num(r.failure_rate) },
      { key: 'eff',  label: 'Rating',    value: r => num(r.effectiveness_rating) },
    ] },
  ]

  const trail: RegisterColumn<KCIItem>[] = [
    { key: 'status', label: 'Status', value: r => pill(r.current_status) },
    { key: 'src', label: 'Evidence Source', value: r => txt(r.evidence_source) },
    { key: 'last', label: 'Last Test', value: r => r.last_test_date
        ? <Mono color="var(--muted-fg)">{new Date(r.last_test_date).toLocaleDateString('az-AZ')}</Mono> : DASH },
  ]

  return <RegisterTable rows={rows} rowKey={r => r.id} lead={lead} groups={groups} trail={trail}
    empty="No KCI records" />
}

// ── KPI ─────────────────────────────────────────────────────────────────────

export function KpiRegister({ rows }: { rows: KPIItem[] }) {
  const lead: RegisterColumn<KPIItem>[] = [
    { key: 'name', label: 'Indicator', value: r => <Name title={r.name} sub={r.related_process} /> },
    { key: 'desc', label: 'Description', wide: true, value: r => txt(r.description) },
    { key: 'formula', label: 'Formula', wide: true, value: r => txt(r.formula) },
    { key: 'freq', label: 'Frequency', value: r => capText(frequencyAz(r.frequency)) },
  ]

  const groups: RegisterGroup<KPIItem>[] = [
    { label: 'Thresholds', columns: [
      { key: 'g', label: 'Green', value: r => th(r.threshold_green, GREEN) },
      { key: 'a', label: 'Amber', value: r => th(r.threshold_amber, AMBER) },
      { key: 'r', label: 'Red',   value: r => th(r.threshold_red, RED) },
    ] },
    { label: 'Measurement', columns: [
      { key: 'target', label: 'Target',   value: r => num(r.target_value) },
      { key: 'cur',    label: 'Current',  value: r => num(r.current_value) },
      { key: 'prev',   label: 'Previous', value: r => num(r.previous_value, 'var(--muted-fg)') },
    ] },
  ]

  const trail: RegisterColumn<KPIItem>[] = [
    { key: 'status', label: 'Status', value: r => pill(r.performance_status) },
    { key: 'sla', label: 'SLA Target', value: r => txt(r.sla_target) },
    { key: 'review', label: 'Next Review', value: r => r.next_review_date
        ? <Mono color="var(--muted-fg)">{new Date(r.next_review_date).toLocaleDateString('az-AZ')}</Mono> : DASH },
  ]

  return <RegisterTable rows={rows} rowKey={r => r.id} lead={lead} groups={groups} trail={trail}
    empty="No KPI records" />
}
