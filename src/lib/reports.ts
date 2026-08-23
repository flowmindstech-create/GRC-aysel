import { db } from './db'
import { dbExt } from './db-extensions'
import { CATEGORY_LABELS } from './risk-categories'
import { ratingFromScore } from './rcsa'
import { isOpenRisk } from './visibility'
import type { Control, Incident, Risk } from '@/types'

// Hesabatlar heç nə saxlamır — hər dəfə modulların canlı məlumatından qurulur,
// ona görə reyestrdə edilən dəyişiklik növbəti açılışda hesabatda görünür.

export type Tone = 'ok' | 'warn' | 'crit' | 'neutral'

export interface ReportMetric {
  label: string
  value: string | number
  tone?: Tone
  hint?: string
}

export interface ReportSection {
  title: string
  /** Cədvəl boş çıxdıqda göstərilən izah */
  empty?: string
  metrics?: ReportMetric[]
  columns?: string[]
  rows?: (string | number)[][]
  /** Cədvəl sətirlərinin tonu — sətir indeksi ilə eyni sırada */
  rowTones?: Tone[]
  note?: string
}

export interface GeneratedReport {
  definitionId: string
  title: string
  subtitle: string
  generatedAt: string
  sections: ReportSection[]
}

export interface ReportDefinition {
  id: string
  name: string
  description: string
  /** Hansı modullardan yığılır — kartda göstərilir */
  sources: string[]
  build: () => Promise<GeneratedReport>
}

