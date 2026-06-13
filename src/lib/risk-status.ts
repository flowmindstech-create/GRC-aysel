// Single source of truth for risk statuses.
// Pipeline: Open → Backlog → In Progress → Review → Done → Solved

export const RISK_STATUSES = [
  { value: 'open', label: 'Open', cls: 'bg-red-500/10 text-red-500' },
  { value: 'backlog', label: 'Backlog', cls: 'bg-slate-500/10 text-slate-400' },
  { value: 'in_progress', label: 'In Progress', cls: 'bg-blue-500/10 text-blue-500' },
  { value: 'review', label: 'Review', cls: 'bg-amber-500/10 text-amber-500' },
  { value: 'done', label: 'Done', cls: 'bg-green-500/10 text-green-500' },
  { value: 'solved', label: 'Solved', cls: 'bg-emerald-500/10 text-emerald-400' },
] as const

export type RiskStatus = (typeof RISK_STATUSES)[number]['value']

export const RISK_STATUS_VALUES = RISK_STATUSES.map((s) => s.value) as RiskStatus[]

export const STATUS_LABELS: Record<RiskStatus, string> = Object.fromEntries(
  RISK_STATUSES.map((s) => [s.value, s.label])
) as Record<RiskStatus, string>

export const STATUS_CLASSES: Record<RiskStatus, string> = Object.fromEntries(
  RISK_STATUSES.map((s) => [s.value, s.cls])
) as Record<RiskStatus, string>

// Statuses considered "active" (not finished) — used for dashboard open counts.
export const ACTIVE_STATUSES: RiskStatus[] = ['open', 'backlog', 'in_progress', 'review']

// Maps removed/legacy status values to the current pipeline.
const LEGACY_STATUS_MAP: Record<string, RiskStatus> = {
  mitigated: 'done',
  accepted: 'solved',
  closed: 'solved',
}

export function normalizeStatus(value: string | undefined | null): RiskStatus {
  if (!value) return 'open'
  if (RISK_STATUS_VALUES.includes(value as RiskStatus)) return value as RiskStatus
  return LEGACY_STATUS_MAP[value] ?? 'open'
}

export function statusLabel(value: string | undefined | null): string {
  return STATUS_LABELS[normalizeStatus(value)]
}
