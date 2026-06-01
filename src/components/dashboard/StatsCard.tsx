'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
  className?: string
  index?: number
}

const accentRgb: Record<string, string> = {
  'text-sky-500':    '14,165,233',
  'text-orange-500': '234,88,12',
  'text-green-500':  '5,150,105',
  'text-blue-500':   '59,130,246',
  'text-red-500':    '225,29,72',
  'text-purple-500': '168,85,247',
  'text-yellow-500': '234,179,8',
  'text-teal-500':   '20,184,166',
}

export function StatsCard({
  title, value, subtitle, icon: Icon,
  iconColor = 'text-sky-500',
  iconBg = 'bg-sky-500/10',
  trend, className, index = 0,
}: StatsCardProps) {
  const TrendIcon = trend
    ? trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus
    : null

  const rgb = accentRgb[iconColor] ?? '14,165,233'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className={cn('card p-5 overflow-hidden', className)}
    >
      {/* Per-card color accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(${rgb},0.7) 50%, transparent 100%)`,
        }}
      />

      <div className="flex items-start justify-between mb-4">
        <div
          className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}
          style={{ boxShadow: `0 0 18px rgba(${rgb},0.22)` }}
        >
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {trend && TrendIcon && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
            trend.value > 0
              ? 'text-red-400'
              : 'text-green-400'
          )}
            style={{
              background: trend.value > 0
                ? 'rgba(225,29,72,0.1)'
                : 'rgba(5,150,105,0.1)',
            }}
          >
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: 'var(--foreground)' }}>
        {value}
      </p>
      <p className="text-sm font-medium" style={{ color: 'var(--muted-fg)' }}>{title}</p>
      {subtitle && (
        <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)', opacity: 0.65 }}>
          {subtitle}
        </p>
      )}
      {trend && (
        <p className="text-xs mt-2" style={{ color: 'var(--muted-fg)', opacity: 0.6 }}>
          {trend.label}
        </p>
      )}
    </motion.div>
  )
}
