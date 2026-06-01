'use client'

import { useState, useEffect } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { db } from '@/lib/db'
import type { Risk, Control, GRCIntakeItem, GRCIntakeStep, GRCIntakeType } from '@/types'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch,
  Play,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Shield,
  Layers,
  FileText,
  Plus,
  Sliders,
  Check,
  TrendingUp,
  AlertTriangle,
  FolderMinus,
  Sparkles,
  Info,
  Activity,
  HeartHandshake
} from 'lucide-react'
import {
  calculateInherentLevel,
  evaluateControlEffectiveness,
  calculateResidualLevel,
  getAllowedTreatmentStrategies,
  calculateRiskGap,
  getRiskLevelNumber,
  type ControlRating,
  type TreatmentStrategy
} from '@/lib/rcsa'

interface StepInfo {
  id: string
  label: string
  desc: string
  phase: 'init' | 'assess' | 'review' | 'mitigate' | 'resolve'
}

const RISK_STEPS: StepInfo[] = [
  { id: 'identified', label: 'Risk Identified', desc: 'A new risk has been identified and is awaiting registration.', phase: 'init' },
  { id: 'registered', label: 'Registration', desc: 'The risk details, owner, department, and category are documented.', phase: 'init' },
  { id: 'assessed_inherent', label: 'Inherent Assessment', desc: 'Inherent Likelihood and CIA/Impact domains are evaluated to calculate inherent risk.', phase: 'assess' },
  { id: 'control_mapped', label: 'Control Mapping', desc: 'Applicable compliance controls from frameworks are mapped to mitigate the risk.', phase: 'assess' },
  { id: 'control_assessed', label: 'Control Effectiveness', desc: 'The Design and Implementation ratings of mapped controls are assessed.', phase: 'assess' },
  { id: 'assessed_residual', label: 'Residual Assessment', desc: 'Residual risk rating is computed based on Inherent Level × Control Effectiveness.', phase: 'assess' },
  { id: 'owner_review', label: 'Risk Owner Review', desc: 'Risk owner reviews the assessment results and proposed controls.', phase: 'review' },
  { id: 'mgt_review', label: '2nd Line Review', desc: 'Risk management function (2nd Line) approves the assessment and triggers appetite check.', phase: 'review' },
  { id: 'treatment_plan', label: 'Treatment Required', desc: 'Treatment strategy is required because residual risk exceeds appetite.', phase: 'mitigate' },
  { id: 'action_plan', label: 'Action Plan Creation', desc: 'A step-by-step action plan is created with milestones and owners.', phase: 'mitigate' },
  { id: 'implementation', label: 'Implementation', desc: 'Mitigation measures are implemented and checked off.', phase: 'mitigate' },
  { id: 'validation', label: 'Validation', desc: 'Implementation evidence is uploaded and validated by audit team.', phase: 'mitigate' },
  { id: 'residual_reassessment', label: 'Residual Reassessment', desc: 'Residual risk level is reassessed after mitigation steps.', phase: 'mitigate' },
  { id: 'accepted', label: 'Accept & Monitor', desc: 'Risk is within appetite, accepted, and routed for periodic monitoring.', phase: 'resolve' },
  { id: 'escalated', label: 'Escalation', desc: 'Residual risk remains above appetite. Escalated to Risk Committee or Board.', phase: 'resolve' },
  { id: 'closed', label: 'Closed', desc: 'The risk is fully resolved or closed.', phase: 'resolve' }
]

