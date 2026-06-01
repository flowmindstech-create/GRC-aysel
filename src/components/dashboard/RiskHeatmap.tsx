'use client'

import { motion } from 'framer-motion'
import type { DashboardStats } from '@/types'
import { cn } from '@/lib/utils'

interface RiskHeatmapProps {
  stats: DashboardStats
}

type Cell = { likelihood: number; impact: number; count: number }

// Build 5x5 heatmap from risk_by_level distribution (approximated)
function buildHeatmapData(): Cell[] {
  const cells: Cell[] = []
  for (let impact = 5; impact >= 1; impact--) {
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      // Distribute sample risks into approximate cells
      const score = likelihood * impact
      const count =
        (likelihood === 4 && impact === 5) ? 1 :  // critical
        (likelihood === 5 && impact === 5) ? 1 :  // critical
        (likelihood === 3 && impact === 4) ? 1 :  // high
        (likelihood === 4 && impact === 4) ? 1 :  // high
        (likelihood === 3 && impact === 3) ? 1 :  // medium
        (likelihood === 2 && impact === 3) ? 1 :  // medium
        (likelihood === 2 && impact === 2) ? 1 :  // low
        0
      cells.push({ likelihood, impact, count })
    }
  }
  return cells
}

function getCellColor(likelihood: number, impact: number) {
  const score = likelihood * impact
  if (score >= 16) return 'bg-red-500 text-white'
  if (score >= 9)  return 'bg-orange-500 text-white'
  if (score >= 4)  return 'bg-yellow-400 text-slate-800'
  return 'bg-green-400 text-slate-800'
}

function getCellOpacity(count: number) {
  if (count === 0) return 'opacity-20'
  return 'opacity-100'
}

const AXIS_LABELS = ['1', '2', '3', '4', '5']

export function RiskHeatmap({ stats }: RiskHeatmapProps) {
  const cells = buildHeatmapData()

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Risk Heatmap</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>Likelihood × Impact matrix</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--muted-fg)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400" />Low</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-400" />Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500" />High</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" />Critical</span>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex items-center">
          <span className="text-[10px] -rotate-90 whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>
            Impact →
          </span>
        </div>
        {/* Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1.5">
            {cells.map((cell, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: cell.count > 0 ? 1 : 0.2, scale: 1 }}
                transition={{ delay: i * 0.015, duration: 0.3 }}
                className={cn(
                  'aspect-square rounded-md flex items-center justify-center text-xs font-bold cursor-default transition-transform hover:scale-110',
                  getCellColor(cell.likelihood, cell.impact),
                  getCellOpacity(cell.count)
                )}
                title={`L:${cell.likelihood} × I:${cell.impact} — ${cell.count} risk(s)`}
              >
                {cell.count > 0 ? cell.count : ''}
              </motion.div>
            ))}
          </div>
          {/* X-axis */}
          <div className="grid grid-cols-5 gap-1.5 mt-1.5">
            {AXIS_LABELS.map(l => (
              <div key={l} className="text-center text-[10px]" style={{ color: 'var(--muted-fg)' }}>{l}</div>
            ))}
          </div>
          <p className="text-center text-[10px] mt-1" style={{ color: 'var(--muted-fg)' }}>Likelihood →</p>
        </div>
      </div>
    </div>
  )
}