// ── köməkçilər ──────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('az-AZ') : '—'
const pct = (n: number, d: number) => d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`
const num = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined ? '—' : Number(v).toFixed(digits)

function head(definitionId: string, title: string, subtitle: string, sections: ReportSection[]): GeneratedReport {
  return { definitionId, title, subtitle, generatedAt: new Date().toISOString(), sections }
}

const OPEN_INCIDENT = (i: Incident) => i.status !== 'done' && i.status !== 'closed'

// ── 1. Risk İştahası (RAS) hesabatı ────────────────────────────────────────

async function buildRasReport(): Promise<GeneratedReport> {
  const [kris, statements] = await Promise.all([dbExt.getKRIItems(), db.getRiskAppetite()])
  const ras = kris.filter(k => (k.kri_id ?? '').startsWith('RAS-'))
  const breach = ras.filter(k => k.appetite_breach || k.current_status === 'red')
  const amber = ras.filter(k => k.current_status === 'amber')

  const byArea = new Map<string, number>()
  for (const k of ras) {
    const label = k.risk_category ? (CATEGORY_LABELS[k.risk_category] ?? k.risk_category) : '—'
    byArea.set(label, (byArea.get(label) ?? 0) + 1)
  }

  return head('ras', 'Risk İştahası Hesabatı', 'RAS göstəricilərinin cari vəziyyəti və limit pozuntuları', [
    {
      title: 'Xülasə',
      metrics: [
        { label: 'Göstərici', value: ras.length },
        { label: 'Bəyanat', value: statements.length },
        { label: 'Limit pozuntusu', value: breach.length, tone: breach.length ? 'crit' : 'ok' },
        { label: 'Xəbərdarlıq zonası', value: amber.length, tone: amber.length ? 'warn' : 'ok' },
      ],
    },
    {
      title: 'Risk sahələri üzrə bölgü',
      columns: ['Risk sahəsi', 'Göstərici sayı'],
      rows: [...byArea.entries()].sort((a, b) => b[1] - a[1]),
      empty: 'Göstərici yoxdur',
    },
    {
      title: 'Diqqət tələb edən göstəricilər',
      columns: ['Kod', 'Göstərici', 'Cari', 'Əvvəlki', 'Yaşıl', 'Sarı', 'Qırmızı', 'Sahib'],
      rows: [...breach, ...amber].map(k => [
        k.kri_id ?? '—', k.name, num(k.current_value), num(k.previous_value),
        k.threshold_green ?? '—', k.threshold_amber ?? '—', k.threshold_red ?? '—', k.risk_owner ?? '—',
      ]),
      rowTones: [...breach.map(() => 'crit' as Tone), ...amber.map(() => 'warn' as Tone)],
      empty: 'Bütün göstəricilər iştaha daxilindədir',
      note: 'Limit pozuntusu və xəbərdarlıq zonasındakı göstəricilər. Yaşıl zonadakılar siyahıya salınmır.',
    },
  ])
}

// ── 2. Nəzarət effektivliyi hesabatı ────────────────────────────────────────

async function buildControlReport(): Promise<GeneratedReport> {
  const controls = await db.getControls()
  const scored = controls.filter(c => c.effectiveness_score !== undefined && c.effectiveness_score !== null)
  const avg = scored.length
    ? scored.reduce((s, c) => s + Number(c.effectiveness_score), 0) / scored.length
    : null
  const untested = controls.filter(c => !c.last_tested_at)
  const failing = controls.filter(c => c.status === 'fail' || c.effectiveness_rating === 'ineffective')

  const weakest = [...scored]
    .sort((a, b) => Number(b.effectiveness_score) - Number(a.effectiveness_score))
    .slice(0, 10)

  const byFramework = new Map<string, { total: number; passed: number }>()
  for (const c of controls) {
    const e = byFramework.get(c.framework) ?? { total: 0, passed: 0 }
    e.total++
    if (c.status === 'pass') e.passed++
    byFramework.set(c.framework, e)
  }

  return head('controls', 'Nəzarət Effektivliyi Hesabatı',
    'Dizayn və tətbiq balları, test nəticələri və zəif nəzarətlər', [
    {
      title: 'Xülasə',
      metrics: [
        { label: 'Nəzarət', value: controls.length },
        { label: 'Orta effektivlik', value: avg === null ? '—' : avg.toFixed(2),
          tone: avg === null ? 'neutral' : avg <= 2.5 ? 'ok' : avg <= 3.5 ? 'warn' : 'crit',
          hint: '1 = güclü, 5 = zəif' },
        { label: 'Qiymətləndirilməyib', value: controls.length - scored.length,
          tone: controls.length - scored.length ? 'warn' : 'ok' },
        { label: 'Test edilməyib', value: untested.length, tone: untested.length ? 'warn' : 'ok' },
        { label: 'Uğursuz', value: failing.length, tone: failing.length ? 'crit' : 'ok' },
      ],
    },
    {
      title: 'Çərçivələr üzrə',
      columns: ['Çərçivə', 'Nəzarət', 'Keçən', 'Faiz'],
      rows: [...byFramework.entries()].map(([fw, e]) => [fw, e.total, e.passed, pct(e.passed, e.total)]),
      empty: 'Nəzarət yoxdur',
    },
    {
      title: 'Ən zəif nəzarətlər',
      columns: ['Kod', 'Nəzarət', 'Dizayn', 'Tətbiq', 'Effektivlik', 'Qiymət', 'Son yoxlama'],
      rows: weakest.map(c => [
        c.control_id, c.title,
        num(c.design_score, 2), num(c.implementation_score, 2), num(c.effectiveness_score, 2),
        ratingFromScore(Number(c.effectiveness_score)).label, fmtDate(c.last_tested_at),
      ]),
      rowTones: weakest.map(c => {
        const s = Number(c.effectiveness_score)
        return s <= 2.5 ? 'ok' : s <= 3.5 ? 'warn' : 'crit'
      }),
      empty: 'Hələ heç bir nəzarət qiymətləndirilməyib — Control Checklist-də bal verin',
      note: 'Effektivlik dizayn və tətbiq ballarının ortalamasıdır. Böyük bal daha zəif deməkdir.',
    },
  ])
}

// ── 3. Uyğunluq (Compliance) hesabatı ───────────────────────────────────────

async function buildComplianceReport(): Promise<GeneratedReport> {
  const [obligations, counts] = await Promise.all([db.getObligations(), db.getObligationLinkCounts()])
  const by = (s: string) => obligations.filter(o => o.status === s)
  const overdue = obligations.filter(o =>
    o.next_review_date && o.status !== 'not_applicable' && new Date(o.next_review_date) < new Date())

  return head('compliance', 'Uyğunluq Hesabatı',
    'Öhdəliklərin statusu, nəzarətlərlə əlaqəsi və gecikmiş baxışlar', [
    {
      title: 'Xülasə',
      metrics: [
        { label: 'Öhdəlik', value: obligations.length },
        { label: 'Uyğun', value: by('compliant').length, tone: 'ok' },
        { label: 'Uyğun deyil', value: by('non_compliant').length, tone: by('non_compliant').length ? 'crit' : 'ok' },
        { label: 'Baxışda', value: by('under_review').length, tone: 'warn' },
        { label: 'Gecikmiş baxış', value: overdue.length, tone: overdue.length ? 'crit' : 'ok' },
      ],
    },
    {
      title: 'Öhdəlik reyestri',
      columns: ['Kod', 'Öhdəlik', 'Status', 'Kritiklik', 'Məsul', 'Nəzarət', 'Növbəti baxış'],
      rows: obligations.map(o => [
        o.obligation_code ?? '—', o.title, String(o.status).replace(/_/g, ' '),
        o.criticality ?? '—', o.responsible_party ?? '—',
        counts[o.id]?.controls ?? 0, fmtDate(o.next_review_date),
      ]),
      rowTones: obligations.map(o =>
        o.status === 'non_compliant' ? 'crit' : o.status === 'under_review' ? 'warn' : 'ok'),
      empty: 'Öhdəlik yoxdur',
      note: 'Nəzarət sütunu öhdəliyə bağlanmış nəzarətlərin sayıdır. 0 olması nəzarətsiz öhdəlik deməkdir.',
    },
  ])
}

// ── 4. İnsident hesabatı ────────────────────────────────────────────────────

async function buildIncidentReport(): Promise<GeneratedReport> {
  const incidents = await db.getIncidents()
  const open = incidents.filter(OPEN_INCIDENT)
  const critical = open.filter(i => i.severity === 'critical')
  const high = open.filter(i => i.severity === 'high')

  const bySeverity = ['critical', 'high', 'medium', 'low'].map(sev => {
    const all = incidents.filter(i => i.severity === sev)
    return [sev, all.length, all.filter(OPEN_INCIDENT).length, all.length - all.filter(OPEN_INCIDENT).length]
  })

  return head('incidents', 'İnsident Hesabatı',
    'Açıq insidentlər, ciddilik bölgüsü və həll vəziyyəti', [
    {
      title: 'Xülasə',
      metrics: [
        { label: 'Ümumi', value: incidents.length },
        { label: 'Açıq', value: open.length, tone: open.length ? 'warn' : 'ok' },
        { label: 'Kritik (açıq)', value: critical.length, tone: critical.length ? 'crit' : 'ok' },
        { label: 'Yüksək (açıq)', value: high.length, tone: high.length ? 'warn' : 'ok' },
        { label: 'Bağlanma faizi', value: pct(incidents.length - open.length, incidents.length) },
      ],
    },
    {
      title: 'Ciddilik üzrə',
      columns: ['Ciddilik', 'Ümumi', 'Açıq', 'Bağlı'],
      rows: bySeverity,
      empty: 'İnsident yoxdur',
    },
    {
      title: 'Açıq insidentlər',
      columns: ['Başlıq', 'Ciddilik', 'Status', 'Mərhələ', 'Məsul', 'Açılıb'],
      rows: open.map(i => [
        i.title, i.severity ?? '—', String(i.status).replace(/_/g, ' '),
        String(i.workflow_stage ?? '—').replace(/_/g, ' '),
        i.assigned_name ?? '—', fmtDate(i.created_at),
      ]),
      rowTones: open.map(i => i.severity === 'critical' ? 'crit' : i.severity === 'high' ? 'warn' : 'neutral'),
      empty: 'Açıq insident yoxdur',
    },
  ])
}

// ── 5. Rəhbərlik üçün icmal ─────────────────────────────────────────────────

async function buildExecutiveReport(): Promise<GeneratedReport> {
  const [risks, incidents, controls, obligations, kris] = await Promise.all([
    db.getRisks(), db.getIncidents(), db.getControls(), db.getObligations(), dbExt.getKRIItems(),
  ])

  // Açıq risk tərifi bütün app-da eynidir — visibility.ts tək mənbədir.
  const openRisks = risks.filter(isOpenRisk)
  const highRisks = openRisks.filter(r => r.level === 'critical' || r.level === 'high')
  const openIncidents = incidents.filter(OPEN_INCIDENT)
  const scored = controls.filter((c: Control) => c.effectiveness_score != null)
  const avgEff = scored.length
    ? scored.reduce((s, c) => s + Number(c.effectiveness_score), 0) / scored.length : null
  const breach = kris.filter(k => k.appetite_breach || k.current_status === 'red')
  const nonCompliant = obligations.filter(o => o.status === 'non_compliant')

  const attention: (string | number)[][] = []
  const tones: Tone[] = []
  if (breach.length)        { attention.push(['Risk iştahası', `${breach.length} göstərici limiti pozub`, 'Risk Appetite']); tones.push('crit') }
  if (nonCompliant.length)  { attention.push(['Uyğunluq', `${nonCompliant.length} öhdəlik uyğun deyil`, 'Compliance']); tones.push('crit') }
  if (highRisks.length)     { attention.push(['Risk reyestri', `${highRisks.length} yüksək/kritik açıq risk`, 'Risk Register']); tones.push('warn') }
  if (openIncidents.length) { attention.push(['İnsidentlər', `${openIncidents.length} açıq insident`, 'Incidents']); tones.push('warn') }
  if (avgEff !== null && avgEff > 3.5) { attention.push(['Nəzarətlər', `Orta effektivlik ${avgEff.toFixed(2)} — zəif`, 'Control Library']); tones.push('crit') }

  return head('executive', 'Rəhbərlik üçün İcmal',
    'Bütün modullardan yığılmış bir səhifəlik vəziyyət', [
    {
      title: 'Əsas göstəricilər',
      metrics: [
        { label: 'Açıq risk', value: openRisks.length },
        { label: 'Yüksək/kritik risk', value: highRisks.length, tone: highRisks.length ? 'crit' : 'ok' },
        { label: 'Açıq insident', value: openIncidents.length, tone: openIncidents.length ? 'warn' : 'ok' },
        { label: 'Nəzarət', value: controls.length },
        { label: 'Orta effektivlik', value: avgEff === null ? '—' : avgEff.toFixed(2),
          tone: avgEff === null ? 'neutral' : avgEff <= 2.5 ? 'ok' : avgEff <= 3.5 ? 'warn' : 'crit' },
        { label: 'İştaha pozuntusu', value: breach.length, tone: breach.length ? 'crit' : 'ok' },
      ],
    },
    {
      title: 'Diqqət tələb edir',
      columns: ['Sahə', 'Vəziyyət', 'Modul'],
      rows: attention,
      rowTones: tones,
      empty: 'Diqqət tələb edən sahə yoxdur',
    },
    {
      title: 'Yüksək və kritik risklər',
      columns: ['Kod', 'Risk', 'Kateqoriya', 'Səviyyə', 'Status', 'Sahib'],
      rows: highRisks.map(r => [
        r.risk_code ?? '—', r.title,
        r.category ? (CATEGORY_LABELS[r.category] ?? r.category) : '—',
        r.level ?? '—', String(r.status ?? '—').replace(/_/g, ' '), r.owner_name ?? '—',
      ]),
      rowTones: highRisks.map(r => r.level === 'critical' ? 'crit' : 'warn'),
      empty: 'Yüksək və ya kritik açıq risk yoxdur',
    },
  ])
}

// ── Reyestr ─────────────────────────────────────────────────────────────────

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'executive',
    name: 'Rəhbərlik üçün İcmal',
    description: 'Risk, insident, nəzarət və uyğunluq vəziyyətinin bir səhifəlik xülasəsi.',
    sources: ['Risk Register', 'Incidents', 'Control Library', 'Compliance', 'Risk Appetite'],
    build: buildExecutiveReport,
  },
  {
    id: 'ras',
    name: 'Risk İştahası Hesabatı',
    description: 'RAS göstəriciləri, limit pozuntuları və xəbərdarlıq zonası.',
    sources: ['Risk Appetite', 'Monitoring'],
    build: buildRasReport,
  },
  {
    id: 'controls',
    name: 'Nəzarət Effektivliyi Hesabatı',
    description: 'Dizayn və tətbiq balları, çərçivələr üzrə keçmə faizi, ən zəif nəzarətlər.',
    sources: ['Control Library', 'Control Checklist'],
    build: buildControlReport,
  },
  {
    id: 'compliance',
    name: 'Uyğunluq Hesabatı',
    description: 'Öhdəliklərin statusu, nəzarət örtüyü və gecikmiş baxışlar.',
    sources: ['Compliance', 'Control Library'],
    build: buildComplianceReport,
  },
  {
    id: 'incidents',
    name: 'İnsident Hesabatı',
    description: 'Açıq insidentlər, ciddilik bölgüsü və bağlanma faizi.',
    sources: ['Incidents'],
    build: buildIncidentReport,
  },
]

export function reportToCsv(report: GeneratedReport): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = [esc(report.title), esc(report.subtitle), esc(`Hazırlandı: ${new Date(report.generatedAt).toLocaleString('az-AZ')}`), '']
  for (const sec of report.sections) {
    lines.push(esc(sec.title))
    if (sec.metrics?.length) {
      lines.push(sec.metrics.map(m => esc(m.label)).join(','))
      lines.push(sec.metrics.map(m => esc(m.value)).join(','))
    }
    if (sec.columns?.length) {
      lines.push(sec.columns.map(esc).join(','))
      for (const row of sec.rows ?? []) lines.push(row.map(esc).join(','))
    }
    if (sec.note) lines.push(esc(sec.note))
    lines.push('')
  }
  return lines.join('\n')
}
