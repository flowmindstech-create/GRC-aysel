'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ComplianceObligation, ObligationStatus, ObligationSource } from '@/types'

const SOURCES: ObligationSource[] = [
  'ISO 27001', 'GDPR', 'SOC 2', 'PCI DSS',
  'Local Regulation', 'Internal Policy', 'Contractual', 'Other',
]

const STATUSES: { value: ObligationStatus; label: string }[] = [
  { value: 'draft',        label: 'Draft' },
  { value: 'active',       label: 'Active' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'retired',      label: 'Retired' },
]

interface Props {
  obligation: ComplianceObligation | null
  onClose: () => void
  onSave: (item: ComplianceObligation) => Promise<void>
}

export function ObligationFormDialog({ obligation, onClose, onSave }: Props) {
  const isEdit = !!obligation

  const [title, setTitle]         = useState(obligation?.title ?? '')
  const [description, setDesc]    = useState(obligation?.description ?? '')
  const [source, setSource]       = useState<ObligationSource>(obligation?.source ?? 'ISO 27001')
  const [status, setStatus]       = useState<ObligationStatus>(obligation?.status ?? 'draft')
  const [dueDate, setDueDate]     = useState(obligation?.due_date ?? '')
  const [ownerDept, setOwnerDept] = useState(obligation?.owner_dept ?? '')
  const [ownerName, setOwnerName] = useState(obligation?.owner_name ?? '')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)

    const now = new Date().toISOString()
    const item: ComplianceObligation = {
      id:               obligation?.id ?? crypto.randomUUID(),
      org_id:           obligation?.org_id ?? '',
      obligation_code:  obligation?.obligation_code ?? '',
      title:            title.trim(),
      description:      description.trim(),
      source,
      status,
      due_date:         dueDate || undefined,
      owner_dept:       ownerDept.trim() || undefined,
      owner_name:       ownerName.trim() || undefined,
      created_at:       obligation?.created_at ?? now,
      updated_at:       now,
    }

    await onSave(item)
    setLoading(false)
  }

  const inputStyle = {
    background: 'var(--muted)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
  }

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
          className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {isEdit ? 'Edit Obligation' : 'New Obligation'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                {isEdit ? `Editing ${obligation.obligation_code}` : 'Code will be auto-generated'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            >
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          {/* Glow bar */}
          <div className="h-0.5 mx-6" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-500), transparent)' }} />

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                Title <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. GDPR Article 7 — Consent Management"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDesc(e.target.value)}
                rows={3}
                placeholder="Provide context and details about this obligation…"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition-colors"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Source + Status (2-col) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                  Source <span className="text-red-400">*</span>
                </label>
                <select
                  value={source}
                  onChange={e => setSource(e.target.value as ObligationSource)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                  style={inputStyle}
                >
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ObligationStatus)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                  style={inputStyle}
                >
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Owner dept + name (2-col) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                  Owner Department
                </label>
                <input
                  value={ownerDept}
                  onChange={e => setOwnerDept(e.target.value)}
                  placeholder="e.g. IT Security"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                  Owner Name
                </label>
                <input
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="e.g. Aysel Mammadova"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{ color: 'var(--muted-fg)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--brand-500)' }}
              >
                {loading ? 'Saving…' : (
                  <>
                    {isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {isEdit ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
