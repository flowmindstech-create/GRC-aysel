'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, User, Calendar, Tag, BarChart2, Shield, Clock, Database, RefreshCw, Send, ExternalLink, Play, ArrowRight, Check, CheckCircle, AlertTriangle } from 'lucide-react'
import type { Risk, Control } from '@/types'
import { RiskLevelBadge, RiskStatusBadge } from '@/components/shared/Badges'
import { formatDistanceToNow, format } from 'date-fns'
import { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import { toast } from 'sonner'
import {
  calculateInherentLevel,
  evaluateControlEffectiveness,
  calculateResidualLevel,
  calculateRiskGap,
  getRiskLevelNumber,
  getAllowedTreatmentStrategies,
  type TreatmentStrategy
} from '@/lib/rcsa'

interface Props {
  risk: Risk
  onClose: () => void
  onUpdate?: (risk: Risk) => void
}

export function RiskDetailSheet({ risk, onClose, onUpdate }: Props) {
  const [jiraConfig, setJiraConfig] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const [controls, setControls] = useState<Control[]>([])
  
  // Local form states
  const [inhLikelihood, setInhLikelihood] = useState<number>(3)
  const [inhImpact, setInhImpact] = useState<number>(3)
  const [mappedControlIds, setMappedControlIds] = useState<string[]>([])
  const [designCompliance, setDesignCompliance] = useState<number>(3)
  const [designStrength, setDesignStrength] = useState<number>(3)
  const [designTimeliness, setDesignTimeliness] = useState<number>(3)
  const [implRelevance, setImplRelevance] = useState<number>(3)
  const [implSustainability, setImplSustainability] = useState<number>(3)
  const [implTraceability, setImplTraceability] = useState<number>(3)
  const [treatmentPlan, setTreatmentPlan] = useState<string>('')
  const [selectedStrategy, setSelectedStrategy] = useState<string>('mitigate')
  const [actionPlan, setActionPlan] = useState<string>('')
  const [validationEvidence, setValidationEvidence] = useState<string>('')
  const [resLikelihood, setResLikelihood] = useState<number>(2)
  const [resImpact, setResImpact] = useState<number>(2)
  const [escalationAction, setEscalationAction] = useState<string>('mitigate')
  const [targetRisk, setTargetRisk] = useState<string>('low')

  useEffect(() => {
    async function loadData() {
      const allControls = await db.getControls()
      setControls(allControls)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (risk) {
      setInhLikelihood(risk.inherent_likelihood || risk.likelihood || 3)
      setInhImpact(risk.inherent_impact || risk.impact || 3)
      setMappedControlIds(risk.control_mapped_ids || [])
      setDesignCompliance(risk.control_design_compliance || 3)
      setDesignStrength(risk.control_design_strength || 3)
      setDesignTimeliness(risk.control_design_timeliness || 3)
      setImplRelevance(risk.control_implementation_relevance || 3)
      setImplSustainability(risk.control_implementation_sustainability || 3)
      setImplTraceability(risk.control_implementation_traceability || 3)
      setTreatmentPlan(risk.treatment_plan || '')
      setSelectedStrategy(risk.mitigation || 'mitigate')
      setActionPlan(risk.action_plan || '')
      setValidationEvidence(risk.validation_evidence || '')
      setResLikelihood(risk.residual_likelihood || 2)
      setResImpact(risk.residual_impact || 2)
      setTargetRisk(risk.target_residual_risk || 'low')
    }
  }, [risk.id])

  const handleProgressRisk = async (nextStep: string) => {
    const updates: Partial<Risk> = { workflow_step: nextStep }

    if (nextStep === 'registered') {
      updates.status = 'open'
    } else if (nextStep === 'assessed_inherent') {
      updates.inherent_likelihood = inhLikelihood
      updates.inherent_impact = inhImpact
      updates.likelihood = inhLikelihood
      updates.impact = inhImpact
      updates.level = calculateInherentLevel(inhLikelihood, inhImpact)
    } else if (nextStep === 'control_assessed') {
      updates.control_mapped_ids = mappedControlIds
    } else if (nextStep === 'assessed_residual') {
      const evalResult = evaluateControlEffectiveness(
        designCompliance,
        designStrength,
        designTimeliness,
        implRelevance,
        implSustainability,
        implTraceability
      )
      updates.control_design_compliance = designCompliance
      updates.control_design_strength = designStrength
      updates.control_design_timeliness = designTimeliness
      updates.control_implementation_relevance = implRelevance
      updates.control_implementation_sustainability = implSustainability
      updates.control_implementation_traceability = implTraceability
      updates.control_design = Math.round(evalResult.designAvg)
      updates.control_implementation = Math.round(evalResult.implementationAvg)
      updates.control_effectiveness = evalResult.rating as any
    } else if (nextStep === 'owner_review') {
      const inherentLvl = calculateInherentLevel(risk.inherent_likelihood || risk.likelihood || 3, risk.inherent_impact || risk.impact || 3)
      const controlRating = risk.control_effectiveness || 'adequate'
      const residualLvl = calculateResidualLevel(inherentLvl, controlRating as any)
      updates.level = residualLvl
      updates.status = 'in_progress'
    } else if (nextStep === 'appetite_check') {
      const inherentLvl = calculateInherentLevel(risk.inherent_likelihood || risk.likelihood || 3, risk.inherent_impact || risk.impact || 3)
      const controlRating = risk.control_effectiveness || 'adequate'
      const residualLvl = calculateResidualLevel(inherentLvl, controlRating as any)
      updates.target_residual_risk = targetRisk
      
      if (getRiskLevelNumber(residualLvl) <= getRiskLevelNumber(targetRisk as any)) {
        updates.workflow_step = 'accepted'
        updates.status = 'accepted'
      } else {
        updates.workflow_step = 'treatment_plan'
      }
    } else if (nextStep === 'action_plan') {
      updates.treatment_plan = treatmentPlan
      updates.mitigation = selectedStrategy
    } else if (nextStep === 'implementation') {
      updates.action_plan = actionPlan
    } else if (nextStep === 'validation') {
      // completed
    } else if (nextStep === 'residual_reassessment') {
      updates.validation_evidence = validationEvidence
    } else if (nextStep === 'verify_reassessment') {
      const reassessedLevel = calculateInherentLevel(resLikelihood, resImpact)
      if (reassessedLevel === 'low') {
        updates.workflow_step = 'accepted'
        updates.status = 'mitigated'
      } else {
        updates.workflow_step = 'escalated'
      }
    } else if (nextStep === 'accepted') {
      updates.status = 'mitigated'
    } else if (nextStep === 'escalated_decision') {
      updates.escalation_level = escalationAction === 'accept' ? 'board' : 'committee'
      updates.status = escalationAction === 'accept' ? 'accepted' : 'closed'
      updates.workflow_step = 'closed'
    } else if (nextStep === 'closed') {
      updates.status = 'closed'
    }

    const updatedRisk = {
      ...risk,
      ...updates,
      updated_at: new Date().toISOString()
    }
    const saved = await db.saveRisk(updatedRisk)
    if (onUpdate) onUpdate(saved)
    toast.success(`Workflow progressed to: ${saved.workflow_step}`)
  }

  const score = risk.likelihood * risk.impact
  const scoreColor =
    score >= 16 ? '#ef4444' : score >= 9 ? '#f97316' : score >= 4 ? '#eab308' : '#22c55e'

  useEffect(() => {
    async function loadJiraData() {
      const config = await db.getJiraConfig()
      setJiraConfig(config)
      if (risk.jira_issue_key) {
        const acts = await db.getJiraActivities(risk.jira_issue_key)
        const comms = await db.getJiraComments(risk.jira_issue_key)
        setActivities(acts)
        setComments(comms)
      }
    }
    loadJiraData()
  }, [risk.jira_issue_key])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.aside
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-md h-full shadow-2xl flex flex-col"
          style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                  {risk.title}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <RiskLevelBadge level={risk.level} />
                  <RiskStatusBadge status={risk.status} />
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer">
                <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Score gauge */}
            <div className="p-4 rounded-xl text-center" style={{ background: 'var(--muted)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-fg)' }}>RISK SCORE</p>
              <p className="text-4xl font-black" style={{ color: scoreColor }}>{score}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>
                Likelihood {risk.likelihood} × Impact {risk.impact}
              </p>
              <div className="flex justify-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{risk.likelihood}</p>
                  <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Likelihood</p>
                </div>
                <div className="text-slate-300 dark:text-slate-600 text-xl self-center">×</div>
                <div className="text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{risk.impact}</p>
                  <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Impact</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-fg)' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{risk.description}</p>
            </div>

            {/* Workflow Step Progress */}
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>Workflow Progress</p>
                <a
                  href="/workflows"
                  className="text-[10px] text-sky-500 hover:text-sky-500 font-bold flex items-center gap-1 cursor-pointer"
                >
                  Open in Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg" style={{ background: 'var(--muted)' }}>
                <div>
                  <p className="font-bold capitalize" style={{ color: 'var(--foreground)' }}>
                    {risk.workflow_step ? risk.workflow_step.replace(/_/g, ' ') : 'Registered'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                    {risk.status === 'closed' ? 'Risk completed' : 'Risk is active'}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-900/10 text-sky-400 border border-sky-500/10">
                  {risk.status.toUpperCase()}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-sky-500 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((([
                        'identified', 'registered', 'assessed_inherent', 'control_mapped', 
                        'control_assessed', 'assessed_residual', 'owner_review', 'mgt_review', 
                        'treatment_plan', 'action_plan', 'implementation', 'validation', 
                        'residual_reassessment', 'accepted', 'escalated', 'closed'
                      ].indexOf(risk.workflow_step || 'registered') + 1) / 16) * 100)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>Start</span>
                  <span>
                    Step {[
                      'identified', 'registered', 'assessed_inherent', 'control_mapped', 
                      'control_assessed', 'assessed_residual', 'owner_review', 'mgt_review', 
                      'treatment_plan', 'action_plan', 'implementation', 'validation', 
                      'residual_reassessment', 'accepted', 'escalated', 'closed'
                    ].indexOf(risk.workflow_step || 'registered') + 1} / 16
                  </span>
                </div>
              </div>

              {/* Active Step Panel (Inline Progression) */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Play className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Active Step Action</span>
                </div>
                
                <div className="space-y-4">
                  {(risk.workflow_step === 'identified' || !risk.workflow_step) && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400">New risk identified. Progress to registration stage.</p>
                      <button
                        onClick={() => handleProgressRisk('registered')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-sky-500/20"
                      >
                        <Play className="w-3.5 h-3.5" /> Start Registration
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'registered' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400">The risk details are documented. Proceed to inherent risk assessment.</p>
                      <button
                        onClick={() => handleProgressRisk('assessed_inherent')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg"
                      >
                        Go to Inherent Assessment <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'assessed_inherent' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                          <span>Likelihood: {inhLikelihood}</span>
                        </label>
                        <input
                          type="range" min="1" max="5" value={inhLikelihood}
                          onChange={(e) => setInhLikelihood(parseInt(e.target.value))}
                          className="w-full py-1 bg-transparent cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                          <span>Impact: {inhImpact}</span>
                        </label>
                        <input
                          type="range" min="1" max="5" value={inhImpact}
                          onChange={(e) => setInhImpact(parseInt(e.target.value))}
                          className="w-full py-1 bg-transparent cursor-pointer"
                        />
                      </div>
                      <div className="p-2.5 rounded bg-black/20 border border-white/5 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Inherent Level:</span>
                        <span className="font-bold text-rose-450 uppercase">{calculateInherentLevel(inhLikelihood, inhImpact)} ({inhLikelihood * inhImpact})</span>
                      </div>
                      <button
                        onClick={() => handleProgressRisk('control_mapped')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg"
                      >
                        Confirm & Map Controls <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'control_mapped' && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-400 block">Select Controls to Map</label>
                      <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                        {controls.map(c => {
                          const checked = mappedControlIds.includes(c.id)
                          return (
                            <label key={c.id} className="flex items-center gap-2 p-1.5 rounded bg-black/10 text-xs cursor-pointer border border-white/5 hover:border-white/10">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    setMappedControlIds(prev => prev.filter(id => id !== c.id))
                                  } else {
                                    setMappedControlIds(prev => [...prev, c.id])
                                  }
                                }}
                                className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 h-3 w-3 bg-transparent cursor-pointer"
                              />
                              <span className="text-[9px] font-bold text-sky-400 font-mono shrink-0">{c.control_id}</span>
                              <span className="text-slate-350 truncate">{c.title}</span>
                            </label>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => handleProgressRisk('control_assessed')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg"
                      >
                        Assess Control Effectiveness <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'control_assessed' && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-400 font-medium">Rate control effectiveness (1 = Strong, 5 = Weak):</p>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                            <span>Design Compliance:</span>
                            <span className="font-bold">{designCompliance}/5</span>
                          </label>
                          <input type="range" min="1" max="5" value={designCompliance} onChange={e => setDesignCompliance(parseInt(e.target.value))} className="w-full py-1 bg-transparent cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                            <span>Design Strength:</span>
                            <span className="font-bold">{designStrength}/5</span>
                          </label>
                          <input type="range" min="1" max="5" value={designStrength} onChange={e => setDesignStrength(parseInt(e.target.value))} className="w-full py-1 bg-transparent cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                            <span>Design Timeliness:</span>
                            <span className="font-bold">{designTimeliness}/5</span>
                          </label>
                          <input type="range" min="1" max="5" value={designTimeliness} onChange={e => setDesignTimeliness(parseInt(e.target.value))} className="w-full py-1 bg-transparent cursor-pointer" />
                        </div>
                        <div className="space-y-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                          <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                            <span>Implementation Relevance:</span>
                            <span className="font-bold">{implRelevance}/5</span>
                          </label>
                          <input type="range" min="1" max="5" value={implRelevance} onChange={e => setImplRelevance(parseInt(e.target.value))} className="w-full py-1 bg-transparent cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                            <span>Implementation Sustainability:</span>
                            <span className="font-bold">{implSustainability}/5</span>
                          </label>
                          <input type="range" min="1" max="5" value={implSustainability} onChange={e => setImplSustainability(parseInt(e.target.value))} className="w-full py-1 bg-transparent cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                            <span>Implementation Traceability:</span>
                            <span className="font-bold">{implTraceability}/5</span>
                          </label>
                          <input type="range" min="1" max="5" value={implTraceability} onChange={e => setImplTraceability(parseInt(e.target.value))} className="w-full py-1 bg-transparent cursor-pointer" />
                        </div>
                      </div>

                      <div className="p-2 rounded bg-black/20 border border-white/5 flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold">Effectiveness:</span>
                        <span className="font-bold text-sky-400 capitalize">
                          {evaluateControlEffectiveness(designCompliance, designStrength, designTimeliness, implRelevance, implSustainability, implTraceability).label}
                        </span>
                      </div>

                      <button
                        onClick={() => handleProgressRisk('assessed_residual')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg"
                      >
                        Calculate Residual Level <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'assessed_residual' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/10 text-center">
                        <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">Computed Residual Risk</p>
                        <p className="text-xl font-black text-white capitalize mt-1">
                          {calculateResidualLevel(
                            calculateInherentLevel(risk.inherent_likelihood || 3, risk.inherent_impact || 3),
                            (risk.control_effectiveness || 'adequate') as any
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleProgressRisk('owner_review')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg"
                      >
                        Submit to Owner Review <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'owner_review' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400">Risk owner review in progress. Sign off on assessment.</p>
                      <button
                        onClick={() => handleProgressRisk('mgt_review')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve & Sign Off
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'mgt_review' && (() => {
                    const inherentLvl = calculateInherentLevel(risk.inherent_likelihood || 3, risk.inherent_impact || 3)
                    const controlRating = risk.control_effectiveness || 'adequate'
                    const residualLvl = calculateResidualLevel(inherentLvl, controlRating as any)
                    const gapVal = calculateRiskGap(residualLvl, targetRisk)

                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Target Appetite:</span>
                          <select
                            value={targetRisk}
                            onChange={(e) => setTargetRisk(e.target.value as any)}
                            className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-xs font-semibold outline-none text-white cursor-pointer"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        
                        <div className={`p-2.5 border rounded-lg flex items-center justify-between text-xs ${
                          gapVal.gap > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          <div>
                            <p className="font-bold">Appetite Check:</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{gapVal.text}</p>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            gapVal.gap > 0 ? 'bg-red-500/20 border border-red-500/20' : 'bg-emerald-500/20 border border-emerald-500/20'
                          }`}>
                            {gapVal.gap > 0 ? 'Exceeds' : 'Within'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleProgressRisk('appetite_check')}
                          className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg"
                        >
                          Confirm & Run Appetite Check
                        </button>
                      </div>
                    )
                  })()}

                  {risk.workflow_step === 'treatment_plan' && (
                    <div className="space-y-3">
                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 rounded">
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 animate-pulse" />
                        Residual risk exceeds appetite! Treatment required.
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Strategy</label>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                          {getAllowedTreatmentStrategies(calculateInherentLevel(risk.inherent_likelihood || 3, risk.inherent_impact || 3)).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSelectedStrategy(opt)}
                              className={`py-1 px-2 rounded border cursor-pointer capitalize text-center ${
                                selectedStrategy === opt
                                  ? 'border-sky-500 text-white bg-sky-500/20'
                                  : 'border-white/5 text-slate-400 hover:border-white/10'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <textarea
                          placeholder="Treatment strategy details…"
                          value={treatmentPlan}
                          onChange={(e) => setTreatmentPlan(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-white/10 bg-transparent outline-none text-white focus:border-sky-500 resize-none"
                        />
                      </div>

                      <button
                        onClick={() => handleProgressRisk('action_plan')}
                        disabled={!treatmentPlan.trim()}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        Save & Plan Actions <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'action_plan' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Action Plan Milestones</label>
                        <textarea
                          placeholder="Detail specific tasks, deadlines, and owners..."
                          value={actionPlan}
                          onChange={(e) => setActionPlan(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-white/10 bg-transparent outline-none text-white focus:border-sky-500 resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleProgressRisk('implementation')}
                        disabled={!actionPlan.trim()}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        Send to Implementation <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'implementation' && (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-black/10 border border-white/5 rounded text-xs">
                        <p className="font-semibold text-slate-350">Action Plan:</p>
                        <p className="text-slate-400 italic mt-0.5">{risk.action_plan}</p>
                      </div>
                      <button
                        onClick={() => handleProgressRisk('validation')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        Mark Actions Completed
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'validation' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Evidence Notes</label>
                        <textarea
                          placeholder="Evidence links, verification notes, audit trails..."
                          value={validationEvidence}
                          onChange={(e) => setValidationEvidence(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-white/10 bg-transparent outline-none text-white focus:border-sky-500 resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleProgressRisk('residual_reassessment')}
                        disabled={!validationEvidence.trim()}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        Proceed to Reassessment
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'residual_reassessment' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                          <span>Reassessed Likelihood: {resLikelihood}</span>
                        </label>
                        <input type="range" min="1" max="5" value={resLikelihood} onChange={e => setResLikelihood(parseInt(e.target.value))} className="w-full py-1 bg-transparent cursor-pointer" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                          <span>Reassessed Impact: {resImpact}</span>
                        </label>
                        <input type="range" min="1" max="5" value={resImpact} onChange={e => setResImpact(parseInt(e.target.value))} className="w-full py-1 bg-transparent cursor-pointer" />
                      </div>
                      <div className="p-2 rounded bg-black/20 border border-white/5 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Reassessed Level:</span>
                        <span className="font-bold text-emerald-400 uppercase">{calculateInherentLevel(resLikelihood, resImpact)}</span>
                      </div>
                      <button
                        onClick={() => handleProgressRisk('verify_reassessment')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        Run Appetite Verification
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'accepted' && (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-lg flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Risk is accepted within appetite limits and placed under monitoring.</span>
                      </div>
                      <button
                        onClick={() => handleProgressRisk('closed')}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        Close Risk File
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'escalated' && (
                    <div className="space-y-3">
                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 rounded">
                        Residual risk exceeds appetite! Board or Committee action required.
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Board Decision</label>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                          {[
                            { value: 'accept', label: 'Accept' },
                            { value: 'mitigate', label: 'Mitigate' },
                            { value: 'transfer', label: 'Transfer' },
                            { value: 'avoid', label: 'Avoid' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setEscalationAction(opt.value as any)}
                              className={`py-1 px-2 rounded border cursor-pointer text-center ${
                                escalationAction === opt.value
                                  ? 'border-sky-500 text-white bg-sky-500/20'
                                  : 'border-white/5 text-slate-400 hover:border-white/10'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleProgressRisk('escalated_decision')}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        Apply Decision & Close
                      </button>
                    </div>
                  )}

                  {risk.workflow_step === 'closed' && (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-slate-500/10 border border-white/5 text-xs text-slate-450 rounded-lg text-center font-semibold">
                        Workflow completed. Risk file closed.
                      </div>
                      <button
                        onClick={() => handleProgressRisk('identified')}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        Re-activate Risk
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Tag, label: 'Category', value: risk.category },
                { icon: User, label: 'Owner', value: risk.owner_name ?? '—' },
                { icon: Calendar, label: 'Due Date', value: risk.due_date ? format(new Date(risk.due_date), 'dd MMM yyyy') : '—' },
                { icon: Clock, label: 'Created', value: formatDistanceToNow(new Date(risk.created_at), { addSuffix: true }) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color: 'var(--muted-fg)' }} />
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>{label}</p>
                  </div>
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--foreground)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* RCSA Profile */}
            {(risk.sub_category || risk.owner_dept || risk.owner_role || (risk.confidentiality !== undefined && risk.confidentiality > 0)) && (
              <div className="space-y-3 p-4 rounded-xl border text-xs bg-slate-900/40" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wide border-b pb-1" style={{ borderColor: 'var(--border)' }}>RCSA Assessment Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  {risk.sub_category && <p style={{ color: 'var(--muted-fg)' }}>Sub-Category: <strong className="text-slate-200 capitalize">{risk.sub_category}</strong></p>}
                  {risk.owner_dept && <p style={{ color: 'var(--muted-fg)' }}>Department: <strong className="text-slate-200 capitalize">{risk.owner_dept}</strong></p>}
                  {risk.owner_role && <p style={{ color: 'var(--muted-fg)' }}>Job Role: <strong className="text-slate-200 capitalize">{risk.owner_role}</strong></p>}
                  {risk.target_residual_risk && <p style={{ color: 'var(--muted-fg)' }}>Target Risk: <strong className="text-slate-200 uppercase">{risk.target_residual_risk}</strong></p>}
                  {risk.implementation_date && <p style={{ color: 'var(--muted-fg)' }}>Impl. Date: <strong className="text-slate-200">{risk.implementation_date}</strong></p>}
                </div>

                {risk.confidentiality !== undefined && risk.confidentiality > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t grid grid-cols-3 gap-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-center p-1.5 rounded bg-black/20 border border-white/5">
                      <p className="text-[8px] text-slate-400 uppercase">Confidentiality</p>
                      <p className="font-bold text-slate-250 mt-0.5">{risk.confidentiality}/5</p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-black/20 border border-white/5">
                      <p className="text-[8px] text-slate-400 uppercase">Integrity</p>
                      <p className="font-bold text-slate-250 mt-0.5">{risk.integrity}/5</p>
                    </div>
                    <div className="text-center p-1.5 rounded bg-black/20 border border-white/5">
                      <p className="text-[8px] text-slate-400 uppercase">Availability</p>
                      <p className="font-bold text-slate-250 mt-0.5">{risk.availability}/5</p>
                    </div>
                  </div>
                )}

                {risk.operational_impact !== undefined && risk.operational_impact > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p>Operational Impact: <strong className="text-slate-200">{risk.operational_impact}/5</strong></p>
                    <p>Financial Loss Impact: <strong className="text-slate-200">{risk.financial_impact}/5</strong></p>
                    <p>Reputation Damage: <strong className="text-slate-200">{risk.reputation_impact}/5</strong></p>
                    <p>Compliance Impact: <strong className="text-slate-200">{risk.compliance_impact}/5</strong></p>
                  </div>
                )}

                {/* Control Assessment Details */}
                {(risk.control_design_compliance !== undefined || risk.control_effectiveness) && (
                  <div className="mt-3 pt-3 border-t text-[11px] space-y-2.5" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">Control Performance Scores</p>
                    <div className="grid grid-cols-2 gap-3 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <div>
                        <p className="text-[9px] text-slate-350 font-bold uppercase">Control Design: {risk.control_design ? `${risk.control_design}/5` : '—'}</p>
                        <ul className="list-disc list-inside text-[9px] text-slate-500 mt-1 space-y-0.5">
                          <li>Compliance: {risk.control_design_compliance ?? '3'}/5</li>
                          <li>Strength: {risk.control_design_strength ?? '3'}/5</li>
                          <li>Timeliness: {risk.control_design_timeliness ?? '3'}/5</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-355 font-bold uppercase">Control Implementation: {risk.control_implementation ? `${risk.control_implementation}/5` : '—'}</p>
                        <ul className="list-disc list-inside text-[9px] text-slate-500 mt-1 space-y-0.5">
                          <li>Relevance: {risk.control_implementation_relevance ?? '3'}/5</li>
                          <li>Sustainability: {risk.control_implementation_sustainability ?? '3'}/5</li>
                          <li>Traceability: {risk.control_implementation_traceability ?? '3'}/5</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Effectiveness: <strong className="text-sky-400 capitalize">{risk.control_effectiveness ?? '—'}</strong></span>
                      <span>Target Residual: <strong className="text-sky-400 uppercase">{risk.target_residual_risk ?? 'low'}</strong></span>
                    </div>
                  </div>
                )}

                {risk.notes && (
                  <div className="mt-2 pt-2 border-t text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
                    <strong>Audit Notes:</strong> {risk.notes}
                  </div>
                )}
              </div>
            )}

            {/* Mitigation */}
            {risk.mitigation && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-fg)' }}>
                  Mitigation Actions
                </p>
                <div className="p-4 rounded-xl border-l-4 border-sky-500"
                  style={{ background: 'var(--muted)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{risk.mitigation}</p>
                </div>
              </div>
            )}

            {/* AI Summary */}
            <div className="p-4 rounded-xl border"
              style={{ background: 'linear-gradient(135deg, #312e8120, #1e1b4b20)', borderColor: '#6366f130' }}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <p className="text-xs font-semibold text-sky-400">AI Risk Summary</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                This {risk.level} severity {risk.category} risk has a composite score of {score}/25.
                {score >= 16 ? ' Immediate executive attention and remediation is required.' :
                  score >= 9 ? ' This risk requires prompt action within the next 30 days.' :
                  ' This risk should be tracked and reviewed in the next quarterly cycle.'}
                {risk.owner_name ? ` Risk owner ${risk.owner_name} is responsible for driving mitigation.` : ''}
              </p>
            </div>

            {/* Jira Integration Section */}
            {jiraConfig && jiraConfig.connected && (
              <div className="card p-4 space-y-4 border-l-4 border-indigo-600 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-500" />
                    <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider">Jira Sync Engine</p>
                  </div>
                  {risk.jira_issue_key && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono font-bold border border-sky-500/10">
                      {risk.jira_issue_key}
                    </span>
                  )}
                </div>

                {risk.jira_issue_key ? (
                  <div className="space-y-4">
                    {/* Status & Last Sync */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Jira Issue Status</p>
                        <select
                          value={risk.jira_issue_status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            await db.syncJiraIssueStatus(risk.jira_issue_key!, newStatus)
                            const updatedRisks = await db.getRisks()
                            const updatedRisk = updatedRisks.find(r => r.id === risk.id)
                            if (updatedRisk && onUpdate) {
                              onUpdate(updatedRisk)
                              toast.success(`Jira issue status updated to: ${newStatus}`)
                              // Reload activities
                              const acts = await db.getJiraActivities(risk.jira_issue_key!)
                              setActivities(acts)
                            }
                          }}
                          className="mt-1 w-full px-2 py-1.5 rounded bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-slate-800 outline-none font-semibold cursor-pointer text-xs"
                          style={{ color: 'var(--foreground)' }}
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Last Synced</p>
                        <p className="mt-1.5 font-medium text-slate-600 dark:text-slate-300">
                          {risk.jira_last_sync ? formatDistanceToNow(new Date(risk.jira_last_sync), { addSuffix: true }) : 'Never'}
                        </p>
                      </div>
                    </div>

                    {/* Sync details */}
                    <div className="flex items-center justify-between pt-1 border-t border-b py-2" style={{ borderColor: 'var(--border)' }}>
                      <a
                        href={`https://${jiraConfig.instanceUrl}/browse/${risk.jira_issue_key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-sky-500 hover:text-sky-500 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in Jira
                      </a>
                      <button
                        onClick={async () => {
                          setSyncing(true)
                          await new Promise(r => setTimeout(r, 1200))
                          const updated = await db.syncRiskToJira(risk.id)
                          if (onUpdate) onUpdate(updated)
                          setSyncing(false)
                          toast.success('Bidirectional sync completed!')
                        }}
                        disabled={syncing}
                        className="text-[10px] text-sky-500 hover:text-sky-500 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                        Sync Now
                      </button>
                    </div>

                    {/* Jira Comments */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Synced Comments</p>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {comments.map((c) => (
                          <div key={c.id} className="p-2 rounded bg-black/5 dark:bg-white/5 text-[11px] border" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                              <span>{c.author}</span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : 'Just now'}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-normal">{c.content}</p>
                          </div>
                        ))}
                      </div>

                      {/* Add comment */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          if (!newComment.trim()) return
                          setSubmittingComment(true)
                          try {
                            const user = 'Ali Hasanov'
                            const savedComment = await db.addJiraComment(risk.jira_issue_key!, newComment, user)
                            setComments(prev => [...prev, savedComment])
                            setNewComment('')
                            toast.success('Comment synced to Jira ticket.')
                          } catch (err) {
                            toast.error('Failed to post comment')
                          } finally {
                            setSubmittingComment(false)
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Add comment to Jira..."
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !newComment.trim()}
                          className="px-2.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>

                    {/* Jira Activity Logs */}
                    <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Sync Audit Trail</p>
                      <div className="space-y-1.5">
                        {activities.slice(0, 3).map((act) => (
                          <div key={act.id} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>
                              <strong>{act.actor}</strong> {act.action} • {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-center py-2">
                    <p className="text-xs text-slate-500 font-medium">This risk is not yet tracked in Jira.</p>
                    <button
                      onClick={async () => {
                        setSyncing(true)
                        await new Promise(r => setTimeout(r, 1200))
                        const updated = await db.syncRiskToJira(risk.id)
                        if (onUpdate) onUpdate(updated)
                        setSyncing(false)
                        toast.success(`Ticket ${updated.jira_issue_key} successfully created in Jira!`)
                      }}
                      disabled={syncing}
                      className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer mx-auto transition-colors disabled:opacity-50"
                    >
                      <Database className="w-3.5 h-3.5" />
                      Create Jira Ticket
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
            <button className="flex-1 py-2 rounded-xl text-sm font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Edit Risk
            </button>
            <button className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-colors cursor-pointer">
              Mark Mitigated
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}


