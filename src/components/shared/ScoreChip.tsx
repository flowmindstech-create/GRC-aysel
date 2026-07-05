import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/types'

// Filled rounded score chip (GRC Sentinel style) — the number sits in a tinted
// square coloured by risk level. Used in registers next to likelihood/impact.
const LEVEL_STYLE: Record<RiskLevel, string> = {
  critical: 'bg-red-500/15 text-red-600',
  high:     'bg-orange-500/15 text-orange-600',
  medium:   'bg-amber-500/15 text-amber-600',
  low:      'bg-teal-500/15 text-teal-600',
  minimal:  'bg-slate-500/15 text-slate-600',
}

export function ScoreChip({ score, level, className }: { score: number | string; level: RiskLevel; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg text-sm font-bold tabular-nums',
      LEVEL_STYLE[level] ?? LEVEL_STYLE.minimal,
      className,
    )}>
      {score}
    </span>
  )
}
