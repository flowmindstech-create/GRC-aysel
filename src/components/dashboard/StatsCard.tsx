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

export function StatsCard({
  title, value, subtitle, icon: Icon,
  iconColor = 'text-indigo-500',
  iconBg = 'bg-indigo-500/10',
  trend, className, index = 0,
}: StatsCardProps) {
  const TrendIcon = trend
    ? trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className={cn('card p-5 hover:shadow-md transition-shadow', className)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {trend && TrendIcon && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend.value > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
          )}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>{value}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--muted-fg)' }}>{title}</p>
      {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>{subtitle}</p>}
      {trend && (
        <p className="text-xs mt-2" style={{ color: 'var(--muted-fg)' }}>{trend.label}</p>
      )}
    </motion.div>
  )
}
