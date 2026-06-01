'use client'

import { motion } from 'framer-motion'
import type { Activity } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import {
  ShieldAlert, AlertTriangle, ClipboardCheck,
  Search, Users, Activity as ActivityIcon,
} from 'lucide-react'

const entityIcons: Record<string, typeof ShieldAlert> = {
  risk:       ShieldAlert,
  incident:   AlertTriangle,
  control:    ClipboardCheck,
  audit:      Search,
  vendor:     Users,
}

const entityColors: Record<string, string> = {
  risk:     'text-red-500 bg-red-500/10',
  incident: 'text-orange-500 bg-orange-500/10',
  control:  'text-green-500 bg-green-500/10',
  audit:    'text-blue-500 bg-blue-500/10',
  vendor:   'text-sky-400 bg-sky-500/10',
}

interface Props { activities: Activity[] }

export function ActivityFeed({ activities }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <ActivityIcon className="w-4 h-4 text-sky-500" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Recent Activity</h3>
      </div>
      <div className="space-y-4">
        {activities.map((act, i) => {
          const Icon = entityIcons[act.entity_type] ?? ActivityIcon
          const colorClass = entityColors[act.entity_type] ?? 'text-slate-500 bg-slate-500/10'
          return (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-3"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: 'var(--foreground)' }}>
                  <span className="font-semibold">{act.user_name}</span>
                  {' '}{act.action}
                  {act.entity_title && (
                    <> — <span className="italic" style={{ color: 'var(--muted-fg)' }}>{act.entity_title}</span></>
                  )}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                  {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

