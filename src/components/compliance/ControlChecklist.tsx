'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db, getCurrentProfile } from '@/lib/db'
import type { Control, ControlFramework, ControlStatus, ExecutionFrequency } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { ChevronDown, ChevronUp, RotateCw, BookOpen, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const FRAMEWORKS: { key: ControlFramework; label: string }[] = [
  { key: 'iso27001', label: 'ISO 27001' },
  { key: 'soc2',    label: 'SOC 2' },
  { key: 'gdpr',    label: 'GDPR' },
]

// Checklist test result → badge
const STATUS_CFG: Record<ControlStatus, { label: string; cls: string }> = {
  pass:    { label: 'Pass',       cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' },
  partial: { label: 'Partial',    cls: 'bg-amber-500/15 text-amber-600 border-amber-500/25' },
  fail:    { label: 'Fail',       cls: 'bg-red-500/15 text-red-600 border-red-500/25' },
  na:      { label: 'Not Tested', cls: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/25' },
}

// Frequency → interval added to compute the next test date
function nextDate(from: Date, freq?: ExecutionFrequency): string | null {
  const d = new Date(from)
  switch (freq) {
    case 'continuous':
    case 'daily':     d.setDate(d.getDate() + 1); break
    case 'weekly':    d.setDate(d.getDate() + 7); break
    case 'monthly':   d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'annual':    d.setFullYear(d.getFullYear() + 1); break
    default: return null // ad_hoc or unset → no auto next date
  }
  return d.toISOString()
}

// Test result → effectiveness rating (rolled up to the Control Library + mapping matrix)
const STATUS_TO_EFF: Record<ControlStatus, Control['effectiveness_rating']> = {
  pass: 'effective', partial: 'partially_effective', fail: 'ineffective', na: 'na',
}
const EFF_LABEL = (e?: string) =>
  e === 'effective' ? 'Effective' : e === 'partially_effective' ? 'Partially' : e === 'ineffective' ? 'Ineffective' : 'Not Tested'
const EFF_DOT = (e?: string) =>
  e === 'effective' ? '#22c55e' : e === 'partially_effective' ? '#eab308' : e === 'ineffective' ? '#ef4444' : 'var(--muted-fg)'

function calcScore(controls: Control[]) {
  const total = controls.length
  if (!total) return 0
  const pass = controls.filter(c => c.status === 'pass').length
  const partial = controls.filter(c => c.status === 'partial').length
  return Math.round(((pass + partial * 0.5) / total) * 100)
}

function ProgressBar({ value, color = '#0ea5e9' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
      <motion.div className="h-full rounded-full" style={{ background: color }}
        initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
    </div>
  )
}

function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('az-AZ') : '—'
}

export function ControlChecklist() {
  const [controls, setControls] = useState<Control[]>([])
  const [activeFramework, setActiveFramework] = useState<ControlFramework>('iso27001')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [me, setMe] = useState<string>('')

  useEffect(() => {
    db.getControls().then(setControls)
    getCurrentProfile().then(p => setMe(p?.full_name ?? 'Auditor'))
  }, [])

  const frameworkControls = controls.filter(c => c.framework === activeFramework)
  const score = calcScore(frameworkControls)
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  // Core automation: run a test → set result, dates, effectiveness → save (rolls up everywhere)
  async function runTest(control: Control, result: ControlStatus) {
    const now = new Date()
    const nowIso = now.toISOString()
    const updated: Control = {
      ...control,
      status: result,
      effectiveness_rating: STATUS_TO_EFF[result],
      last_tested_at: nowIso,
      next_test_date: nextDate(now, control.execution_frequency) ?? undefined,
      reviewed_by: me,
      reviewed_at: nowIso,
    }
    setControls(prev => prev.map(c => c.id === control.id ? updated : c))
    try {
      await db.saveControl(updated)
      toast.success(`${control.control_id}: ${STATUS_CFG[result].label} — Library və matris yeniləndi`)
    } catch {
      toast.error('Yadda saxlanıla bilmədi')
    }
  }

  function patchField(control: Control, patch: Partial<Control>) {
    const updated = { ...control, ...patch }
    setControls(prev => prev.map(c => c.id === control.id ? updated : c))
    db.saveControl(updated).catch(() => toast.error('Yadda saxlanıla bilmədi'))
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-xs outline-none'
  const inputStyle = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }

  return (
    <div>
      <PageHeader
        title="Compliance Management"
        subtitle="Kontrolların dövri test meydanı — Pass/Fail nəticəsi Control Library-yə və matrisə avtomatik yansıyır"
        actions={
          <Link href="/controls"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors hover:bg-black/[0.04]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <BookOpen className="w-3.5 h-3.5" /> Control Library-də yarat
          </Link>
        }
      />

      {/* Framework scores */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {FRAMEWORKS.map(fw => {
          const fwControls = controls.filter(c => c.framework === fw.key)
          const fwScore = calcScore(fwControls)
          const fwColor = fwScore >= 80 ? '#22c55e' : fwScore >= 60 ? '#eab308' : '#ef4444'
          return (
            <button key={fw.key} onClick={() => setActiveFramework(fw.key)}
              className={cn('p-5 card text-left transition-all cursor-pointer', activeFramework === fw.key && 'ring-2 ring-sky-500')}>
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

      {/* Checklist table */}
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
          <div className="w-48"><ProgressBar value={score} color={scoreColor} /></div>
        </div>

        {/* Column header */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 border-b text-[10px] font-semibold uppercase tracking-wide"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)', color: 'var(--muted-fg)' }}>
          <div className="col-span-4">Kod / Nəzarət adı</div>
          <div className="col-span-2">Son yoxlama</div>
          <div className="col-span-2">Növbəti yoxlama</div>
          <div className="col-span-2">Effektivlik</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1" />
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {frameworkControls.length === 0 && (
            <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Bu framework üzrə kontrol yoxdur.</p>
          )}
          {frameworkControls.map((control, i) => {
            const st = STATUS_CFG[control.status] ?? STATUS_CFG.na
            const isOpen = expanded === control.id
            return (
            <motion.div key={control.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <div className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 hover:bg-black/[0.02] transition-colors cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : control.id)}>
                <div className="col-span-12 md:col-span-4 flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono font-bold text-sky-600 shrink-0">{control.control_id}</span>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{control.title}</span>
                </div>
                <div className="col-span-6 md:col-span-2 text-xs" style={{ color: control.last_tested_at ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                  {fmtDate(control.last_tested_at)}
                </div>
                <div className="col-span-6 md:col-span-2 text-xs flex items-center gap-1" style={{ color: control.next_test_date ? 'var(--brand-500)' : 'var(--muted-fg)' }}>
                  {control.next_test_date && <RotateCw className="w-3 h-3" />}{fmtDate(control.next_test_date)}
                </div>
                <div className="col-span-6 md:col-span-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--foreground)' }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: EFF_DOT(control.effectiveness_rating) }} />
                  {EFF_LABEL(control.effectiveness_rating)}
                </div>
                <div className="col-span-4 md:col-span-1">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border', st.cls)}>{st.label}</span>
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  {isOpen ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />}
                </div>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="px-5 md:px-8 pb-5 pt-1 grid md:grid-cols-2 gap-5" style={{ background: 'var(--muted)' }}>
                      {/* Left — test steps + result */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>Test addımları</p>
                          <p className="text-xs leading-relaxed rounded-lg p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                            {control.evidence_requirements || control.description || 'Bu kontrol üçün test addımı təyin edilməyib (Control Library-də əlavə et).'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted-fg)' }}>Nəticəni qeyd et</p>
                          <div className="flex gap-2">
                            {(['pass', 'partial', 'fail'] as const).map(r => (
                              <button key={r} onClick={e => { e.stopPropagation(); runTest(control, r) }}
                                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                                  control.status === r ? STATUS_CFG[r].cls : 'hover:bg-black/[0.04]')}
                                style={control.status !== r ? { borderColor: 'var(--border)', color: 'var(--foreground)' } : undefined}>
                                {STATUS_CFG[r].label}
                              </button>
                            ))}
                          </div>
                          {control.execution_frequency && (
                            <p className="text-[10px] mt-1.5" style={{ color: 'var(--muted-fg)' }}>
                              Tezlik: {control.execution_frequency} · nəticə qeyd olunanda növbəti yoxlama avtomatik hesablanır.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right — observation + evidence */}
                      <div className="space-y-3" onClick={e => e.stopPropagation()}>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>Audit Observation</p>
                          <textarea defaultValue={control.evidence_note ?? ''} rows={3}
                            onBlur={e => { if (e.target.value !== (control.evidence_note ?? '')) patchField(control, { evidence_note: e.target.value }) }}
                            placeholder="Yoxlama zamanı ortaya çıxan qeydlər və nöqsanlar…"
                            className={cn(inputCls, 'resize-none')} style={inputStyle} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>Evidence (link)</p>
                          <div className="flex items-center gap-2">
                            <input defaultValue={control.evidence_url ?? ''} placeholder="https://… sübut sənədinin linki"
                              onBlur={e => { if (e.target.value !== (control.evidence_url ?? '')) patchField(control, { evidence_url: e.target.value }) }}
                              className={inputCls} style={inputStyle} />
                            {control.evidence_url && (
                              <a href={control.evidence_url} target="_blank" rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border hover:bg-black/[0.04]"
                                style={{ borderColor: 'var(--border)' }}>
                                <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} />
                              </a>
                            )}
                          </div>
                        </div>
                        {control.reviewed_by && (
                          <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
                            Son test: {control.reviewed_by} · {fmtDate(control.reviewed_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
