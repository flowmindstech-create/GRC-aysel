'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { AuditFinding, FindingSeverity, FindingStatus } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description of the finding is required'),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
  recommendation: z.string().min(10, 'Recommendation is required'),
  status: z.enum(['open', 'in_progress', 'resolved', 'accepted']),
})

type FormValues = z.infer<typeof schema>

function generateFindingId() {
  return `f-${Date.now()}`
}

interface Props {
  auditId: string
  onClose: () => void
  onSave: (finding: AuditFinding) => void
}

export function FindingFormDialog({ auditId, onClose, onSave }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      severity: 'medium',
      status: 'open',
    },
  })

  const onSubmit = (values: FormValues) => {
    const saved: AuditFinding = {
      id: generateFindingId(),
      audit_id: auditId,
      ...values,
      created_at: new Date().toISOString(),
    }
    onSave(saved)
  }

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors',
    'border focus:ring-2 focus:ring-red-500/30 focus:border-red-500'
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
          className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                Add Audit Finding
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                Log a vulnerability, policy gap, or non-compliance issue found during audit.
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            <form id="finding-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Finding Title *</label>
                <input {...register('title')} placeholder="e.g. Unencrypted backup tapes stored offsite"
                  className={inputClass} style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Description *</label>
                <textarea {...register('description')} rows={3} placeholder="Describe the vulnerability or finding details…"
                  className={cn(inputClass, 'resize-none')}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
              </div>

              {/* Row: Severity + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Severity</label>
                  <select {...register('severity')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    {['info','low','medium','high','critical'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Status</label>
                  <select {...register('status')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    {['open','in_progress','resolved','accepted'].map(s => (
                      <option key={s} value={s}>{s.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Auditor Recommendation *</label>
                <textarea {...register('recommendation')} rows={2} placeholder="Describe remediation actions…"
                  className={cn(inputClass, 'resize-none')}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                {errors.recommendation && <p className="text-xs text-red-500 mt-1">{errors.recommendation.message}</p>}
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
            <button type="submit" form="finding-form"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
              Add Finding
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

