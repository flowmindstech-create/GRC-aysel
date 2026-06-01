'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Audit, AuditStatus } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  scope: z.string().min(10, 'Scope must describe the audit boundary'),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
  auditor_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function generateAuditId() {
  return `a-${Date.now()}`
}

interface Props {
  audit: Audit | null
  onClose: () => void
  onSave: (audit: Audit) => void
}

export function AuditFormDialog({ audit, onClose, onSave }: Props) {
  const isEdit = !!audit

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: audit
      ? {
          title: audit.title,
          scope: audit.scope,
          status: audit.status,
          auditor_id: audit.auditor_id ?? '',
          start_date: audit.start_date ?? '',
          end_date: audit.end_date ?? '',
        }
      : { status: 'planned' },
  })

  const onSubmit = (values: FormValues) => {
    const auditor = MOCK_USERS.find(u => u.id === values.auditor_id)
    const saved: Audit = {
      id: audit?.id ?? generateAuditId(),
      org_id: 'org1',
      ...values,
      auditor_name: auditor?.full_name,
      created_at: audit?.created_at ?? new Date().toISOString(),
    }
    onSave(saved)
  }

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors',
    'border focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
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
                {isEdit ? 'Edit Audit' : 'New Audit'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                Define the title, scope, and schedule for the audit.
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            <form id="audit-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Audit Title *</label>
                <input {...register('title')} placeholder="e.g. Q2 2025 Financial Risk Assessment"
                  className={inputClass} style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              {/* Scope */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Scope of Work *</label>
                <textarea {...register('scope')} rows={3} placeholder="Describe the systems, departments, and compliance rules in scope…"
                  className={cn(inputClass, 'resize-none')}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                {errors.scope && <p className="text-xs text-red-500 mt-1">{errors.scope.message}</p>}
              </div>

              {/* Row: Status + Auditor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Status</label>
                  <select {...register('status')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    {['planned','in_progress','completed','cancelled'].map(s => (
                      <option key={s} value={s}>{s.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Lead Auditor</label>
                  <select {...register('auditor_id')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    <option value="">Unassigned</option>
                    {MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                  </select>
                </div>
              </div>

              {/* Row: Start Date + End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Start Date</label>
                  <input type="date" {...register('start_date')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>End Date</label>
                  <input type="date" {...register('end_date')} className={inputClass}
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                </div>
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
            <button type="submit" form="audit-form"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              {isEdit ? 'Save Changes' : 'Create Audit'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
