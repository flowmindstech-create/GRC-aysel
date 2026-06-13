'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sliders, FileText } from 'lucide-react'
import type { Risk, OrgUnit, UserProfile } from '@/types'
import { RISK_CATEGORIES, type RiskCategory } from '@/lib/risk-categories'
import { MOCK_USERS } from '@/lib/seed-data'
import { db } from '@/lib/db'
import { resolveOwnerFromUnit } from '@/lib/org'
import { cn } from '@/lib/utils'
import {
  calculateInherentLevel,
  evaluateControlEffectiveness,
  calculateResidualLevel,
  calculateRiskGap
} from '@/lib/rcsa'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description required'),
  category: z.enum(RISK_CATEGORIES.map((c) => c.value) as [RiskCategory, ...RiskCategory[]]),
  level: z.enum(['minimal', 'low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'in_progress', 'mitigated', 'accepted', 'closed']),
  owner_id: z.string().optional(),
  due_date: z.string().optional(),
  likelihood: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  mitigation: z.string().optional(),
  
  // RCSA Fields
  sub_category: z.string().optional(),
  owner_dept: z.string().optional(),
  owner_role: z.string().optional(),
  notes: z.string().optional(),
  implementation_date: z.string().optional(),
  confidentiality: z.number().min(1).max(5),
  integrity: z.number().min(1).max(5),
  availability: z.number().min(1).max(5),
  operational_impact: z.number().min(1).max(5),
  financial_impact: z.number().min(1).max(5),
  reputation_impact: z.number().min(1).max(5),
  compliance_impact: z.number().min(1).max(5),
  target_residual_risk: z.string().optional(),
  control_design_compliance: z.number().min(1).max(5).optional(),
  control_design_strength: z.number().min(1).max(5).optional(),
  control_design_timeliness: z.number().min(1).max(5).optional(),
  control_implementation_relevance: z.number().min(1).max(5).optional(),
  control_implementation_sustainability: z.number().min(1).max(5).optional(),
  control_implementation_traceability: z.number().min(1).max(5).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  risk: Risk | null
  onClose: () => void
  onSave: (risk: Risk) => void
}

export function RiskFormDialog({ risk, onClose, onSave }: Props) {
  const isEdit = !!risk
  const [activeTab, setActiveTab] = useState<'general' | 'rcsa'>('general')
  const [departments, setDepartments] = useState<OrgUnit[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>(MOCK_USERS)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: risk
      ? {
          title: risk.title,
          description: risk.description,
          category: risk.category,
          level: risk.level,
          status: risk.status,
          owner_id: risk.owner_id || '',
          due_date: risk.due_date ?? '',
          likelihood: risk.likelihood,
          impact: risk.impact,
          mitigation: risk.mitigation ?? '',
          sub_category: risk.sub_category || '',
          owner_dept: risk.owner_dept || '',
          owner_role: risk.owner_role || '',
          notes: risk.notes || '',
          implementation_date: risk.implementation_date || '',
          confidentiality: risk.confidentiality || 1,
          integrity: risk.integrity || 1,
          availability: risk.availability || 1,
          operational_impact: risk.operational_impact || 1,
          financial_impact: risk.financial_impact || 1,
          reputation_impact: risk.reputation_impact || 1,
          compliance_impact: risk.compliance_impact || 1,
          target_residual_risk: risk.target_residual_risk || 'low',
          control_design_compliance: risk.control_design_compliance || 3,
          control_design_strength: risk.control_design_strength || 3,
          control_design_timeliness: risk.control_design_timeliness || 3,
          control_implementation_relevance: risk.control_implementation_relevance || 3,
          control_implementation_sustainability: risk.control_implementation_sustainability || 3,
          control_implementation_traceability: risk.control_implementation_traceability || 3,
        }
      : {
          category: 'cybersecurity',
          level: 'medium',
          status: 'open',
          likelihood: 2,
          impact: 1,
          confidentiality: 1,
          integrity: 1,
          availability: 1,
          operational_impact: 1,
          financial_impact: 1,
          reputation_impact: 1,
          compliance_impact: 1,
          target_residual_risk: 'low',
          control_design_compliance: 3,
          control_design_strength: 3,
          control_design_timeliness: 3,
          control_implementation_relevance: 3,
          control_implementation_sustainability: 3,
          control_implementation_traceability: 3,
        },
  })

  // Watch RCSA values for live calculation
  const confidentiality = watch('confidentiality')
  const integrity = watch('integrity')
  const availability = watch('availability')
  const operational_impact = watch('operational_impact')
  const financial_impact = watch('financial_impact')
  const reputation_impact = watch('reputation_impact')
  const compliance_impact = watch('compliance_impact')
  const likelihood = watch('likelihood')

  // Calculate final impact as the maximum watermark of all domains
  const computedImpact = Math.max(
    confidentiality || 1,
    integrity || 1,
    availability || 1,
    operational_impact || 1,
    financial_impact || 1,
    reputation_impact || 1,
    compliance_impact || 1
  )

  // Calculate Level based on the 5x5 Matrix
  const computedLevel = calculateInherentLevel(likelihood, computedImpact)

  useEffect(() => {
    setValue('impact', computedImpact)
    setValue('level', computedLevel)
  }, [computedImpact, computedLevel, setValue])

  // Load org structure (departments only) + profiles for owner auto-fill
  useEffect(() => {
    let active = true
    async function load() {
      const [units, people] = await Promise.all([db.getOrgUnits(), db.getProfiles()])
      if (!active) return
      setDepartments(units.filter(u => u.type === 'department'))
      if (people.length > 0) setProfiles(people)
    }
    load()
    return () => { active = false }
  }, [])

  // When a department is picked, auto-fill Risk Owner + role + department name
  const handleDepartmentChange = (unitId: string) => {
    const unit = departments.find(u => u.id === unitId)
    const resolved = resolveOwnerFromUnit(unit, profiles)
    setValue('owner_dept', resolved.owner_dept)
    setValue('owner_role', resolved.owner_role)
    setValue('owner_id', resolved.owner_id)
  }

  // Match the saved department name back to a unit id for the select value
  const selectedDeptId = departments.find(u => u.name === watch('owner_dept'))?.id ?? ''

  const onSubmit = (values: FormValues) => {
    const owner = profiles.find(u => u.id === values.owner_id)
    
    const evalResult = evaluateControlEffectiveness(
      values.control_design_compliance || 3,
      values.control_design_strength || 3,
      values.control_design_timeliness || 3,
      values.control_implementation_relevance || 3,
      values.control_implementation_sustainability || 3,
      values.control_implementation_traceability || 3
    )

    const saved: Risk = {
      id: risk?.id ?? `r-${Date.now()}`,
      org_id: 'org1',
      ...values,
      owner_name: owner?.full_name,
      control_design: Math.round(evalResult.designAvg),
      control_implementation: Math.round(evalResult.implementationAvg),
      control_effectiveness: evalResult.rating as any,
      created_at: risk?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(saved)
  }

  const inputClass = cn(
    'w-full px-3 py-2 rounded-xl text-xs outline-none transition-colors bg-transparent border',
    'focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500'
  )
  const sty = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  const scoreColor =
    likelihood * computedImpact >= 16 ? 'text-red-500 bg-red-500/10 border-red-500/20' :
    likelihood * computedImpact >= 9  ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' :
    likelihood * computedImpact >= 4  ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' : 'text-green-500 bg-green-500/10 border-green-500/20'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
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
                {isEdit ? 'Edit Risk Profile' : 'Register New Risk'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                Document risk properties and assess inherent risk levels.
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10">
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b px-6 gap-4 text-xs font-semibold" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveTab('general')}
              className={cn('py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer', {
                'border-sky-500 text-sky-500': activeTab === 'general',
                'border-transparent text-slate-400 hover:text-slate-300': activeTab !== 'general',
              })}
            >
              <FileText className="w-3.5 h-3.5" /> General Details
            </button>
            <button
              onClick={() => setActiveTab('rcsa')}
              className={cn('py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer', {
                'border-sky-500 text-sky-500': activeTab === 'rcsa',
                'border-transparent text-slate-400 hover:text-slate-300': activeTab !== 'rcsa',
              })}
            >
              <Sliders className="w-3.5 h-3.5" /> RCSA Assessment Matrix
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-6">
            <form id="risk-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {activeTab === 'general' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Risk Title *</label>
                    <input {...register('title')} placeholder="e.g. SQL Injection in Customer Portal"
                      className={inputClass} style={sty} />
                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Description *</label>
                    <textarea {...register('description')} rows={3} placeholder="Describe the risk scenario, vulnerabilities, and potential triggers…"
                      className={cn(inputClass, 'resize-none')} style={sty} />
                    {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Category</label>
                      <select {...register('category')} className={inputClass} style={sty}>
                        {RISK_CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Sub-Category</label>
                      <input {...register('sub_category')} placeholder="e.g. Medical security process" className={inputClass} style={sty} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Owner Department</label>
                      <select
                        value={selectedDeptId}
                        onChange={(e) => handleDepartmentChange(e.target.value)}
                        className={inputClass}
                        style={sty}
                      >
                        <option value="">Select department…</option>
                        {departments.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Risk Owner</label>
                      <select {...register('owner_id')} className={inputClass} style={sty}>
                        <option value="">Unassigned</option>
                        {profiles.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Owner Job Role</label>
                      <input {...register('owner_role')} placeholder="e.g. SecOps Lead" className={inputClass} style={sty} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Status</label>
                      <select {...register('status')} className={inputClass} style={sty}>
                        {['open','in_progress','mitigated','accepted','closed'].map(s => (
                          <option key={s} value={s}>{s.replace('_',' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Due Date</label>
                      <input type="date" {...register('due_date')} className={inputClass} style={sty} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Notes</label>
                    <textarea {...register('notes')} rows={2} placeholder="Additional notes, review details, audit references…"
                      className={cn(inputClass, 'resize-none')} style={sty} />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Visual computation dashboard */}
                  <div className={cn('p-4 rounded-xl border flex items-center justify-between transition-colors', scoreColor)}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider">Inherent Score (Likelihood × Final Impact)</p>
                      <p className="text-xl font-black mt-0.5">{likelihood} × {computedImpact} = {likelihood * computedImpact}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider">Matrix Rating</p>
                      <p className="text-lg font-black uppercase mt-0.5">{computedLevel}</p>
                    </div>
                  </div>

                  {/* ── Təsir Reytinqi (Impact Rating Scale) Legend ── */}
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex">
                      {/* Header cell */}
                      <div className="flex items-center justify-center px-3 py-2 text-[10px] font-bold shrink-0 w-28"
                        style={{ background: 'var(--card)', color: 'var(--foreground)', borderRight: '1px solid var(--border)' }}>
                        Təsir reytinqi
                      </div>
                      {/* Scale cells */}
                      {[
                        { label: 'Minimal',   bg: '#16a34a', score: '1' },
                        { label: 'Aşağı',     bg: '#ca8a04', score: '2' },
                        { label: 'Orta',      bg: '#d97706', score: '3' },
                        { label: 'Yüksək',    bg: '#ea580c', score: '4' },
                        { label: 'Maksimum',  bg: '#dc2626', score: '5' },
                        { label: 'Kritik riskler / fors-major hallar', bg: '#0ea5e9', score: '6+' },
                      ].map((item, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-center py-2 px-1 text-center"
                          style={{ background: item.bg, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : undefined }}>
                          <span className="text-[9px] font-black text-white leading-tight">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Impact categories */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>1. Security Confidentiality, Integrity & Availability (CIA) Impacts</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { name: 'confidentiality', label: 'Confidentiality' },
                        { name: 'integrity', label: 'Integrity' },
                        { name: 'availability', label: 'Availability' },
                      ].map(f => (
                        <div key={f.name} className="p-2.5 rounded-lg border bg-black/10" style={{ borderColor: 'var(--border)' }}>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                            {f.label}: <strong className="text-white">{watch(f.name as any)}</strong>
                          </label>
                          <input type="range" min={1} max={5} {...register(f.name as any, { valueAsNumber: true })} className="w-full py-1 bg-transparent cursor-pointer" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Impact Domains */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>2. Impact Domains (Operational, Financial, Reputation, Compliance)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'operational_impact', label: 'Operational Impact' },
                        { name: 'financial_impact', label: 'Financial Loss Impact' },
                        { name: 'reputation_impact', label: 'Reputation Damage' },
                        { name: 'compliance_impact', label: 'Compliance & Legal Penalties' },
                      ].map(f => (
                        <div key={f.name} className="p-2.5 rounded-lg border bg-black/10" style={{ borderColor: 'var(--border)' }}>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                            {f.label}: <strong className="text-white">{watch(f.name as any)}</strong>
                          </label>
                          <input type="range" min={1} max={5} {...register(f.name as any, { valueAsNumber: true })} className="w-full py-1 bg-transparent cursor-pointer" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Probability */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>3. Likelihood / Probability Rating</h4>
                    <div className="p-3 rounded-lg border bg-black/10" style={{ borderColor: 'var(--border)' }}>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1.5">
                        Likelihood: <strong className="text-sky-400">{likelihood} / 5</strong>
                      </label>
                      <input type="range" min={1} max={5} {...register('likelihood', { valueAsNumber: true })} className="w-full py-1 bg-transparent cursor-pointer" />
                      <div className="flex justify-between text-[8px] text-slate-500 mt-2 font-mono">
                        <span>1: Rare (&lt;5%)</span>
                        <span>2: Unlikely (5-10%)</span>
                        <span>3: Possible (11-20%)</span>
                        <span>4: Likely (21-50%)</span>
                        <span>5: Almost Certain (&gt;50%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Control Effectiveness sliders */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>4. Control Effectiveness Evaluation (6 sub-criteria)</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Design Column */}
                      <div className="space-y-3 p-3 rounded-xl border bg-black/10" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Control Design (1-5)</span>
                        
                        {[
                          { name: 'control_design_compliance', label: 'Compliance & Coverage' },
                          { name: 'control_design_strength', label: 'Control Strength' },
                          { name: 'control_design_timeliness', label: 'Execution Timeliness' }
                        ].map(f => (
                          <div key={f.name} className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 flex justify-between">
                              <span>{f.label}:</span>
                              <strong className="text-white">{watch(f.name as any) || 3}</strong>
                            </label>
                            <input type="range" min={1} max={5} {...register(f.name as any, { valueAsNumber: true })} className="w-full py-1 bg-transparent cursor-pointer" />
                          </div>
                        ))}
                      </div>

                      {/* Implementation Column */}
                      <div className="space-y-3 p-3 rounded-xl border bg-black/10" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Control Implementation (1-5)</span>
                        
                        {[
                          { name: 'control_implementation_relevance', label: 'Relevance & Currency' },
                          { name: 'control_implementation_sustainability', label: 'Sustainability/Frequency' },
                          { name: 'control_implementation_traceability', label: 'Traceability/Audit Trail' }
                        ].map(f => (
                          <div key={f.name} className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 flex justify-between">
                              <span>{f.label}:</span>
                              <strong className="text-white">{watch(f.name as any) || 3}</strong>
                            </label>
                            <input type="range" min={1} max={5} {...register(f.name as any, { valueAsNumber: true })} className="w-full py-1 bg-transparent cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Calculated Effectiveness */}
                    {(() => {
                      const eff = evaluateControlEffectiveness(
                        watch('control_design_compliance') || 3,
                        watch('control_design_strength') || 3,
                        watch('control_design_timeliness') || 3,
                        watch('control_implementation_relevance') || 3,
                        watch('control_implementation_sustainability') || 3,
                        watch('control_implementation_traceability') || 3
                      )
                      return (
                        <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-400">Calculated Effectiveness Rating:</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Average Score: {eff.score.toFixed(2)}</p>
                          </div>
                          <span className="font-black text-sky-400 uppercase">
                            {eff.label}
                          </span>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Target Residual Risk & Appetite check */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>5. Target residual risk & Appetite check</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Target Residual Risk</label>
                        <select {...register('target_residual_risk')} className={inputClass} style={sty}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>

                      {(() => {
                        const eff = evaluateControlEffectiveness(
                          watch('control_design_compliance') || 3,
                          watch('control_design_strength') || 3,
                          watch('control_design_timeliness') || 3,
                          watch('control_implementation_relevance') || 3,
                          watch('control_implementation_sustainability') || 3,
                          watch('control_implementation_traceability') || 3
                        )
                        const resLvl = calculateResidualLevel(computedLevel, eff.rating)
                        const gapVal = calculateRiskGap(resLvl, watch('target_residual_risk'))
                        const isOver = gapVal.gap > 0

                        return (
                          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs self-end ${
                            isOver ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            <div>
                              <p className="font-bold">Risk Appetite Gap:</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{gapVal.text}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              isOver ? 'bg-red-500/20 border border-red-500/20' : 'bg-emerald-500/20 border border-emerald-500/20'
                            }`}>
                              {isOver ? 'Exceeds' : 'On Target'}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--foreground)' }}>Mitigation Actions</label>
                    <textarea {...register('mitigation')} rows={2} placeholder="Describe remediation controls, technical fixes, or SLA terms…"
                      className={cn(inputClass, 'resize-none')} style={sty} />
                  </div>
                </div>
              )}

            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: 'var(--muted-fg)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="risk-form"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
            >
              {isEdit ? 'Save Changes' : 'Create Risk'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

