'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Incident } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  severity: z.enum(['low','medium','high','critical']),
  status: z.enum(['open','investigating','contained','resolved','closed']),
  assigned_to: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function generateIncidentId() {
  return `i-${Date.now()}`
}

interface Props { incident: Incident | null; onClose: () => void; onSave: (i: Incident) => void }

export function IncidentFormDialog({ incident, onClose, onSave }: Props) {
  const isEdit = !!incident
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: incident
      ? { title: incident.title, description: incident.description, severity: incident.severity, status: incident.status, assigned_to: incident.assigned_to }
      : { severity: 'medium', status: 'open' },
  })

  const onSubmit = (v: FormValues) => {
    const user = MOCK_USERS.find(u => u.id === v.assigned_to)
    const saved: Incident = {
      id: incident?.id ?? generateIncidentId(),
      org_id: 'org1',
      ...v,
      assigned_name: user?.full_name,
      reporter_name: 'Ali Hasanov',
      created_at: incident?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(saved)
  }

  const inp = cn('w-full px-3 py-2.5 rounded-xl text-sm outline-none border focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500')
  const sty = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              {isEdit ? 'Edit Incident' : 'Report Incident'}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            <form id="inc-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Title *</label>
                <input {...register('title')} className={inp} style={sty} placeholder="Brief incident title…" />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Description *</label>
                <textarea {...register('description')} rows={4} className={cn(inp, 'resize-none')} style={sty}
                  placeholder="Describe what happened, when, and the initial impact…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Severity</label>
                  <select {...register('severity')} className={inp} style={sty}>
                    {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Status</label>
                  <select {...register('status')} className={inp} style={sty}>
                    {['open','investigating','contained','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Assign Investigator</label>
                <select {...register('assigned_to')} className={inp} style={sty}>
                  <option value="">Unassigned</option>
                  {MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            </form>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--muted-fg)' }}>Cancel</button>
            <button type="submit" form="inc-form"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20">
              {isEdit ? 'Save Changes' : 'Report Incident'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
