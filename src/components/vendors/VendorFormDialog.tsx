'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Vendor, VendorCategory, VendorStatus } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'Vendor name is required'),
  category: z.enum(['cloud_services', 'software', 'hardware', 'professional_services', 'logistics', 'financial', 'other']),
  risk_score: z.number().min(0).max(100),
  contract_renewal: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_name: z.string().optional(),
  status: z.enum(['active', 'inactive', 'under_review', 'terminated']),
  ai_summary: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  vendor: Vendor | null
  onClose: () => void
  onSave: (vendor: Vendor) => void
}

export function VendorFormDialog({ vendor, onClose, onSave }: Props) {
  const isEdit = !!vendor

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vendor
      ? {
          name: vendor.name,
          category: vendor.category,
          risk_score: vendor.risk_score,
          contract_renewal: vendor.contract_renewal ?? '',
          contact_email: vendor.contact_email ?? '',
          contact_name: vendor.contact_name ?? '',
          status: vendor.status,
          ai_summary: vendor.ai_summary ?? '',
        }
      : {
          risk_score: 50,
          status: 'active',
          category: 'software',
        },
  })

  const riskScore = watch('risk_score')

  const onSubmit = (values: FormValues) => {
    const saved: Vendor = {
      id: vendor?.id ?? `v-${Date.now()}`,
      org_id: 'org1',
      ...values,
      ai_summary: values.ai_summary || `AI Assessment: ${values.name} displays a ${riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low'} risk profile. Proper review cycle recommended.`,
      created_at: vendor?.created_at ?? new Date().toISOString(),
    }
    onSave(saved)
  }

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors',
    'border focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div
        className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              {isEdit ? 'Edit Vendor' : 'Add Vendor'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
              Enter third-party vendor parameters and risk configuration.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10">
            <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Vendor Name *</label>
              <input {...register('name')} placeholder="e.g. AWS Cloud Services"
                className={inputClass} style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Row: Category + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Category</label>
                <select {...register('category')} className={inputClass}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  {['cloud_services', 'software', 'hardware', 'professional_services', 'logistics', 'financial', 'other'].map(c => (
                    <option key={c} value={c}>{c.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Status</label>
                <select {...register('status')} className={inputClass}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  {['active', 'inactive', 'under_review', 'terminated'].map(s => (
                    <option key={s} value={s}>{s.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Risk Score */}
            <div className="p-4 rounded-xl border" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Risk Score Matrix (0-100)</span>
                <span className="text-sm font-bold"
                  style={{ color: riskScore >= 70 ? '#ef4444' : riskScore >= 40 ? '#f97316' : '#22c55e' }}>
                  {riskScore}
                </span>
              </div>
              <input type="range" min={0} max={100} {...register('risk_score', { valueAsNumber: true })}
                className="w-full accent-sky-500" />
            </div>

            {/* Row: Contact Name + Contact Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Contact Name</label>
                <input {...register('contact_name')} placeholder="James Smith" className={inputClass}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Contact Email</label>
                <input {...register('contact_email')} placeholder="james@vendor.com" className={inputClass}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                {errors.contact_email && <p className="text-xs text-red-500 mt-1">{errors.contact_email.message}</p>}
              </div>
            </div>

            {/* Contract Renewal Date */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Contract Renewal Date</label>
              <input type="date" {...register('contract_renewal')} className={inputClass}
                style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            </div>

            {/* AI Summary override */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>AI Security Assessment Note (Optional)</label>
              <textarea {...register('ai_summary')} rows={2} placeholder="AI summary will be auto-generated if left empty…" className={cn(inputClass, 'resize-none')}
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
          <button type="submit" form="vendor-form"
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20">
            {isEdit ? 'Save Changes' : 'Add Vendor'}
          </button>
        </div>
      </div>
    </div>
  )
}

