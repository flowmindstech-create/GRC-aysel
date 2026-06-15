'use client'

import { cn } from '@/lib/utils'
import { ClipboardList, Search, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { id: 'intake',        label: 'Intake',        icon: ClipboardList, desc: 'Hadisəni bəyan et' },
  { id: 'investigation', label: 'Investigation',  icon: Search,        desc: 'Araşdırma' },
  { id: 'resolution',    label: 'Resolution',     icon: CheckCircle2,  desc: 'Həll və bağlama' },
] as const

interface Props {
  currentStep: number
  onStepChange: (step: number) => void
  completedSteps?: number[]
}

export function IncidentWorkflowStepper({ currentStep, onStepChange, completedSteps = [] }: Props) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {STEPS.map((step, idx) => {
        const isActive = idx === currentStep
        const isCompleted = completedSteps.includes(idx) || idx < currentStep
        const isClickable = idx <= currentStep || isCompleted

        return (
          <div key={step.id} className="flex items-center gap-1.5 flex-1">
            <button
              onClick={() => isClickable && onStepChange(idx)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all w-full',
                isActive
                  ? 'text-white shadow-lg'
                  : isCompleted
                    ? 'cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
              )}
              style={
                isActive
                  ? { background: 'var(--brand-500)', boxShadow: '0 4px 14px rgba(14,165,233,0.25)' }
                  : isCompleted
                    ? { background: 'rgba(5,150,105,0.12)', color: 'rgb(52,211,153)' }
                    : { background: 'var(--muted)', color: 'var(--muted-fg)' }
              }
            >
              <step.icon className="w-4 h-4 shrink-0" />
              <div className="text-left min-w-0">
                <p className="leading-tight">{step.label}</p>
                <p className={cn('text-[9px] font-normal opacity-70 truncate',
                  isActive ? 'text-white/70' : ''
                )}>{step.desc}</p>
              </div>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className="w-6 h-px shrink-0"
                style={{ background: isCompleted ? 'rgb(52,211,153)' : 'var(--border)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
