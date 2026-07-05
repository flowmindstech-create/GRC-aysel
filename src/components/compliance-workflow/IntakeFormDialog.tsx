'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { GRCIntakeItem, GRCIntakeType } from '@/types'

const TYPES: { value: GRCIntakeType; label: string; desc: string; color: string }[] = [
  { value: 'requirement', label: 'Requirement',  desc: 'Regulatory or policy obligation', color: 'text-blue-400'   },
  { value: 'risk',        label: 'Risk',          desc: 'Identified risk needing assessment', color: 'text-orange-400' },
  { value: 'finding',     label: 'Audit Finding', desc: 'Finding raised during audit',     color: 'text-yellow-400' },
  { value: 'incident',    label: 'Incident',      desc: 'Operational or security incident', color: 'text-red-400'   },
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (item: Omit<GRCIntakeItem, 'id' | 'created_at'>) => Promise<void>
}

export function IntakeFormDialog({ open, onClose, onSubmit }: Props) {
  const [step, setStep]               = useState<1 | 2>(1)
  const [type, setType]               = useState<GRCIntakeType>('requirement')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [classification, setClass]    = useState('')
  const [loading, setLoading]         = useState(false)

  function reset() {
    setStep(1); setType('requirement')
    setTitle(''); setDescription(''); setClass(''); setLoading(false)
  }

  async function handleSubmit() {
    if (!title.trim() || !classification.trim()) return
    setLoading(true)
    await onSubmit({
      org_id:               '00000000-0000-0000-0000-000000000001',
      type,
      title:                title.trim(),
      description:          description.trim(),
      classification:       classification.trim(),
      mapped_control_ids:   [],
      status:               'draft',
      step:                 'registration',
      gap_identified:       false,
      risk_creation_required: false,
    })
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>New Compliance Item</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>Step {step} of 2</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/[0.04]">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 mx-6 mt-0" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%', background: 'var(--brand-500)' }}
            />
          </div>

          <div className="px-6 py-5 space-y-4">
            {step === 1 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-fg)', opacity: 0.6 }}>
                  Item Type
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={cn(
                        'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all',
                        type === t.value
                          ? 'border-sky-500/50 bg-sky-500/08'
                          : 'hover:border-white/10 hover:bg-black/[0.04]'
                      )}
                      style={{ borderColor: type === t.value ? 'rgba(14,165,233,0.4)' : 'var(--border)' }}
                    >
                      <span className={cn('text-xs font-semibold', t.color)}>{t.label}</span>
                      <span className="text-[11px] leading-snug" style={{ color: 'var(--muted-fg)' }}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Title *</label>
                  <input
                    autoFocus
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={`e.g. GDPR Article 7 consent requirement`}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide context and details..."
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition-colors"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Classification *</label>
                  <select
                    value={classification}
                    onChange={e => setClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: classification ? 'var(--foreground)' : 'var(--muted-fg)',
                    }}
                  >
                    <option value="">Select classification...</option>
                    <option value="Regulatory">Regulatory</option>
                    <option value="Policy">Policy</option>
                    <option value="Contractual">Contractual</option>
                    <option value="Internal">Internal</option>
                    <option value="Operational">Operational</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => step === 1 ? onClose() : setStep(1)}
              className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-black/[0.04]"
              style={{ color: 'var(--muted-fg)' }}
            >
              {step === 1 ? 'Cancel' : '← Back'}
            </button>
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: 'var(--brand-500)' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !classification.trim() || loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--brand-500)' }}
              >
                {loading ? 'Creating…' : <><Plus className="w-3.5 h-3.5" /> Create Item</>}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
