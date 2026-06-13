'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sliders, FileText } from 'lucide-react'
import type { Risk, OrgUnit, UserProfile, UserRole, Control, RiskTrigger } from '@/types'
import { RISK_CATEGORIES, type RiskCategory } from '@/lib/risk-categories'
import { RISK_STATUSES, RISK_STATUS_VALUES, type RiskStatus } from '@/lib/risk-status'
import { MOCK_USERS } from '@/lib/seed-data'
import { db } from '@/lib/db'
import { resolveOwnerFromUnit } from '@/lib/org'
import { orgUnitCode, generateRiskCode } from '@/lib/risk-id'
import { validateRiskConsistency } from '@/lib/risk-logic'
import { cn } from '@/lib/utils'
import {
  calculateInherentLevel,
  evaluateControlEffectiveness,
  evaluateControlActivity,
  aggregateControlEffectiveness,
  calculateResidualLevel,
  calculateRiskGap,
  getRoleAllowedStrategies,
  TREATMENT_STRATEGY_LABELS,
  type TreatmentStrategy
} from '@/lib/rcsa'
import {
  IMPACT_OPTIONS,
  LIKELIHOOD_OPTIONS,
  CONTROL_RATING_INFO,
  residualLevelWord,
  computeDueDate
} from '@/lib/rcsa-content'
import { RcsaSelect } from './RcsaSelect'
import { TriggersEditor } from './TriggersEditor'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description required'),
  category: z.enum(RISK_CATEGORIES.map((c) => c.value) as [RiskCategory, ...RiskCategory[]]),
  level: z.enum(['minimal', 'low', 'medium', 'high', 'critical']),
  status: z.enum(RISK_STATUS_VALUES as [RiskStatus, ...RiskStatus[]]),
  owner_id: z.string().optional(),
  due_date: z.string().optional(),
  likelihood: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  mitigation: z.string().optional(),
  treatment_plan: z.string().optional(),
  
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
  const [currentRole, setCurrentRole] = useState<UserRole>('admin')
  const [triggers, setTriggers] = useState<RiskTrigger[]>(risk?.triggers ?? [])
  const [controlsLib, setControlsLib] = useState<Control[]>([])
  const dueTouched = useRef(false)

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
          treatment_plan: risk.treatment_plan ?? '',
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

  // Control effectiveness is now aggregated from per-control assessments under triggers
  const effEval = aggregateControlEffectiveness(triggers)
  const residualLevel = calculateResidualLevel(computedLevel, effEval.rating)
  const consistencyIssues = validateRiskConsistency(triggers, computedLevel)

  useEffect(() => {
    setValue('impact', computedImpact)
    setValue('level', computedLevel)
  }, [computedImpact, computedLevel, setValue])

  // Reset the manual-edit guard whenever the dialog opens for a different risk
  useEffect(() => {
    dueTouched.current = false
  }, [risk?.id])

  // SLA: auto-suggest due date from residual level unless the user edited it manually
  const createdISO = risk?.created_at
  useEffect(() => {
    if (dueTouched.current) return
    setValue('due_date', computeDueDate(residualLevel, createdISO))
  }, [residualLevel, createdISO, setValue])

  // Load org structure (departments only) + profiles for owner auto-fill
  useEffect(() => {
    let active = true
    async function load() {
      const [units, people, controls] = await Promise.all([db.getOrgUnits(), db.getProfiles(), db.getControls()])
      if (!active) return
      setDepartments(units.filter(u => u.type === 'department'))
      setControlsLib(controls)
      if (people.length > 0) {
        setProfiles(people)
        setCurrentRole(people[0].role)
      }
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

  const onSubmit = async (values: FormValues) => {
    const owner = profiles.find(u => u.id === values.owner_id)

    // Aggregate effectiveness from per-control assessments under triggers
    const evalResult = aggregateControlEffectiveness(triggers)
    const inherent = calculateInherentLevel(values.likelihood, values.impact)

    // Department-based unique Risk ID (only generated once, for new risks)
    let riskCode = risk?.risk_code
    if (!riskCode) {
      const dept = departments.find(u => u.name === values.owner_dept)
      const existing = await db.getRisks()
      riskCode = generateRiskCode(orgUnitCode(dept), existing)
    }

    // Persist computed degree onto each control activity for display
    const savedTriggers: RiskTrigger[] = triggers.map(t => ({
      ...t,
      controls: t.controls.map(c => {
        const e = evaluateControlEffectiveness(
          c.design_compliance || 3, c.design_strength || 3, c.design_timeliness || 3,
          c.impl_relevance || 3, c.impl_sustainability || 3, c.impl_traceability || 3
        )
        return { ...c, score: e.score, rating: e.rating }
      }),
    }))

    const saved: Risk = {
      id: risk?.id ?? `r-${Date.now()}`,
      risk_code: riskCode,
      org_id: 'org1',
      ...values,
      triggers: savedTriggers,
      owner_name: owner?.full_name,
      control_design: Math.round(evalResult.designAvg),
      control_implementation: Math.round(evalResult.implementationAvg),
      control_effectiveness: evalResult.rating as any,
      residual_level: calculateResidualLevel(inherent, evalResult.rating),
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
            <form id="risk-form" onSubmit={handleSubmit(onSubmit, () => setActiveTab('general'))} className="space-y-4">
              
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
                        {RISK_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>
                        Due Date <span className="text-[9px] font-normal text-slate-500">(SLA: residual səviyyədən avtomatik)</span>
                      </label>
                      <input type="date" {...register('due_date')} onInput={() => { dueTouched.current = true }}
                        className={inputClass} style={sty} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>Notes</label>
                    <textarea {...register('notes')} rows={2} placeholder="Additional notes, review details, audit references…"
                      className={cn(inputClass, 'resize-none')} style={sty} />
                  </div>

                  {/* Triggers → Controls (feeds RCSA control effectiveness) */}
                  <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <TriggersEditor triggers={triggers} onChange={setTriggers} library={controlsLib} />
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

                  {/* Residual result — shown at the top, under the inherent risk */}
                  <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-300">Hesablanmış Qalıq Risk (Residual)</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Inherent ({computedLevel}) × Control ({CONTROL_RATING_INFO[effEval.rating].label})</p>
                    </div>
                    <span className="text-base font-black text-sky-400 uppercase">{residualLevelWord(residualLevel)}</span>
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
                        <RcsaSelect
                          key={f.name}
                          label={f.label}
                          value={watch(f.name as any) || 1}
                          options={IMPACT_OPTIONS}
                          onChange={(v) => setValue(f.name as any, v)}
                        />
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
                        <RcsaSelect
                          key={f.name}
                          label={f.label}
                          value={watch(f.name as any) || 1}
                          options={IMPACT_OPTIONS}
                          onChange={(v) => setValue(f.name as any, v)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Probability */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>3. Likelihood / Probability Rating</h4>
                    <RcsaSelect
                      label="Likelihood / Probability"
                      value={likelihood || 1}
                      options={LIKELIHOOD_OPTIONS}
                      onChange={(v) => setValue('likelihood', v)}
                    />
                  </div>

                  {/* Control Effectiveness — aggregated from per-control assessments under Triggers (General Details) */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>4. Control Effectiveness (per-control aqreqat)</h4>

                    {triggers.flatMap(t => t.controls).length === 0 ? (
                      <p className="text-[11px] text-amber-400">Hələ control yoxdur. Effektivlik üçün General Details → Triggers bölməsində hər səbəbə control əlavə edib qiymətləndirin.</p>
                    ) : (
                      <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-400">Aqreqat Effectiveness Rating:</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{triggers.flatMap(t => t.controls).length} control · Orta bal: {effEval.score.toFixed(2)}</p>
                          </div>
                          <span className="font-black text-sky-400 uppercase">{CONTROL_RATING_INFO[effEval.rating].label}</span>
                        </div>

                        {/* Per-control breakdown — these are the controls chosen in General Details */}
                        <div className="border-t pt-2 space-y-1" style={{ borderColor: 'var(--border)' }}>
                          {triggers.flatMap(t => t.controls).map((c) => {
                            const e = evaluateControlActivity(c)
                            return (
                              <div key={c.id} className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-400 truncate">• {c.description || 'Adsız control'}</span>
                                <span className="text-[10px] font-bold text-sky-400 uppercase shrink-0">{CONTROL_RATING_INFO[e.rating].label}</span>
                              </div>
                            )
                          })}
                        </div>

                        <p className="text-[10px] text-slate-500 leading-snug border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                          {CONTROL_RATING_INFO[effEval.rating].desc}
                        </p>
                      </div>
                    )}

                    {/* Consistency warnings */}
                    {consistencyIssues.length > 0 && (
                      <div className="space-y-1">
                        {consistencyIssues.map((iss, i) => (
                          <p key={i} className={`text-[10px] ${iss.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'}`}>
                            • {iss.message}
                          </p>
                        ))}
                      </div>
                    )}
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
                        const gapVal = calculateRiskGap(residualLevel, watch('target_residual_risk'))
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

                  {/* Risk Treatment Plan (role-gated strategy) */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>6. Risk Treatment Plan</h4>
                    {(() => {
                      const allowed = getRoleAllowedStrategies(currentRole)
                      const selected = watch('mitigation')
                      if (allowed.length === 0) {
                        return <p className="text-[11px] text-amber-400">Cari rol ({currentRole}) yalnız baxış icazəsinə malikdir — treatment strategiyası seçə bilməz.</p>
                      }
                      return (
                        <div className="flex flex-wrap gap-2">
                          {allowed.map((s) => {
                            const isActive = selected === s
                            return (
                              <button key={s} type="button" onClick={() => setValue('mitigation', s)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                  isActive ? 'bg-sky-500 text-white border-sky-500' : 'border-white/10 text-slate-400 hover:border-white/20'
                                }`}>
                                {TREATMENT_STRATEGY_LABELS[s as TreatmentStrategy]}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                    <textarea {...register('treatment_plan')} rows={2} placeholder="Treatment planı: remediasiya nəzarətləri, texniki düzəlişlər, SLA şərtləri…"
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

