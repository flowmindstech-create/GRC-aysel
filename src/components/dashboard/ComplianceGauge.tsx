'use client'

import { motion } from 'framer-motion'

interface Props { score: number }

export function ComplianceGauge({ score }: Props) {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference

  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  return (
    <div className="card p-5 flex flex-col items-center">
      <h3 className="text-sm font-semibold mb-4 self-start" style={{ color: 'var(--foreground)' }}>
        Compliance Score
      </h3>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="45" fill="none"
            stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}%
          </motion.span>
          <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>overall</span>
        </div>
      </div>

      <div className="w-full mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'ISO 27001', value: 72 },
          { label: 'SOC 2', value: 58 },
          { label: 'GDPR', value: 81 },
        ].map(({ label, value }) => (
          <div key={label} className="p-2 rounded-lg" style={{ background: 'var(--muted)' }}>
            <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{value}%</p>
            <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
