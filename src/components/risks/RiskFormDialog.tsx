'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap } from 'lucide-react'
import type { Risk, RiskLevel, RiskCategory, RiskStatus } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description required'),
  category: z.enum(['cybersecurity', 'financial', 'operational', 'legal', 'hr', 'strategic', 'compliance']),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'in_progress', 'mitigated', 'accepted', 'closed']),
  owner_id: z.string().optional(),
  due_date: z.string().optional(),
  likelihood: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  mitigation: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  risk: Risk | null
  onClose: () => void
  onSave: (risk: Risk) => void
}

export function RiskFormDialog({ risk, onClose, onSave }: Props) {
  const isEdit = !!risk

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: risk
      ? {
          title: risk.title, description: risk.description,
          category: risk.category, level: risk.level, status: risk.status,
          owner_id: risk.owner_id, due_date: risk.due_date ?? '',
          likelihood: risk.likelihood, impact: risk.impact,
          mitigation: risk.mitigation ?? '',
        }
      : {
          category: 'cybersecurity', level: 'medium', status: 'open',
          likelihood: 2, impact: 3,
        },
  })

  const likelihood = watch('likelihood')
  const impact = watch('impact')
  const riskScore = likelihood * impact
  const scoreColor =
    riskScore >= 16 ? 'text-red-500' :
    riskScore >= 9  ? 'text-orange-500' :
    riskScore >= 4  ? 'text-yellow-500' : 'text-green-500'

  const onSubmit = (values: FormValues) => {
    const owner = MOCK_USERS.find(u => u.id === values.owner_id)
    const saved: Risk = {
      id: risk?.id ?? `r-${Date.now()}`,
      org_id: 'org1',
      ...values,
      owner_name: owner?.full_name,
      created_at: risk?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(saved)
  }

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors',
    'border focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500'
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                {isEdit ? 'Edit Risk' : 'New Risk'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                Fill in the details to {isEdit ? 'update' : 'register'} this risk.
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            <form id="risk-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Risk Title *</label>
                <input {...register('title')} placeholder="e.g. SQL Injection in Customer Portal"
                  className={inputClass} style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Description *</label>
                <textarea {...register('description')} rows={3} placeholder="Describe the risk in detail…"
                  className={cn(inputClass, 'resize-none')}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
              </div>

              {/* Row: Category + Level + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Category</label>
                  <select {...register('category')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    {['cybersecurity','financial','operational','legal','hr','strategic','compliance'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Risk Level</label>
                  <select {...register('level')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    {['low','medium','high','critical'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Status</label>
                  <select {...register('status')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    {['open','in_progress','mitigated','accepted','closed'].map(s => (
                      <option key={s} value={s}>{s.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: Owner + Due date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Risk Owner</label>
                  <select {...register('owner_id')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    <option value="">Unassigned</option>
                    {MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Due Date</label>
                  <input type="date" {...register('due_date')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                </div>
              </div>

              {/* Likelihood & Impact sliders */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Risk Score Matrix</p>
                  <span className={cn('text-lg font-bold', scoreColor)}>{riskScore}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                      Likelihood: <strong style={{ color: 'var(--foreground)' }}>{likelihood}</strong>/5
                    </label>
                    <input type="range" min={1} max={5} {...register('likelihood', { valueAsNumber: true })}
                      className="w-full mt-1 accent-indigo-600" />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                      Impact: <strong style={{ color: 'var(--foreground)' }}>{impact}</strong>/5
                    </label>
                    <input type="range" min={1} max={5} {...register('impact', { valueAsNumber: true })}
                      className="w-full mt-1 accent-indigo-600" />
                  </div>
                </div>
              </div>

              {/* Mitigation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Mitigation Actions</label>
                  <button type="button"
                    className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-400 font-medium">
                    <Zap className="w-3 h-3" /> AI Suggest
                  </button>
                </div>
                <textarea {...register('mitigation')} rows={2}
                  placeholder="Describe mitigation steps…"
                  className={cn(inputClass, 'resize-none')}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: 'var(--muted-fg)' }}>
              Cancel
            </button>
            <button type="submit" form="risk-form"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
              {isEdit ? 'Save Changes' : 'Create Risk'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