const GRC_INTAKE_STEPS = [
  { id: 'registration', label: 'Registration' },
  { id: 'classification', label: 'Classification' },
  { id: 'control_mapping', label: 'Control Mapping' },
  { id: 'evidence_collection', label: 'Evidence Collection' },
  { id: 'compliance_assessment', label: 'Compliance Assessment' },
  { id: 'gap_assessment', label: 'Gap Assessment' },
  { id: 'compliant_closed', label: 'Compliant & Closed' },
  { id: 'non_compliance', label: 'Non Compliance' },
  { id: 'risk_routing', label: 'Route to Registry' },
  { id: 'action_plan', label: 'Action Plan & Close' }
]

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'risk' | 'intake'>('risk')
  const [risks, setRisks] = useState<Risk[]>([])
  const [selectedRiskId, setSelectedRiskId] = useState<string>('')
  const [controls, setControls] = useState<Control[]>([])
  const [intakeItems, setIntakeItems] = useState<GRCIntakeItem[]>([])
  const [selectedIntakeId, setSelectedIntakeId] = useState<string>('')

  // Selected entities for interaction
  const selectedRisk = risks.find(r => r.id === selectedRiskId)
  const selectedIntake = intakeItems.find(i => i.id === selectedIntakeId)

  // Form states for Risk Workflow
  const [inhLikelihood, setInhLikelihood] = useState<number>(3)
  const [inhImpact, setInhImpact] = useState<number>(3)
  const [mappedControlIds, setMappedControlIds] = useState<string[]>([])
  
  // Excel policy sliders
  const [designCompliance, setDesignCompliance] = useState<number>(3)
  const [designStrength, setDesignStrength] = useState<number>(3)
  const [designTimeliness, setDesignTimeliness] = useState<number>(3)
  const [implRelevance, setImplRelevance] = useState<number>(3)
  const [implSustainability, setImplSustainability] = useState<number>(3)
  const [implTraceability, setImplTraceability] = useState<number>(3)
  
  const [treatmentPlan, setTreatmentPlan] = useState<string>('')
  const [selectedStrategy, setSelectedStrategy] = useState<TreatmentStrategy>('mitigate')
  const [actionPlan, setActionPlan] = useState<string>('')
  const [validationEvidence, setValidationEvidence] = useState<string>('')
  const [resLikelihood, setResLikelihood] = useState<number>(2)
  const [resImpact, setResImpact] = useState<number>(2)
  const [escalationAction, setEscalationAction] = useState<'mitigate' | 'accept' | 'transfer' | 'avoid'>('mitigate')
  const [targetRisk, setTargetRisk] = useState<'low' | 'medium' | 'high' | 'critical'>('low')

  // Form states for Intake Creation
  const [showCreateIntake, setShowCreateIntake] = useState(false)
  const [intakeTitle, setIntakeTitle] = useState('')
  const [intakeDesc, setIntakeDesc] = useState('')
  const [intakeType, setIntakeType] = useState<GRCIntakeType>('finding')
  const [intakeClass, setIntakeClass] = useState('cybersecurity')

  // Intake wizard progress forms
  const [intakeControlIds, setIntakeControlIds] = useState<string[]>([])
  const [intakeEvidenceUrl, setIntakeEvidenceUrl] = useState('')
  const [intakeEvidenceNote, setIntakeEvidenceNote] = useState('')
  const [intakeIsCompliant, setIntakeIsCompliant] = useState<boolean>(true)
  const [intakeGapRiskRequired, setIntakeGapRiskRequired] = useState<boolean>(true)
  const [intakeIssuePlan, setIntakeIssuePlan] = useState('')

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      const allRisks = await db.getRisks()
      setRisks(allRisks)
      if (allRisks.length > 0 && !selectedRiskId) {
        setSelectedRiskId(allRisks[0].id)
      }

      const allControls = await db.getControls()
      setControls(allControls)

      const intakes = await db.getGRCIntakeItems()
      setIntakeItems(intakes)
      if (intakes.length > 0 && !selectedIntakeId) {
        setSelectedIntakeId(intakes[0].id)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (selectedRisk) {
      setInhLikelihood(selectedRisk.inherent_likelihood || selectedRisk.likelihood || 3)
      setInhImpact(selectedRisk.inherent_impact || selectedRisk.impact || 3)
      setMappedControlIds(selectedRisk.control_mapped_ids || [])
      setDesignCompliance(selectedRisk.control_design_compliance || 3)
      setDesignStrength(selectedRisk.control_design_strength || 3)
      setDesignTimeliness(selectedRisk.control_design_timeliness || 3)
      setImplRelevance(selectedRisk.control_implementation_relevance || 3)
      setImplSustainability(selectedRisk.control_implementation_sustainability || 3)
      setImplTraceability(selectedRisk.control_implementation_traceability || 3)
      setTreatmentPlan(selectedRisk.treatment_plan || '')
      setSelectedStrategy((selectedRisk.mitigation as any) || 'mitigate')
      setActionPlan(selectedRisk.action_plan || '')
      setValidationEvidence(selectedRisk.validation_evidence || '')
      setResLikelihood(selectedRisk.residual_likelihood || 2)
      setResImpact(selectedRisk.residual_impact || 2)
      setTargetRisk((selectedRisk.target_residual_risk as any) || 'low')
    }
  }, [selectedRiskId, risks])

  // Save risk to DB & Local State
  const updateRiskWorkflow = async (updatedFields: Partial<Risk>) => {
    if (!selectedRisk) return
    const updatedRisk = {
      ...selectedRisk,
      ...updatedFields,
      updated_at: new Date().toISOString()
    }
    const saved = await db.saveRisk(updatedRisk)
    setRisks(prev => prev.map(r => r.id === saved.id ? saved : r))
    toast.success(`Workflow progressed to: ${RISK_STEPS.find(s => s.id === saved.workflow_step)?.label}`)
  }

  // Handle step transitions for Risk Workflow
  const handleProgressRisk = async (nextStep: string) => {
    if (!selectedRisk) return

    const updates: Partial<Risk> = { workflow_step: nextStep }

    // Enforce business rules at specific steps
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
      const inherentLvl = calculateInherentLevel(selectedRisk.inherent_likelihood || selectedRisk.likelihood || 3, selectedRisk.inherent_impact || selectedRisk.impact || 3)
      const controlRating = selectedRisk.control_effectiveness || 'adequate'
      const residualLvl = calculateResidualLevel(inherentLvl, controlRating as any)
      updates.level = residualLvl
      updates.status = 'in_progress'
    } else if (nextStep === 'appetite_check') {
      const inherentLvl = calculateInherentLevel(selectedRisk.inherent_likelihood || selectedRisk.likelihood || 3, selectedRisk.inherent_impact || selectedRisk.impact || 3)
      const controlRating = selectedRisk.control_effectiveness || 'adequate'
      const residualLvl = calculateResidualLevel(inherentLvl, controlRating as any)
      updates.target_residual_risk = targetRisk
      
      // Compare residual level with target appetite level
      if (getRiskLevelNumber(residualLvl) <= getRiskLevelNumber(targetRisk)) {
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
      // completed actions
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

    await updateRiskWorkflow(updates)
  }

  // Handle GRC Intake Creation
  const handleCreateIntake = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intakeTitle.trim()) return

    const newItem: GRCIntakeItem = {
      id: 'itk-' + Math.random().toString(36).substr(2, 9),
      org_id: 'org1',
      type: intakeType,
      title: intakeTitle,
      description: intakeDesc,
      classification: intakeClass,
      mapped_control_ids: [],
      status: 'draft',
      step: 'registration',
      created_at: new Date().toISOString()
    }

    const saved = await db.saveGRCIntakeItem(newItem)
    setIntakeItems(prev => [saved, ...prev])
    setSelectedIntakeId(saved.id)
    setShowCreateIntake(false)
    setIntakeTitle('')
    setIntakeDesc('')
    toast.success('New GRC Intake registered!')
  }

  // Handle Intake Progress Step
  const handleProgressIntake = async (nextStep: GRCIntakeStep) => {
    if (!selectedIntake) return

    const updates: Partial<GRCIntakeItem> = { step: nextStep }

    if (nextStep === 'classification') {
      updates.status = 'under_review'
    } else if (nextStep === 'control_mapping') {
      updates.mapped_control_ids = intakeControlIds
    } else if (nextStep === 'evidence_collection') {
      updates.evidence_url = intakeEvidenceUrl
      updates.evidence_note = intakeEvidenceNote
    } else if (nextStep === 'compliance_assessment') {
      // triggers compliance
    } else if (nextStep === 'gap_assessment') {
      updates.gap_identified = !intakeIsCompliant
      if (intakeIsCompliant) {
        updates.step = 'compliant_closed'
        updates.status = 'compliant'
      }
    } else if (nextStep === 'non_compliance') {
      updates.risk_creation_required = intakeGapRiskRequired
      updates.status = 'non_compliant'
      if (intakeGapRiskRequired) {
        updates.step = 'risk_routing'
      } else {
        updates.step = 'action_plan'
      }
    } else if (nextStep === 'compliant_closed') {
      updates.status = 'closed'
    } else if (nextStep === 'risk_routing') {
      // Create new Risk and link
      const newRisk: Risk = {
        id: `r-${Date.now()}`,
        org_id: 'org1',
        title: `Non-Compliance Risk: ${selectedIntake.title}`,
        description: `Risk created automatically from GRC Intake GAP detection. Source description: ${selectedIntake.description}`,
        category: selectedIntake.classification as any,
        level: 'medium',
        status: 'open',
        likelihood: 3,
        impact: 3,
        workflow_step: 'identified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const savedRisk = await db.saveRisk(newRisk)
      setRisks(prev => [savedRisk, ...prev])
      setSelectedRiskId(savedRisk.id)

      updates.risk_created_id = savedRisk.id
      updates.status = 'closed'
      updates.step = 'compliant_closed'
      toast.success('Automatic risk created and routed to Registry workflow!')
    } else if (nextStep === 'action_plan') {
      updates.evidence_note = intakeIssuePlan
      updates.status = 'closed'
      updates.step = 'compliant_closed'
    }

    const saved = await db.saveGRCIntakeItem({ ...selectedIntake, ...updates })
    setIntakeItems(prev => prev.map(i => i.id === saved.id ? saved : i))
    toast.success(`GRC compliance progressed: ${saved.step}`)
  }

  // Check step indices for path styling
  const getStepIndex = (stepId: string) => {
    return RISK_STEPS.findIndex(s => s.id === stepId)
  }

  const isStepCompleted = (stepId: string) => {
    if (!selectedRisk) return false
    const currentIdx = getStepIndex(selectedRisk.workflow_step || 'identified')
    const targetIdx = getStepIndex(stepId)
    return targetIdx < currentIdx
  }

  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)' }} className="min-h-screen flex flex-col">
      <TopNav title="GRC Workflows Panel" subtitle="Visual interactive lifecycle tracking and automated calculations" />
      
      <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Navigation Mode Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('risk')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'risk'
                ? 'border-indigo-500 text-indigo-500 bg-indigo-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" /> Risk Registry Workflow (15 Steps)
          </button>
          <button
            onClick={() => setActiveTab('intake')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'intake'
                ? 'border-indigo-500 text-indigo-500 bg-indigo-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> Unified GRC Compliance Pipeline (7 Steps)
          </button>
        </div>

        {/* TAB 1: RISK REGISTRY WORKFLOW */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            {/* Top selection bar */}
            <div className="card p-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase">Selected Registry Risk</h3>
                <p className="text-sm font-black text-white mt-1">{selectedRisk ? selectedRisk.title : 'No risks loaded'}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 font-semibold">Select Risk:</label>
                <select
                  value={selectedRiskId}
                  onChange={(e) => setSelectedRiskId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-black/20 dark:bg-white/5 border border-white/10 text-xs font-semibold outline-none text-white cursor-pointer"
                >
                  {risks.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-900">
                      {r.title.length > 35 ? r.title.substring(0, 35) + '...' : r.title} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Layout: Visual Flowchart Canvas + Side Interactive Form */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* FLOWCHART VIEWPORT */}
              <div className="xl:col-span-2 card p-6 flex flex-col space-y-4 overflow-hidden">
                <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Visual Workflow Diagram</h3>
                    <p className="text-xs text-slate-400 mt-1">Interactive nodes showing branches, appetite gates, and decisions.</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 uppercase">
                    Interactive Map
                  </span>
                </div>

                {/* SCROLLABLE DIAGRAM CONTAINER */}
                <div className="relative border rounded-2xl p-6 bg-slate-950/80 overflow-x-auto min-h-[570px] select-none" style={{ borderColor: 'var(--border)' }}>
                  
                  {/* SVG Line Connections */}
                  <svg className="absolute inset-0 w-[950px] h-[550px] pointer-events-none z-0">
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#334155" />
                      </marker>
                      <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#6366f1" />
                      </marker>
                    </defs>

                    {/* PATHS DRAWING */}
                    {/* identified -> registered */}
                    <path d="M 90 125 L 90 180" stroke={isStepCompleted('registered') || selectedRisk?.workflow_step === 'registered' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('registered') || selectedRisk?.workflow_step === 'registered' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* registered -> assessed_inherent */}
                    <path d="M 150 202.5 L 175 202.5 L 175 102.5 L 200 102.5" stroke={isStepCompleted('assessed_inherent') || selectedRisk?.workflow_step === 'assessed_inherent' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('assessed_inherent') || selectedRisk?.workflow_step === 'assessed_inherent' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* assessed_inherent -> control_mapped */}
                    <path d="M 260 125 L 260 170" stroke={isStepCompleted('control_mapped') || selectedRisk?.workflow_step === 'control_mapped' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('control_mapped') || selectedRisk?.workflow_step === 'control_mapped' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* control_mapped -> control_assessed */}
                    <path d="M 260 215 L 260 260" stroke={isStepCompleted('control_assessed') || selectedRisk?.workflow_step === 'control_assessed' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('control_assessed') || selectedRisk?.workflow_step === 'control_assessed' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* control_assessed -> assessed_residual */}
                    <path d="M 260 305 L 260 350" stroke={isStepCompleted('assessed_residual') || selectedRisk?.workflow_step === 'assessed_residual' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('assessed_residual') || selectedRisk?.workflow_step === 'assessed_residual' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* assessed_residual -> owner_review */}
                    <path d="M 320 372.5 L 345 372.5 L 345 102.5 L 370 102.5" stroke={isStepCompleted('owner_review') || selectedRisk?.workflow_step === 'owner_review' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('owner_review') || selectedRisk?.workflow_step === 'owner_review' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* owner_review -> mgt_review */}
                    <path d="M 430 125 L 430 170" stroke={isStepCompleted('mgt_review') || selectedRisk?.workflow_step === 'mgt_review' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('mgt_review') || selectedRisk?.workflow_step === 'mgt_review' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* mgt_review -> Appetite Gate (Decision) */}
                    <path d="M 430 215 L 430 250" stroke={isStepCompleted('appetite_check') || selectedRisk?.workflow_step === 'treatment_plan' || selectedRisk?.workflow_step === 'accepted' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('appetite_check') || selectedRisk?.workflow_step === 'treatment_plan' || selectedRisk?.workflow_step === 'accepted' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* Appetite Check -> accepted (Yes) */}
                    <path d="M 430 320 L 430 395 L 670 395 L 670 192.5 L 700 192.5" stroke={selectedRisk?.workflow_step === 'accepted' && selectedRisk?.status === 'accepted' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={selectedRisk?.workflow_step === 'accepted' && selectedRisk?.status === 'accepted' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* Appetite Check -> treatment_plan (No) */}
                    <path d="M 465 285 L 502.5 285 L 502.5 102.5 L 540 102.5" stroke={isStepCompleted('treatment_plan') || selectedRisk?.workflow_step === 'treatment_plan' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('treatment_plan') || selectedRisk?.workflow_step === 'treatment_plan' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* treatment_plan -> action_plan */}
                    <path d="M 600 125 L 600 170" stroke={isStepCompleted('action_plan') || selectedRisk?.workflow_step === 'action_plan' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('action_plan') || selectedRisk?.workflow_step === 'action_plan' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* action_plan -> implementation */}
                    <path d="M 600 215 L 600 260" stroke={isStepCompleted('implementation') || selectedRisk?.workflow_step === 'implementation' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('implementation') || selectedRisk?.workflow_step === 'implementation' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* implementation -> validation */}
                    <path d="M 600 305 L 600 350" stroke={isStepCompleted('validation') || selectedRisk?.workflow_step === 'validation' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('validation') || selectedRisk?.workflow_step === 'validation' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* validation -> residual_reassessment */}
                    <path d="M 600 395 L 600 440" stroke={isStepCompleted('residual_reassessment') || selectedRisk?.workflow_step === 'residual_reassessment' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('residual_reassessment') || selectedRisk?.workflow_step === 'residual_reassessment' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* residual_reassessment -> Reassessment Check */}
                    <path d="M 600 485 L 600 510" stroke={isStepCompleted('verify_reassessment') || selectedRisk?.workflow_step === 'verify_reassessment' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('verify_reassessment') || selectedRisk?.workflow_step === 'verify_reassessment' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* Reassessment Check -> accepted (Yes) */}
                    <path d="M 635 545 L 685 545 L 685 192.5 L 700 192.5" stroke={selectedRisk?.workflow_step === 'accepted' && selectedRisk?.status === 'mitigated' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={selectedRisk?.workflow_step === 'accepted' && selectedRisk?.status === 'mitigated' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* Reassessment Check -> escalated (No) */}
                    <path d="M 635 545 L 685 545 L 685 302.5 L 700 302.5" stroke={isStepCompleted('escalated') || selectedRisk?.workflow_step === 'escalated' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={isStepCompleted('escalated') || selectedRisk?.workflow_step === 'escalated' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* accepted -> closed */}
                    <path d="M 760 170 L 760 125" stroke={selectedRisk?.workflow_step === 'closed' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={selectedRisk?.workflow_step === 'closed' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                    
                    {/* escalated -> closed */}
                    <path d="M 820 302.5 L 850 302.5 L 850 102.5 L 820 102.5" stroke={selectedRisk?.workflow_step === 'closed' && selectedRisk?.escalation_level !== 'none' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={selectedRisk?.workflow_step === 'closed' && selectedRisk?.escalation_level !== 'none' ? 'url(#arrow-active)' : 'url(#arrow)'} />

                    {/* Decision Branch Labels */}
                    <text x="440" y="340" fill="#22c55e" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Yes (Within Appetite)</text>
                    <text x="470" y="278" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="sans-serif">No (Exceeds Appetite)</text>
                    <text x="645" y="535" fill="#22c55e" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Yes</text>
                    <text x="645" y="475" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="sans-serif">No (Escalate)</text>

                  </svg>

                  {/* VISUAL NODES (positioned absolutely) */}
                  <div className="absolute inset-0 pointer-events-none z-10 w-[950px] h-[550px] font-sans">
                    
                    {/* Phase Headers */}
                    <span className="absolute left-[30px] top-[40px] text-[9px] font-bold text-slate-500 uppercase tracking-widest">Phase 1: Intake</span>
                    <span className="absolute left-[200px] top-[40px] text-[9px] font-bold text-slate-500 uppercase tracking-widest">Phase 2: Assess</span>
                    <span className="absolute left-[370px] top-[40px] text-[9px] font-bold text-slate-500 uppercase tracking-widest">Phase 3: Approval</span>
                    <span className="absolute left-[540px] top-[40px] text-[9px] font-bold text-slate-500 uppercase tracking-widest">Phase 4: Mitigate</span>
                    <span className="absolute left-[700px] top-[40px] text-[9px] font-bold text-slate-500 uppercase tracking-widest">Phase 5: Resolve</span>

                    {/* Nodes */}
                    {[
                      { id: 'identified', label: '1. Risk Identified', x: 30, y: 80, shape: 'rect' },
                      { id: 'registered', label: '2. Registration', x: 30, y: 180, shape: 'rect' },
                      
                      { id: 'assessed_inherent', label: '3. Inherent Assessment', x: 200, y: 80, shape: 'rect' },
                      { id: 'control_mapped', label: '4. Control Mapping', x: 200, y: 170, shape: 'rect' },
                      { id: 'control_assessed', label: '5. Control Evaluation', x: 200, y: 260, shape: 'rect' },
                      { id: 'assessed_residual', label: '6. Residual Rating', x: 200, y: 350, shape: 'rect' },
                      
                      { id: 'owner_review', label: '7. Owner Review', x: 370, y: 80, shape: 'rect' },
                      { id: 'mgt_review', label: '8. 2nd Line Review', x: 370, y: 170, shape: 'rect' },
                      { id: 'appetite_decision', label: 'Residual within Appetite?', x: 395, y: 250, shape: 'diamond' },
                      
                      { id: 'treatment_plan', label: '9. Treatment Strategy', x: 540, y: 80, shape: 'rect' },
                      { id: 'action_plan', label: '10. Action Plan Details', x: 540, y: 170, shape: 'rect' },
                      { id: 'implementation', label: '11. Implementation', x: 540, y: 260, shape: 'rect' },
                      { id: 'validation', label: '12. Evidence Validation', x: 540, y: 350, shape: 'rect' },
                      { id: 'residual_reassessment', label: '13. Reassessment', x: 540, y: 440, shape: 'rect' },
                      { id: 'reassessment_decision', label: 'Within Appetite?', x: 565, y: 510, shape: 'diamond' },

                      { id: 'accepted', label: 'Accept & Monitor', x: 700, y: 170, shape: 'rect' },
                      { id: 'escalated', label: '14. Board Escalation', x: 700, y: 280, shape: 'rect' },
                      { id: 'closed', label: '15. Closed File', x: 700, y: 80, shape: 'rect' },
                    ].map(node => {
                      const active = selectedRisk?.workflow_step === node.id || 
                                     (node.id === 'appetite_decision' && selectedRisk?.workflow_step === 'owner_review') ||
                                     (node.id === 'reassessment_decision' && selectedRisk?.workflow_step === 'residual_reassessment')

                      const completed = isStepCompleted(node.id)

                      if (node.shape === 'diamond') {
                        return (
                          <button
                            key={node.id}
                            onClick={() => {
                              if (selectedRisk) {
                                if (node.id === 'appetite_decision') {
                                  updateRiskWorkflow({ workflow_step: 'mgt_review' })
                                } else if (node.id === 'reassessment_decision') {
                                  updateRiskWorkflow({ workflow_step: 'residual_reassessment' })
                                }
                              }
                            }}
                            style={{ left: `${node.x}px`, top: `${node.y}px`, width: '70px', height: '70px' }}
                            className="absolute pointer-events-auto flex items-center justify-center text-center cursor-pointer bg-transparent border-0 outline-none"
                            title={node.label}
                          >
                            <div className={`w-[48px] h-[48px] rotate-45 border flex items-center justify-center transition-all ${
                              active ? 'bg-indigo-600/30 border-indigo-500 shadow-lg shadow-indigo-600/20' : 
                              completed ? 'bg-slate-900 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-white/10 text-slate-500'
                            }`}>
                              <HelpCircle className="w-4 h-4 -rotate-45" />
                            </div>
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-28 text-[8px] font-bold text-center text-slate-400 uppercase tracking-tight">{node.label}</span>
                          </button>
                        )
                      }

                      return (
                        <button
                          key={node.id}
                          onClick={() => {
                            if (selectedRisk) {
                              updateRiskWorkflow({ workflow_step: node.id })
                            }
                          }}
                          style={{ left: `${node.x}px`, top: `${node.y}px`, width: '120px', height: '45px' }}
                          className={`absolute pointer-events-auto rounded-xl border p-2 text-left flex flex-col justify-center transition-all cursor-pointer ${
                            active
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xl shadow-indigo-600/10 ring-2 ring-indigo-500/20 font-bold'
                              : completed
                              ? 'bg-slate-900/60 border-indigo-500/30 text-indigo-400 hover:border-indigo-400'
                              : 'bg-slate-900/20 border-white/5 text-slate-500 hover:border-white/10'
                          }`}
                        >
                          <span className="text-[9px] truncate w-full flex items-center gap-1">
                            {active && <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0 animate-pulse" />}
                            {node.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Flow description */}
                {selectedRisk && (
                  <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs flex gap-3 items-start">
                    <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="font-bold text-slate-200">Current Step: {RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.label}</p>
                      <p className="text-slate-400 mt-0.5">{RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.desc}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* INTERACTIVE ACTIONS PANEL */}
              <div className="card p-6 flex flex-col justify-between min-h-[500px]">
                {selectedRisk ? (
                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 uppercase tracking-widest">Active Step Panel</span>
                      <h4 className="text-base font-bold text-white mt-2">
                        {RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.label}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">Configure parameters and progress to checkout this step.</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      
                      {/* Step: identified */}
                      {selectedRisk.workflow_step === 'identified' && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-300">New risk identified. Progress to registration stage.</p>
                          <button
                            onClick={() => handleProgressRisk('registered')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-indigo-600/20"
                          >
                            <Play className="w-3.5 h-3.5" /> Start Registration
                          </button>
                        </div>
                      )}

                      {/* Step: registered */}
                      {selectedRisk.workflow_step === 'registered' && (
                        <div className="space-y-3">
                          <div className="text-xs space-y-1.5 p-3 rounded-lg bg-black/10 border border-white/5 text-slate-400">
                            <p><strong>Title:</strong> {selectedRisk.title}</p>
                            <p><strong>Category:</strong> {selectedRisk.category}</p>
                            <p><strong>Sub-Category:</strong> {selectedRisk.sub_category || '—'}</p>
                            <p><strong>Department:</strong> {selectedRisk.owner_dept || '—'}</p>
                            <p><strong>Job Role:</strong> {selectedRisk.owner_role || '—'}</p>
                          </div>
                          <button
                            onClick={() => handleProgressRisk('assessed_inherent')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg"
                          >
                            Go to Inherent Assessment
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Step: assessed_inherent */}
                      {selectedRisk.workflow_step === 'assessed_inherent' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 flex justify-between">
                              <span>Likelihood/Probability: {inhLikelihood}</span>
                            </label>
                            <input
                              type="range" min="1" max="5" value={inhLikelihood}
                              onChange={(e) => setInhLikelihood(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 flex justify-between">
                              <span>Impact/Severity: {inhImpact}</span>
                            </label>
                            <input
                              type="range" min="1" max="5" value={inhImpact}
                              onChange={(e) => setInhImpact(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>

                          <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-slate-400">Natural Inherent Score:</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Calculated Rating Level</p>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-base text-rose-400">{inhLikelihood * inhImpact} / 25</span>
                              <p className="text-xs font-black uppercase text-rose-500 mt-0.5">{calculateInherentLevel(inhLikelihood, inhImpact)}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleProgressRisk('control_mapped')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg"
                          >
                            Confirm & Map Controls
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Step: control_mapped */}
                      {selectedRisk.workflow_step === 'control_mapped' && (
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-400">Select Framework Controls</label>
                          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 select-none">
                            {controls.map(c => {
                              const checked = mappedControlIds.includes(c.id)
                              return (
                                <label key={c.id} className="flex items-center gap-2 p-2 rounded bg-black/10 text-xs cursor-pointer border border-white/5 hover:border-white/10">
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
                                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 bg-transparent"
                                  />
                                  <span className="text-[10px] font-bold text-indigo-400 font-mono shrink-0">{c.control_id}</span>
                                  <span className="text-slate-300 truncate">{c.title}</span>
                                </label>
                              )
                            })}
                          </div>
                          <button
                            onClick={() => handleProgressRisk('control_assessed')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg"
                          >
                            Assess Control Effectiveness
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Step: control_assessed */}
                      {selectedRisk.workflow_step === 'control_assessed' && (
                        <div className="space-y-5">
                          <p className="text-xs font-semibold text-slate-300">Rate control effectiveness on the 6 policy sub-criteria (1 = Best/Strong, 5 = Worst/Weak):</p>
                          
                          {/* Design section */}
                          <div className="space-y-3.5 border-l-2 border-indigo-500/20 pl-3">
                            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Control Design</span>
                            
                            {/* Compliance */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                                <span>1. Compliance & Scope Coverage:</span>
                                <span className="font-bold text-slate-300">{designCompliance}/5</span>
                              </label>
                              <input
                                type="range" min="1" max="5" value={designCompliance}
                                onChange={(e) => setDesignCompliance(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-[10px] text-slate-500 leading-snug">
                                {designCompliance === 1 && "Critical risks fully covered; design proportional to risk; standards met. Preventive/immediate."}
                                {designCompliance === 2 && "Risk-based approach, ~90% coverage. Minimal gaps. Mostly timely."}
                                {designCompliance === 3 && "Covers 50-89% of risks, but some design gaps exist. Notable latency."}
                                {designCompliance === 4 && "Covers only 25-49% of risks; design does not cover map. Execution is reactive/unstable."}
                                {designCompliance === 5 && "Covers 0-24% of risks; critical design gaps. Control not timely/applied."}
                              </p>
                            </div>

                            {/* Strength */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                                <span>2. Control Strength & Methodology:</span>
                                <span className="font-bold text-slate-300">{designStrength}/5</span>
                              </label>
                              <input
                                type="range" min="1" max="5" value={designStrength}
                                onChange={(e) => setDesignStrength(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-[10px] text-slate-500 leading-snug">
                                {designStrength === 1 && "Control design meets testing standards & best practices."}
                                {designStrength === 2 && "Adequate in most aspects, minimal improvement needed (up to 90% standards addressed)."}
                                {designStrength === 3 && "Inadequate in some areas, moderate improvement needed (up to 70% standards addressed)."}
                                {designStrength === 4 && "Inadequate in several aspects, significant improvement needed (up to 50% standards addressed)."}
                                {designStrength === 5 && "Inadequate in multiple aspects; urgent expansion required."}
                              </p>
                            </div>

                            {/* Timeliness */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                                <span>3. Timeliness of Execution:</span>
                                <span className="font-bold text-slate-300">{designTimeliness}/5</span>
                              </label>
                              <input
                                type="range" min="1" max="5" value={designTimeliness}
                                onChange={(e) => setDesignTimeliness(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-[10px] text-slate-500 leading-snug">
                                {designTimeliness === 1 && "Executed in real-time or immediately. No delay. Preventive."}
                                {designTimeliness === 2 && "Preventive, executed on time, minor delays (<10% volume)."}
                                {designTimeliness === 3 && "Mostly on time, but delays observed (11-49% volume). Detective/preventive."}
                                {designTimeliness === 4 && "Frequent delays (50-90% delay). Detective/directive."}
                                {designTimeliness === 5 && "Not executed on time (91-100% delay) or not applied at all."}
                              </p>
                            </div>
                          </div>

                          {/* Implementation section */}
                          <div className="space-y-3.5 border-l-2 border-emerald-500/20 pl-3">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Control Implementation</span>
                            
                            {/* Relevance */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                                <span>1. Relevance & Alignment:</span>
                                <span className="font-bold text-slate-300">{implRelevance}/5</span>
                              </label>
                              <input
                                type="range" min="1" max="5" value={implRelevance}
                                onChange={(e) => setImplRelevance(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-[10px] text-slate-500 leading-snug">
                                {implRelevance === 1 && "Fully relevant (91-100% aligned with risk/business changes)."}
                                {implRelevance === 2 && "Highly relevant (~90% aligned), meets business requirements."}
                                {implRelevance === 3 && "Covers key risks (50-89%), moderately aligned. Control has not changed with processes."}
                                {implRelevance === 4 && "Partially relevant (25-49%), meets only some business needs."}
                                {implRelevance === 5 && "Outdated (0-24%), irrelevant/non-functional."}
                              </p>
                            </div>

                            {/* Sustainability */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                                <span>2. Sustainability & Frequency:</span>
                                <span className="font-bold text-slate-300">{implSustainability}/5</span>
                              </label>
                              <input
                                type="range" min="1" max="5" value={implSustainability}
                                onChange={(e) => setImplSustainability(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-[10px] text-slate-500 leading-snug">
                                {implSustainability === 1 && "Fully automated and applied continuously."}
                                {implSustainability === 2 && "Almost continuously applied, stable."}
                                {implSustainability === 3 && "Applied regularly, but with some interruptions."}
                                {implSustainability === 4 && "Applied occasionally, unsystematic."}
                                {implSustainability === 5 && "Not applied or very rare."}
                              </p>
                            </div>

                            {/* Traceability */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                                <span>3. Traceability & Evidence Audit:</span>
                                <span className="font-bold text-slate-300">{implTraceability}/5</span>
                              </label>
                              <input
                                type="range" min="1" max="5" value={implTraceability}
                                onChange={(e) => setImplTraceability(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-[10px] text-slate-500 leading-snug">
                                {implTraceability === 1 && "Real-time monitoring, full audit trail, complete execution evidence."}
                                {implTraceability === 2 && "Systematic tracking and audit trail exist."}
                                {implTraceability === 3 && "Partially documented tracking and evidence."}
                                {implTraceability === 4 && "Only manual and incomplete tracking."}
                                {implTraceability === 5 && "No monitoring, tracking, or documentation."}
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-slate-400">Effectiveness Rating:</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">Average Score: {(((designCompliance + designStrength + designTimeliness)/3 + (implRelevance + implSustainability + implTraceability)/3)/2).toFixed(2)}</p>
                            </div>
                            <span className="font-black text-indigo-400 capitalize">
                              {evaluateControlEffectiveness(designCompliance, designStrength, designTimeliness, implRelevance, implSustainability, implTraceability).label}
                            </span>
                          </div>

                          <button
                            onClick={() => handleProgressRisk('assessed_residual')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg"
                          >
                            Calculate Residual Level
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Step: assessed_residual */}
                      {selectedRisk.workflow_step === 'assessed_residual' && (
                        <div className="space-y-4">
                          <div className="text-xs space-y-1.5 p-3 rounded-lg bg-black/10 border border-white/5 text-slate-400">
                            <p>Inherent Risk Level: <strong className="text-rose-400 capitalize">{calculateInherentLevel(selectedRisk.inherent_likelihood || 3, selectedRisk.inherent_impact || 3)}</strong></p>
                            <p>Control Effectiveness: <strong className="text-indigo-400 capitalize">{selectedRisk.control_effectiveness || 'adequate'}</strong></p>
                          </div>

                          <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-center">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Computed Residual Risk Level</p>
                            <p className="text-2xl font-black text-white capitalize mt-1.5">
                              {calculateResidualLevel(
                                calculateInherentLevel(selectedRisk.inherent_likelihood || 3, selectedRisk.inherent_impact || 3),
                                (selectedRisk.control_effectiveness || 'adequate') as any
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Automatically computed from the 5x5 policy lookup table.</p>
                          </div>

                          <button
                            onClick={() => handleProgressRisk('owner_review')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg"
                          >
                            Submit to Owner Review
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Step: owner_review */}
                      {selectedRisk.workflow_step === 'owner_review' && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-300">Owner review in progress. Confirm ownership and sign off parameters.</p>
                          <button
                            onClick={() => handleProgressRisk('mgt_review')}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve & Sign Off
                          </button>
                        </div>
                      )}

                      {/* Step: mgt_review */}
                      {selectedRisk.workflow_step === 'mgt_review' && (() => {
                        const inherentLvl = calculateInherentLevel(selectedRisk.inherent_likelihood || 3, selectedRisk.inherent_impact || 3)
                        const controlRating = selectedRisk.control_effectiveness || 'adequate'
                        const residualLvl = calculateResidualLevel(inherentLvl, controlRating as any)
                        const gapVal = calculateRiskGap(residualLvl, targetRisk)

                        return (
                          <div className="space-y-4">
                            <p className="text-xs text-slate-300">Review final residual risk rating and configure the organization's target appetite level:</p>
                            
                            <div className="p-3 bg-black/10 border border-white/5 rounded-xl space-y-2 text-xs">
                              <p className="flex justify-between text-slate-400">Residual Risk: <strong className="text-white capitalize">{residualLvl}</strong></p>
                              <div className="flex justify-between items-center text-slate-400">
                                <span>Target Appetite Level:</span>
                                <select
                                  value={targetRisk}
                                  onChange={(e) => setTargetRisk(e.target.value as any)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-semibold outline-none text-white cursor-pointer"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="critical">Critical</option>
                                </select>
                              </div>
                            </div>

                            <div className={`p-3 border rounded-xl flex items-center justify-between text-xs ${
                              gapVal.gap > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                              <div>
                                <p className="font-bold">Appetite Check:</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{gapVal.text}</p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                gapVal.gap > 0 ? 'bg-red-500/20 border border-red-500/20' : 'bg-emerald-500/20 border border-emerald-500/20'
                              }`}>
                                {gapVal.gap > 0 ? 'Exceeds Appetite' : 'Within Appetite'}
                              </span>
                            </div>

                            <button
                              onClick={() => handleProgressRisk('appetite_check')}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg"
                            >
                              Approve & Run Appetite Check
                            </button>
                          </div>
                        )
                      })()}

                      {/* Step: treatment_plan */}
                      {selectedRisk.workflow_step === 'treatment_plan' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">
                            <AlertTriangle className="w-4 h-4 inline mr-1.5 animate-pulse" />
                            Residual risk rating exceeds appetite limit! Treatment is required.
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400">Treatment Strategy Options</label>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              {getAllowedTreatmentStrategies(calculateInherentLevel(selectedRisk.inherent_likelihood || 3, selectedRisk.inherent_impact || 3)).map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setSelectedStrategy(opt)}
                                  className={`p-2 rounded border cursor-pointer text-center capitalize transition-all ${
                                    selectedStrategy === opt
                                      ? 'border-indigo-500 text-white bg-indigo-600/20'
                                      : 'border-white/5 text-slate-400 hover:border-white/10'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400">Treatment Strategy Description</label>
                            <textarea
                              placeholder="Describe the strategy to mitigate, avoid or transfer risk…"
                              value={treatmentPlan}
                              onChange={(e) => setTreatmentPlan(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 rounded-xl text-xs border border-white/10 bg-transparent outline-none text-white focus:border-indigo-500 resize-none"
                            />
                          </div>

                          <button
                            onClick={() => handleProgressRisk('action_plan')}
                            disabled={!treatmentPlan.trim()}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg disabled:opacity-50"
                          >
                            Save & Plan Mitigation Actions
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Step: action_plan */}
                      {selectedRisk.workflow_step === 'action_plan' && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400">Action Plan Milestones</label>
                            <textarea
                              placeholder="Detail specific tasks, deadlines, and action owners..."
                              value={actionPlan}
                              onChange={(e) => setActionPlan(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 rounded-xl text-xs border border-white/10 bg-transparent outline-none text-white focus:border-indigo-500 resize-none"
                            />
                          </div>
                          <button
                            onClick={() => handleProgressRisk('implementation')}
                            disabled={!actionPlan.trim()}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg disabled:opacity-50"
                          >
                            Send to Implementation Phase
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Step: implementation */}
                      {selectedRisk.workflow_step === 'implementation' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-black/10 border rounded-lg text-xs space-y-1" style={{ borderColor: 'var(--border)' }}>
                            <p><strong>Action Plan details:</strong></p>
                            <p className="text-slate-400 italic">{selectedRisk.action_plan}</p>
                          </div>
                          <button
                            onClick={() => handleProgressRisk('validation')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            Mark Actions Completed
                          </button>
                        </div>
                      )}

                      {/* Step: validation */}
                      {selectedRisk.workflow_step === 'validation' && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400">Implementation Evidence Notes</label>
                            <textarea
                              placeholder="Paste verification link, screenshot references, or audit trails..."
                              value={validationEvidence}
                              onChange={(e) => setValidationEvidence(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 rounded-xl text-xs border border-white/10 bg-transparent outline-none text-white focus:border-indigo-500 resize-none"
                            />
                          </div>
                          <button
                            onClick={() => handleProgressRisk('residual_reassessment')}
                            disabled={!validationEvidence.trim()}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg disabled:opacity-50"
                          >
                            Proceed to Reassessment
                          </button>
                        </div>
                      )}

                      {/* Step: residual_reassessment */}
                      {selectedRisk.workflow_step === 'residual_reassessment' && (
                        <div className="space-y-4">
                          <p className="text-xs text-slate-300 font-semibold">Slide to configure reassessed residual ratings:</p>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 flex justify-between">
                              <span>Reassessed Likelihood: {resLikelihood}</span>
                            </label>
                            <input
                              type="range" min="1" max="5" value={resLikelihood}
                              onChange={(e) => setResLikelihood(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 flex justify-between">
                              <span>Reassessed Impact: {resImpact}</span>
                            </label>
                            <input
                              type="range" min="1" max="5" value={resImpact}
                              onChange={(e) => setResImpact(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>

                          <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-slate-400">Reassessed Risk Level:</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">Score: {resLikelihood * resImpact}</p>
                            </div>
                            <span className="font-black text-emerald-400 uppercase">
                              {calculateInherentLevel(resLikelihood, resImpact)}
                            </span>
                          </div>

                          <button
                            onClick={() => handleProgressRisk('verify_reassessment')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            Run Final Appetite Verification
                          </button>
                        </div>
                      )}

                      {/* Step: accepted */}
                      {selectedRisk.workflow_step === 'accepted' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-lg">
                            <CheckCircle className="w-4 h-4 inline mr-1.5 animate-pulse" />
                            Risk is within appetite, accepted, and placed under continuous monitoring.
                          </div>
                          <button
                            onClick={() => handleProgressRisk('closed')}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            Close Risk File
                          </button>
                        </div>
                      )}

                      {/* Step: escalated */}
                      {selectedRisk.workflow_step === 'escalated' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">
                            <AlertTriangle className="w-4 h-4 inline mr-1.5 animate-pulse" />
                            Residual level remains above appetite limit! Board or Committee decision is required.
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400">Board Decision (Executive Action)</label>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              {[
                                { value: 'accept', label: 'Accept Risk' },
                                { value: 'mitigate', label: 'Mitigate Risk' },
                                { value: 'transfer', label: 'Transfer Risk' },
                                { value: 'avoid', label: 'Avoid Risk' }
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setEscalationAction(opt.value as any)}
                                  className={`p-2 rounded border cursor-pointer text-center transition-all ${
                                    escalationAction === opt.value
                                      ? 'border-indigo-500 text-white bg-indigo-600/20'
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
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            Apply Decision & Close
                          </button>
                        </div>
                      )}

                      {/* Step: closed */}
                      {selectedRisk.workflow_step === 'closed' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-500/10 border border-white/5 text-xs text-slate-400 rounded-lg text-center font-semibold">
                            File Closed. Risk mitigation successfully completed.
                          </div>
                          <button
                            onClick={() => handleProgressRisk('identified')}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            Re-activate Risk
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-12">Select a risk to view details.</div>
                )}

                {/* Reset State Button */}
                {selectedRisk && (
                  <button
                    onClick={() => handleProgressRisk('identified')}
                    className="mt-6 text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider text-center cursor-pointer"
                  >
                    Reset Workflow
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: UNIFIED GRC INTAKE WORKFLOW */}
        {activeTab === 'intake' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Active Intake Items List */}
            <div className="card p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">GRC Intake Records</h3>
                  <p className="text-sm font-black text-white mt-0.5">Registration Desk</p>
                </div>
                <button
                  onClick={() => setShowCreateIntake(true)}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Create Intake Panel */}
              {showCreateIntake && (
                <form onSubmit={handleCreateIntake} className="p-4 rounded-xl bg-slate-900 border border-indigo-500/20 space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <p className="text-xs font-bold text-indigo-400">New GRC Record</p>
                    <button type="button" onClick={() => setShowCreateIntake(false)} className="text-[10px] text-slate-500 hover:text-slate-400">Cancel</button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">Title</label>
                    <input
                      type="text" required placeholder="e.g. Weak password policy..."
                      value={intakeTitle} onChange={e => setIntakeTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">Description</label>
                    <textarea
                      placeholder="Enter detailed description..."
                      value={intakeDesc} onChange={e => setIntakeDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Type</label>
                      <select
                        value={intakeType} onChange={e => setIntakeType(e.target.value as any)}
                        className="w-full px-2 py-1 rounded bg-slate-800 border border-white/10 text-[11px] text-white"
                      >
                        <option value="finding">Audit Finding</option>
                        <option value="incident">Incident</option>
                        <option value="risk">Risk</option>
                        <option value="requirement">Requirement</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Classification</label>
                      <select
                        value={intakeClass} onChange={e => setIntakeClass(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-slate-800 border border-white/10 text-[11px] text-white"
                      >
                        <option value="cybersecurity">Cybersecurity</option>
                        <option value="financial">Financial</option>
                        <option value="legal">Legal / Compliance</option>
                        <option value="operational">Operational</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Submit
                  </button>
                </form>
              )}

              {/* Items List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {intakeItems.length > 0 ? (
                  intakeItems.map(item => {
                    const active = item.id === selectedIntakeId
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedIntakeId(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? 'border-indigo-500 bg-indigo-500/5'
                            : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-white truncate flex-1">{item.title}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                            item.type === 'incident' ? 'bg-red-500/10 text-red-400' :
                            item.type === 'finding' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">{item.description}</p>
                        <div className="flex justify-between items-center mt-2.5 text-[9px] text-slate-500">
                          <span>Status: <strong>{item.status}</strong></span>
                          <span>Step: <strong>{item.step}</strong></span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-slate-500 py-12 text-xs">No GRC records created yet. Add one using the top-right button.</div>
                )}
              </div>
            </div>

            {/* Right: GRC Intake Process Steps Pipeline Visualizer */}
            <div className="lg:col-span-2 card p-6 space-y-6">
              {selectedIntake ? (
                <div className="space-y-6">
                  
                  {/* Visual GRC Intake SVG Flowchart */}
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">GRC Intake Compliance Visual Pipeline</h3>
                    
                    <div className="relative border rounded-2xl p-6 bg-slate-950/80 overflow-x-auto min-h-[420px] select-none" style={{ borderColor: 'var(--border)' }}>
                      <svg className="absolute inset-0 w-[900px] h-[400px] pointer-events-none z-0">
                        <defs>
                          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#334155" />
                          </marker>
                          <marker id="arr-act" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#6366f1" />
                          </marker>
                        </defs>

                        {/* Pipeline Connections */}
                        {/* registration -> classification */}
                        <path d="M 90 125 L 90 200" stroke={selectedIntake.step !== 'registration' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={selectedIntake.step !== 'registration' ? 'url(#arr-act)' : 'url(#arr)'} />
                        {/* classification -> control_mapping */}
                        <path d="M 150 222.5 L 200 222.5" stroke={['control_mapping','evidence_collection','compliance_assessment','gap_assessment','compliant_closed','non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={['control_mapping','evidence_collection','compliance_assessment','gap_assessment','compliant_closed','non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) ? 'url(#arr-act)' : 'url(#arr)'} />
                        {/* control_mapping -> evidence_collection */}
                        <path d="M 260 200 L 260 125" stroke={['evidence_collection','compliance_assessment','gap_assessment','compliant_closed','non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={['evidence_collection','compliance_assessment','gap_assessment','compliant_closed','non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) ? 'url(#arr-act)' : 'url(#arr)'} />
                        {/* evidence_collection -> compliance_assessment */}
                        <path d="M 320 102.5 L 370 102.5" stroke={['compliance_assessment','gap_assessment','compliant_closed','non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={['compliance_assessment','gap_assessment','compliant_closed','non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) ? 'url(#arr-act)' : 'url(#arr)'} />
                        {/* compliance_assessment -> Gap Identified (Decision) */}
                        <path d="M 430 125 L 430 200" stroke={['gap_assessment','compliant_closed','non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={['gap_assessment','compliant_closed','non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) ? 'url(#arr-act)' : 'url(#arr)'} />
                        
                        {/* Gap Identified -> Compliant & Closed (No gap) */}
                        <path d="M 430 270 L 430 320" stroke={selectedIntake.status === 'compliant' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={selectedIntake.status === 'compliant' ? 'url(#arr-act)' : 'url(#arr)'} />
                        {/* Gap Identified -> Non Compliance (Yes gap) */}
                        <path d="M 465 235 L 540 235" stroke={['non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) || selectedIntake.status === 'non_compliant' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={['non_compliance','risk_routing','action_plan'].includes(selectedIntake.step) || selectedIntake.status === 'non_compliant' ? 'url(#arr-act)' : 'url(#arr)'} />
                        
                        {/* Non Compliance -> Risk Creation Required (Decision) */}
                        <path d="M 600 245 L 600 320" stroke={['risk_routing','action_plan'].includes(selectedIntake.step) ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={['risk_routing','action_plan'].includes(selectedIntake.step) ? 'url(#arr-act)' : 'url(#arr)'} />
                        
                        {/* Risk Creation Required -> Create Risk (Yes) */}
                        <path d="M 635 355 L 720 355" stroke={selectedIntake.step === 'risk_routing' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={selectedIntake.step === 'risk_routing' ? 'url(#arr-act)' : 'url(#arr)'} />
                        {/* Risk Creation Required -> Issue Action Plan (No) */}
                        <path d="M 600 320 L 600 290 L 720 235" stroke={selectedIntake.step === 'action_plan' ? '#6366f1' : '#334155'} strokeWidth="2.5" markerEnd={selectedIntake.step === 'action_plan' ? 'url(#arr-act)' : 'url(#arr)'} />

                      </svg>

                      {/* GRC PIPELINE NODES */}
                      <div className="absolute inset-0 pointer-events-none z-10 w-[900px] h-[400px]">
                        {[
                          { id: 'registration', label: '1. Registration', x: 30, y: 80, shape: 'rect' },
                          { id: 'classification', label: '2. Classification', x: 30, y: 200, shape: 'rect' },
                          { id: 'control_mapping', label: '3. Control Mapping', x: 200, y: 200, shape: 'rect' },
                          { id: 'evidence_collection', label: '4. Evidence Collection', x: 200, y: 80, shape: 'rect' },
                          { id: 'compliance_assessment', label: '5. Assessment', x: 370, y: 80, shape: 'rect' },
                          { id: 'gap_assessment', label: 'Gap Identified?', x: 395, y: 200, shape: 'diamond' },
                          { id: 'compliant_closed', label: 'Compliant & Closed', x: 370, y: 320, shape: 'rect' },
                          { id: 'non_compliance', label: '6. Non Compliance', x: 540, y: 200, shape: 'rect' },
                          { id: 'risk_creation_decision', label: 'Risk Required?', x: 565, y: 320, shape: 'diamond' },
                          { id: 'action_plan', label: '7. Issue Action Plan', x: 700, y: 200, shape: 'rect' },
                          { id: 'risk_routing', label: '7. Route to Registry', x: 700, y: 320, shape: 'rect' },
                        ].map(node => {
                          const active = selectedIntake.step === node.id ||
                                         (node.id === 'gap_assessment' && selectedIntake.step === 'compliance_assessment') ||
                                         (node.id === 'risk_creation_decision' && selectedIntake.step === 'non_compliance')

                          const completed = ['registration','classification','control_mapping','evidence_collection','compliance_assessment','gap_assessment','compliant_closed'].indexOf(selectedIntake.step) > ['registration','classification','control_mapping','evidence_collection','compliance_assessment','gap_assessment','compliant_closed'].indexOf(node.id)

                          if (node.shape === 'diamond') {
                            return (
                              <div
                                key={node.id}
                                style={{ left: `${node.x}px`, top: `${node.y}px`, width: '70px', height: '70px' }}
                                className="absolute pointer-events-auto flex items-center justify-center text-center cursor-help"
                                title={node.label}
                              >
                                <div className={`w-[48px] h-[48px] rotate-45 border flex items-center justify-center transition-all ${
                                  active ? 'bg-indigo-600/30 border-indigo-500 shadow-lg shadow-indigo-600/20' : 
                                  completed ? 'bg-slate-900 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-white/10 text-slate-500'
                                }`}>
                                  <HelpCircle className="w-4 h-4 -rotate-45" />
                                </div>
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24 text-[8px] font-bold text-center text-slate-400 uppercase tracking-tight">{node.label}</span>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={node.id}
                              style={{ left: `${node.x}px`, top: `${node.y}px`, width: '120px', height: '45px' }}
                              className={`absolute rounded-xl border p-2 text-left flex flex-col justify-center transition-all ${
                                active
                                  ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                                  : completed
                                  ? 'bg-slate-900/60 border-indigo-500/30 text-indigo-400'
                                  : 'bg-slate-900/20 border-white/5 text-slate-500'
                              }`}
                            >
                              <span className="text-[9px] truncate">{node.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Action Forms based on selected GRC step */}
                  <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 uppercase tracking-wider">Active Pipeline Task</span>
                        <h4 className="text-base font-bold text-white mt-1.5 capitalize">{selectedIntake.step.replace(/_/g, ' ')}</h4>
                      </div>
                      <span className="text-xs text-slate-400">Class: <strong>{selectedIntake.classification}</strong></span>
                    </div>

                    {selectedIntake.step === 'registration' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Source Title:</strong> {selectedIntake.title}</p>
                        <p className="text-xs text-slate-400 italic">"{selectedIntake.description}"</p>
                        <button
                          onClick={() => handleProgressIntake('classification')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Progress to Classification
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'classification' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300">Classify the compliance asset scope:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {['cybersecurity', 'financial', 'operational', 'legal'].map(c => (
                            <div key={c} className={`p-2.5 rounded-lg border text-center capitalize ${
                              selectedIntake.classification === c ? 'border-indigo-500 text-white bg-indigo-600/10' : 'border-white/5 text-slate-400'
                            }`}>{c}</div>
                          ))}
                        </div>
                        <button
                          onClick={() => handleProgressIntake('control_mapping')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Confirm & Map Controls
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'control_mapping' && (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-400">Select Applicable Framework Controls</label>
                        <div className="max-h-36 overflow-y-auto space-y-1 select-none pr-1">
                          {controls.map(c => {
                            const checked = intakeControlIds.includes(c.id)
                            return (
                              <label key={c.id} className="flex items-center gap-2 p-2 rounded bg-black/10 text-xs cursor-pointer border border-white/5 hover:border-white/10">
                                <input
                                  type="checkbox" checked={checked}
                                  onChange={() => {
                                    if (checked) {
                                      setIntakeControlIds(prev => prev.filter(id => id !== c.id))
                                    } else {
                                      setIntakeControlIds(prev => [...prev, c.id])
                                    }
                                  }}
                                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 bg-transparent"
                                />
                                <span className="text-[10px] font-bold text-indigo-400 font-mono shrink-0">{c.control_id}</span>
                                <span className="text-slate-300 truncate">{c.title}</span>
                              </label>
                            )
                          })}
                        </div>
                        <button
                          onClick={() => handleProgressIntake('evidence_collection')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Go to Evidence Collection
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'evidence_collection' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Compliance Evidence Link/Ref</label>
                          <input
                            type="text" placeholder="e.g. s3://acme-audit/controls/A.9.1.pdf"
                            value={intakeEvidenceUrl} onChange={e => setIntakeEvidenceUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Implementation Evidence Notes</label>
                          <textarea
                            placeholder="Add compliance notes and evidence description..."
                            value={intakeEvidenceNote} onChange={e => setIntakeEvidenceNote(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500 resize-none"
                            rows={2}
                          />
                        </div>
                        <button
                          onClick={() => handleProgressIntake('compliance_assessment')}
                          disabled={!intakeEvidenceUrl.trim()}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
                        >
                          Run Compliance Assessment
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'compliance_assessment' && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-300">Does the evidence validate compliance with the controls?</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button" onClick={() => setIntakeIsCompliant(true)}
                            className={`p-3 rounded-xl border text-xs font-bold transition-colors ${
                              intakeIsCompliant ? 'border-emerald-500 text-white bg-emerald-500/10' : 'border-white/5 text-slate-400'
                            }`}
                          >
                            Yes, Compliant
                          </button>
                          <button
                            type="button" onClick={() => setIntakeIsCompliant(false)}
                            className={`p-3 rounded-xl border text-xs font-bold transition-colors ${
                              !intakeIsCompliant ? 'border-red-500 text-white bg-red-500/10' : 'border-white/5 text-slate-400'
                            }`}
                          >
                            No, Gap Identified
                          </button>
                        </div>
                        <button
                          onClick={() => handleProgressIntake('gap_assessment')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Verify Assessment Results
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'gap_assessment' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">
                          Compliance Gap Identified! Remediation path must be configured.
                        </div>
                        <button
                          onClick={() => handleProgressIntake('non_compliance')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Route to Non-Compliance
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'non_compliance' && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-300">Select remediation path for compliance failure:</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button" onClick={() => setIntakeGapRiskRequired(true)}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                              intakeGapRiskRequired ? 'border-indigo-500 text-white bg-indigo-600/10' : 'border-white/5 text-slate-400'
                            }`}
                          >
                            Route to Risk Register
                          </button>
                          <button
                            type="button" onClick={() => setIntakeGapRiskRequired(false)}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                              !intakeGapRiskRequired ? 'border-indigo-500 text-white bg-indigo-600/10' : 'border-white/5 text-slate-400'
                            }`}
                          >
                            Issue Issue Action Plan
                          </button>
                        </div>
                        <button
                          onClick={() => handleProgressIntake('non_compliance')}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Confirm & Route Task
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'risk_routing' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300">Creates a new risk in the Risk Register and routes it to Phase 1 for inherent assessment.</p>
                        <button
                          onClick={() => handleProgressIntake('risk_routing')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Create Risk Card & Route
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'action_plan' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Issue Action Plan Details</label>
                          <textarea
                            placeholder="Enter task details, target timelines, and action owner..."
                            value={intakeIssuePlan} onChange={e => setIntakeIssuePlan(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500 resize-none"
                            rows={3}
                          />
                        </div>
                        <button
                          onClick={() => handleProgressIntake('action_plan')}
                          disabled={!intakeIssuePlan.trim()}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
                        >
                          Complete & Close GRC Item
                        </button>
                      </div>
                    )}

                    {selectedIntake.step === 'compliant_closed' && (
                      <div className="space-y-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-lg text-center font-bold">
                        Compliance Asset is Compliant and Closed.
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-12">Select an intake item to view details.</div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
