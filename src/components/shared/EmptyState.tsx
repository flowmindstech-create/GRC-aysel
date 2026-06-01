import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'var(--muted)' }}>
        <Icon className="w-6 h-6" style={{ color: 'var(--muted-fg)' }} />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>{title}</h3>
      <p className="text-sm max-w-xs" style={{ color: 'var(--muted-fg)' }}>{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
