import { cn } from '@/lib/utils'
import type { RiskLevel, IncidentSeverity, ControlStatus, AuditStatus, VendorStatus, FindingSeverity, RiskStatus, IncidentStatus } from '@/types'

// ─── Risk Level Badge ─────────────────────────────────────────────────────────
const riskLevelStyles: Record<RiskLevel, string> = {
  critical: 'bg-red-500/15 text-red-500 border-red-500/30',
  high:     'bg-orange-500/15 text-orange-500 border-orange-500/30',
  medium:   'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  low:      'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
}

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize',
      riskLevelStyles[level]
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', {
        'bg-red-500':    level === 'critical',
        'bg-orange-500': level === 'high',
        'bg-yellow-500': level === 'medium',
        'bg-green-500':  level === 'low',
      })} />
      {level}
    </span>
  )
}

// ─── Risk Status Badge ────────────────────────────────────────────────────────
const riskStatusStyles: Record<RiskStatus, string> = {
  open:        'bg-red-500/10 text-red-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  mitigated:   'bg-green-500/10 text-green-500',
  accepted:    'bg-sky-500/10 text-sky-400',
  closed:      'bg-slate-500/10 text-slate-500',
}
const riskStatusLabels: Record<RiskStatus, string> = {
  open: 'Open', in_progress: 'In Progress', mitigated: 'Mitigated', accepted: 'Accepted', closed: 'Closed',
}

export function RiskStatusBadge({ status }: { status: RiskStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', riskStatusStyles[status])}>
      {riskStatusLabels[status]}
    </span>
  )
}

// ─── Incident Severity Badge ──────────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: IncidentSeverity | FindingSeverity }) {
  return <RiskLevelBadge level={severity as RiskLevel} />
}

// ─── Incident Status Badge ────────────────────────────────────────────────────
const incidentStatusStyles: Record<IncidentStatus, string> = {
  open:          'bg-red-500/10 text-red-500',
  investigating: 'bg-orange-500/10 text-orange-500',
  contained:     'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  resolved:      'bg-green-500/10 text-green-500',
  closed:        'bg-slate-500/10 text-slate-500',
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const label = status.replace('_', ' ')
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', incidentStatusStyles[status])}>
      {label}
    </span>
  )
}

// ─── Control Status Badge ─────────────────────────────────────────────────────
const controlStatusStyles: Record<ControlStatus, string> = {
  pass:    'bg-green-500/10 text-green-500 border-green-500/20',
  fail:    'bg-red-500/10 text-red-500 border-red-500/20',
  partial: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  na:      'bg-slate-500/10 text-slate-500 border-slate-500/20',
}

export function ControlStatusBadge({ status }: { status: ControlStatus }) {
  const labels = { pass: 'Pass', fail: 'Fail', partial: 'Partial', na: 'N/A' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', controlStatusStyles[status])}>
      {labels[status]}
    </span>
  )
}

// ─── Audit Status Badge ───────────────────────────────────────────────────────
const auditStatusStyles: Record<AuditStatus, string> = {
  planned:     'bg-blue-500/10 text-blue-500',
  in_progress: 'bg-orange-500/10 text-orange-500',
  completed:   'bg-green-500/10 text-green-500',
  cancelled:   'bg-slate-500/10 text-slate-500',
}

export function AuditStatusBadge({ status }: { status: AuditStatus }) {
  const label = status.replace('_', ' ')
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', auditStatusStyles[status])}>
      {label}
    </span>
  )
}

// ─── Vendor Status Badge ──────────────────────────────────────────────────────
const vendorStatusStyles: Record<VendorStatus, string> = {
  active:       'bg-green-500/10 text-green-500',
  inactive:     'bg-slate-500/10 text-slate-500',
  under_review: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  terminated:   'bg-red-500/10 text-red-500',
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const label = status.replace('_', ' ')
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', vendorStatusStyles[status])}>
      {label}
    </span>
  )
}

