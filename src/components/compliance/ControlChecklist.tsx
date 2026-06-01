'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import type { Control, ControlFramework, ControlStatus } from '@/types'
import { ControlStatusBadge } from '@/components/shared/Badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { CheckCircle2, XCircle, MinusCircle, Circle, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const FRAMEWORKS: { key: ControlFramework; label: string }[] = [
  { key: 'iso27001', label: 'ISO 27001' },
  { key: 'soc2',    label: 'SOC 2' },
  { key: 'gdpr',    label: 'GDPR' },
]

function calcScore(controls: Control[]) {
  const total = controls.length
  if (!total) return 0
  const pass = controls.filter(c => c.status === 'pass').length
  const partial = controls.filter(c => c.status === 'partial').length
  return Math.round(((pass + partial * 0.5) / total) * 100)
}

function ProgressBar({ value, color = '#6366f1' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

export function ControlChecklist() {
  const [controls, setControls] = useState<Control[]>([])
  const [activeFramework, setActiveFramework] = useState<ControlFramework>('iso27001')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newControlId, setNewControlId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newFramework, setNewFramework] = useState<ControlFramework>('iso27001')

  useEffect(() => {
    async function load() {
      const data = await db.getControls()
      setControls(data)
    }
    load()
  }, [])

  const frameworkControls = controls.filter(c => c.framework === activeFramework)
  const score = calcScore(frameworkControls)
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  const toggleStatus = async (id: string) => {
    const order: ControlStatus[] = ['pass', 'partial', 'fail', 'na']
    const nextControls = await Promise.all(controls.map(async c => {
      if (c.id !== id) return c
      const idx = order.indexOf(c.status)
      const nextStatus = order[(idx + 1) % order.length]
      const updated = { ...c, status: nextStatus, reviewed_by: 'Ali Hasanov', reviewed_at: new Date().toISOString() }
      await db.saveControl(updated)
      return updated
    }))
    setControls(nextControls)
  }

  const handleAddControl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newControlId.trim() || !newTitle.trim()) {
      toast.error('Control ID and Title are required!')
      return
    }

    const newControl: Control = {
      id: 'c-' + Math.random().toString(36).substr(2, 9),
      org_id: '00000000-0000-0000-0000-000000000001',
      framework: newFramework,
      control_id: newControlId.trim(),
      title: newTitle.trim(),
      description: newDescription.trim(),
      status: 'na',
      created_at: new Date().toISOString()
    }

    try {
      const saved = await db.saveControl(newControl)
      setControls(prev => [...prev, saved])
      setShowAddModal(false)
      setNewControlId('')
      setNewTitle('')
      setNewDescription('')
      toast.success(`Successfully added control ${saved.control_id}`)
    } catch (err) {
      toast.error('Failed to create new control')
    }
  }

  const StatusIcon = ({ status }: { status: ControlStatus }) => {
    if (status === 'pass')    return <CheckCircle2 className="w-5 h-5 text-green-500" />
    if (status === 'fail')    return <XCircle className="w-5 h-5 text-red-500" />
    if (status === 'partial') return <MinusCircle className="w-5 h-5 text-yellow-500" />
    return <Circle className="w-5 h-5" style={{ color: 'var(--muted-fg)' }} />
  }

  const inputClass = "w-full px-3.5 py-2 rounded-xl text-xs border bg-transparent outline-none focus:border-indigo-500 transition-colors"
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1"

  return (
    <div>
      <PageHeader 
        title="Compliance Management" 
        subtitle="Track control compliance against security frameworks" 
        actions={
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-indigo-650/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add Control
          </button>
        }
      />

      {/* Framework tabs + scores */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {FRAMEWORKS.map(fw => {
          const fwControls = controls.filter(c => c.framework === fw.key)
          const fwScore = calcScore(fwControls)
          const fwColor = fwScore >= 80 ? '#22c55e' : fwScore >= 60 ? '#eab308' : '#ef4444'
          return (
            <button key={fw.key} onClick={() => { setActiveFramework(fw.key); setNewFramework(fw.key); }}
              className={cn('p-5 card text-left transition-all cursor-pointer', {
                'ring-2 ring-indigo-500': activeFramework === fw.key,
              })}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>{fw.label}</p>
              <p className="text-2xl font-black mb-2" style={{ color: fwColor }}>{fwScore}%</p>
              <ProgressBar value={fwScore} color={fwColor} />
              <p className="text-xs mt-2" style={{ color: 'var(--muted-fg)' }}>
                {fwControls.filter(c => c.status === 'pass').length}/{fwControls.length} controls passing
              </p>
            </button>
          )
        })}
      </div>

      {/* Controls list */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {FRAMEWORKS.find(f => f.key === activeFramework)?.label} Controls
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
              Overall score: <span className="font-bold" style={{ color: scoreColor }}>{score}%</span>
            </p>
          </div>
          <div className="w-48">
            <ProgressBar value={score} color={scoreColor} />
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {frameworkControls.map((control, i) => (
            <motion.div key={control.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <div
                className="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setExpanded(expanded === control.id ? null : control.id)}
              >
                <button onClick={e => { e.stopPropagation(); toggleStatus(control.id) }}
                  title="Click to cycle status" className="cursor-pointer">
                  <StatusIcon status={control.status} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-500">{control.control_id}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{control.title}</span>
                  </div>
                  {control.reviewed_by && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                      Reviewed by {control.reviewed_by}
                    </p>
                  )}
                </div>
                <ControlStatusBadge status={control.status} />
                {expanded === control.id
                  ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
                  : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />}
              </div>

              {expanded === control.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-16 pb-4 space-y-3"
                >
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>{control.description}</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer">
                      Upload Evidence
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                      Add Note
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add Control Modal Dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Compliance Control</h3>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddControl} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Framework</label>
                    <select
                      value={newFramework}
                      onChange={e => setNewFramework(e.target.value as ControlFramework)}
                      className={inputClass}
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}
                    >
                      <option value="iso27001">ISO 27001</option>
                      <option value="soc2">SOC 2</option>
                      <option value="gdpr">GDPR</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Control ID</label>
                    <input
                      type="text"
                      placeholder="e.g. A.10.1"
                      value={newControlId}
                      onChange={e => setNewControlId(e.target.value)}
                      className={inputClass}
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Control Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Cryptographic controls policy"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className={inputClass}
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description / Objective</label>
                  <textarea
                    placeholder="Describe control objective and requirements..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    rows={3}
                    className={cn(inputClass, 'resize-none')}
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t mt-4" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ color: 'var(--muted-fg)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    Add Control
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
