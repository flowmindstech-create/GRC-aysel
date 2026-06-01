'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MOCK_CONTROLS } from '@/lib/seed-data'
import { db } from '@/lib/db'
import type { Control, ControlFramework, ControlStatus } from '@/types'
import { ControlStatusBadge } from '@/components/shared/Badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { CheckCircle2, XCircle, MinusCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const FRAMEWORKS: { key: ControlFramework; label: string }[] = [
  { key: 'iso27001', label: 'ISO 27001' },
  { key: 'soc2',    label: 'SOC 2' },
  { key: 'gdpr',    label: 'GDPR' },
]

function calcScore(controls: Control[]) {
  const total = controls.length
  if (!total) return 0
  const pass = controls.filter(c => c.status === 'pass').length
  const partial = controls.filter(c => c.status === 'partial').length
  return Math.round(((pass + partial * 0.5) / total) * 100)
}

function ProgressBar({ value, color = '#6366f1' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

export function ControlChecklist() {
  const [controls, setControls] = useState<Control[]>([])
  const [activeFramework, setActiveFramework] = useState<ControlFramework>('iso27001')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await db.getControls()
      setControls(data)
    }
    load()
  }, [])

  const frameworkControls = controls.filter(c => c.framework === activeFramework)
  const score = calcScore(frameworkControls)
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  const toggleStatus = async (id: string) => {
    const order: ControlStatus[] = ['pass', 'partial', 'fail', 'na']
    const nextControls = await Promise.all(controls.map(async c => {
      if (c.id !== id) return c
      const idx = order.indexOf(c.status)
      const nextStatus = order[(idx + 1) % order.length]
      const updated = { ...c, status: nextStatus, reviewed_by: 'Ali Hasanov', reviewed_at: new Date().toISOString() }
      await db.saveControl(updated)
      return updated
    }))
    setControls(nextControls)
  }

  const StatusIcon = ({ status }: { status: ControlStatus }) => {
    if (status === 'pass')    return <CheckCircle2 className="w-5 h-5 text-green-500" />
    if (status === 'fail')    return <XCircle className="w-5 h-5 text-red-500" />
    if (status === 'partial') return <MinusCircle className="w-5 h-5 text-yellow-500" />
    return <Circle className="w-5 h-5" style={{ color: 'var(--muted-fg)' }} />
  }


  return (
    <div>
      <PageHeader title="Compliance Management" subtitle="Track control compliance against security frameworks" />

      {/* Framework tabs + scores */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {FRAMEWORKS.map(fw => {
          const fwControls = controls.filter(c => c.framework === fw.key)
          const fwScore = calcScore(fwControls)
          const fwColor = fwScore >= 80 ? '#22c55e' : fwScore >= 60 ? '#eab308' : '#ef4444'
          return (
            <button key={fw.key} onClick={() => setActiveFramework(fw.key)}
              className={cn('p-5 card text-left transition-all', {
                'ring-2 ring-indigo-500': activeFramework === fw.key,
              })}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>{fw.label}</p>
              <p className="text-2xl font-black mb-2" style={{ color: fwColor }}>{fwScore}%</p>
              <ProgressBar value={fwScore} color={fwColor} />
              <p className="text-xs mt-2" style={{ color: 'var(--muted-fg)' }}>
                {fwControls.filter(c => c.status === 'pass').length}/{fwControls.length} controls passing
              </p>
            </button>
          )
        })}
      </div>

      {/* Controls list */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {FRAMEWORKS.find(f => f.key === activeFramework)?.label} Controls
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
              Overall score: <span className="font-bold" style={{ color: scoreColor }}>{score}%</span>
            </p>
          </div>
          <div className="w-48">
            <ProgressBar value={score} color={scoreColor} />
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {frameworkControls.map((control, i) => (
            <motion.div key={control.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <div
                className="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setExpanded(expanded === control.id ? null : control.id)}
              >
                <button onClick={e => { e.stopPropagation(); toggleStatus(control.id) }}
                  title="Click to cycle status">
                  <StatusIcon status={control.status} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-500">{control.control_id}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{control.title}</span>
                  </div>
                  {control.reviewed_by && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                      Reviewed by {control.reviewed_by}
                    </p>
                  )}
                </div>
                <ControlStatusBadge status={control.status} />
                {expanded === control.id
                  ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
                  : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />}
              </div>

              {expanded === control.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-16 pb-4 space-y-3"
                >
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>{control.description}</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                      Upload Evidence
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                      Add Note
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
