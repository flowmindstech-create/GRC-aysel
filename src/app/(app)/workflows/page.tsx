'use client'

// GRC & Risk Registry Workflow Dashboard
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
  Info
} from 'lucide-react'

// Define English labels and descriptions for GRC steps
interface StepInfo {
  id: string
  label: string
  desc: string
  phase: 'init' | 'assess' | 'review' | 'mitigate' | 'resolve'
}

const RISK_STEPS: StepInfo[] = [
  { id: 'identified', label: 'Risk Identified', desc: 'A new risk has been identified and is awaiting registration.', phase: 'init' },
  { id: 'registered', label: 'Registration', desc: 'The risk is described, owner and category are assigned.', phase: 'init' },
  { id: 'assessed_inherent', label: 'Inherent Assessment', desc: 'Likelihood and impact are assessed without any control measures.', phase: 'assess' },
  { id: 'control_mapped', label: 'Control Mapping', desc: 'Applicable compliance controls are mapped to mitigate the risk.', phase: 'assess' },
  { id: 'control_assessed', label: 'Control Effectiveness', desc: 'The effectiveness of mapped controls is evaluated.', phase: 'assess' },
  { id: 'assessed_residual', label: 'Residual Assessment', desc: 'Residual risk level is calculated taking controls into account.', phase: 'assess' },
  { id: 'owner_review', label: 'Risk Owner Review', desc: 'Risk owner reviews the assessment results and control measures.', phase: 'review' },
  { id: 'mgt_review', label: '2nd Line Review', desc: 'Risk management function (2nd Line) approves the assessment.', phase: 'review' },
  { id: 'treatment_plan', label: 'Treatment Required', desc: 'A treatment plan is required when residual risk exceeds appetite.', phase: 'mitigate' },
  { id: 'action_plan', label: 'Action Plan Creation', desc: 'A step-by-step action plan is created to mitigate the risk.', phase: 'mitigate' },
  { id: 'implementation', label: 'Implementation', desc: 'Mitigation measures are implemented according to the treatment plan.', phase: 'mitigate' },
  { id: 'validation', label: 'Validation', desc: 'Evidence of implementation is uploaded and validated.', phase: 'mitigate' },
  { id: 'residual_reassessment', label: 'Residual Reassessment', desc: 'Residual risk level is reassessed after mitigation steps.', phase: 'mitigate' },
  { id: 'accepted', label: 'Accept Risk & Monitor', desc: 'Risk is within appetite, accepted, and routed for periodic monitoring.', phase: 'resolve' },
  { id: 'escalated', label: 'Escalation', desc: 'Risk level is not acceptable. Escalated to Risk Committee or Board.', phase: 'resolve' },
  { id: 'closed', label: 'Closed', desc: 'The risk is fully resolved or closed.', phase: 'resolve' }
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
  const [resLikelihood, setResLikelihood] = useState<number>(2)
  const [resImpact, setResImpact] = useState<number>(2)
  const [mappedControlIds, setMappedControlIds] = useState<string[]>([])
  const [controlEffectiveness, setControlEffectiveness] = useState<'effective' | 'partially_effective' | 'ineffective'>('effective')
  const [treatmentPlan, setTreatmentPlan] = useState<string>('')
  const [actionPlan, setActionPlan] = useState<string>('')
  const [validationEvidence, setValidationEvidence] = useState<string>('')
  const [escalationAction, setEscalationAction] = useState<'mitigate' | 'accept' | 'transfer' | 'avoid'>('mitigate')

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

  // Sync Form States when Selected Risk changes
  useEffect(() => {
    if (selectedRisk) {
      setInhLikelihood(selectedRisk.inherent_likelihood || selectedRisk.likelihood || 3)
      setInhImpact(selectedRisk.inherent_impact || selectedRisk.impact || 3)
      setResLikelihood(selectedRisk.residual_likelihood || selectedRisk.likelihood || 2)
      setResImpact(selectedRisk.residual_impact || selectedRisk.impact || 2)
      setMappedControlIds(selectedRisk.control_mapped_ids || [])
      setControlEffectiveness(selectedRisk.control_effectiveness || 'effective')
      setTreatmentPlan(selectedRisk.treatment_plan || '')
      setActionPlan(selectedRisk.action_plan || '')
      setValidationEvidence(selectedRisk.validation_evidence || '')
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
    toast.success(`Risk workflow updated: ${RISK_STEPS.find(s => s.id === saved.workflow_step)?.label}`)
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
    } else if (nextStep === 'control_assessed') {
      updates.control_mapped_ids = mappedControlIds
    } else if (nextStep === 'assessed_residual') {
      updates.control_effectiveness = controlEffectiveness
    } else if (nextStep === 'owner_review') {
      updates.residual_likelihood = resLikelihood
      updates.residual_impact = resImpact
      updates.status = 'in_progress'
    } else if (nextStep === 'appetite_check') {
      // Appetite calculation: Likelihood * Impact
      const resScore = resLikelihood * resImpact
      // Let's assume threshold is 8
      if (resScore <= 8) {
        updates.workflow_step = 'accepted'
        updates.status = 'accepted'
      } else {
        updates.workflow_step = 'treatment_plan'
      }
    } else if (nextStep === 'action_plan') {
      updates.treatment_plan = treatmentPlan
    } else if (nextStep === 'implementation') {
      updates.action_plan = actionPlan
    } else if (nextStep === 'validation') {
      // mark implemented
    } else if (nextStep === 'residual_reassessment') {
      updates.validation_evidence = validationEvidence
    } else if (nextStep === 'verify_reassessment') {
      // Re-evaluate residual risk
      const finalScore = resLikelihood * resImpact
      if (finalScore <= 8) {
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
      // Move to gap assessment or mark compliant
    } else if (nextStep === 'gap_assessment') {
      updates.gap_identified = !intakeIsCompliant
      updates.status = intakeIsCompliant ? 'compliant' : 'non_compliant'
      if (intakeIsCompliant) {
        updates.step = 'closed'
      }
    } else if (nextStep === 'closed') {
      if (selectedIntake.gap_identified) {
        updates.risk_creation_required = intakeGapRiskRequired
        if (intakeGapRiskRequired) {
          // Trigger automatic risk creation!
          const newRisk: Risk = {
            id: 'r-' + Math.random().toString(36).substr(2, 9),
            org_id: selectedIntake.org_id,
            title: `[INTAKE GAP] ${selectedIntake.title}`,
            description: `Compliance gap identified on GRC Intake (${selectedIntake.id}). Description: ${selectedIntake.description}`,
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
          toast.success('New Risk created and routed to the Risk Register workflow!')
        } else {
          // Create a mock Issue Action Plan in activity
          await db.addActivity({
            id: Math.random().toString(36).substr(2, 9),
            org_id: selectedIntake.org_id,
            action: `created issue plan: ${intakeIssuePlan}`,
            entity_type: 'intake',
            entity_id: selectedIntake.id,
            entity_title: selectedIntake.title,
            created_at: new Date().toISOString()
          })
          toast.success('Issue action plan registered successfully!')
        }
      }
    }

    const saved = await db.saveGRCIntakeItem({ ...selectedIntake, ...updates })
    setIntakeItems(prev => prev.map(i => i.id === saved.id ? saved : i))
    toast.success(`Intake stage updated to: ${saved.step}`)
  }

  return (
    <>
      <TopNav title="GRC Workflows" subtitle="Visual management of Risk Register and Unified GRC Intake lifecycles" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-white/5 pb-px">
          <button
            onClick={() => setActiveTab('risk')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'risk'
                ? 'border-indigo-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>Risk Registry Workflow</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('intake')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'intake'
                ? 'border-indigo-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>Unified GRC Intake</span>
            </div>
          </button>
        </div>

        {/* TAB 1: RISK REGISTRY WORKFLOW */}
        {activeTab === 'risk' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Interactive Visual Flowchart */}
            <div className="lg:col-span-2 card p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Workflow Flowchart</h3>
                  <p className="text-xs text-slate-400 mt-1">Current phase and routing of the selected risk in the registry.</p>
                </div>
                
                {/* Risk Selector */}
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

              {selectedRisk ? (
                <div className="space-y-6 pt-4">
                  {/* Visual flowchart layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Phase 1 */}
                    <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide border-b border-white/5 pb-1">Phase 1: Intake</p>
                      {['identified', 'registered'].map(stepId => {
                        const step = RISK_STEPS.find(s => s.id === stepId)!
                        const active = selectedRisk.workflow_step === stepId
                        return (
                          <div
                            key={stepId}
                            className={`p-3 rounded-lg border transition-all text-xs font-medium ${
                              active
                                ? 'bg-indigo-600/20 border-indigo-500 text-white animate-pulse-ring'
                                : 'bg-slate-800/20 border-white/5 text-slate-400'
                            }`}
                          >
                            <p className="font-bold flex items-center gap-1">
                              {active && <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                              {step.label}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Phase 2 */}
                    <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide border-b border-white/5 pb-1">Phase 2: Assessment</p>
                      {['assessed_inherent', 'control_mapped', 'control_assessed', 'assessed_residual'].map(stepId => {
                        const step = RISK_STEPS.find(s => s.id === stepId)!
                        const active = selectedRisk.workflow_step === stepId
                        return (
                          <div
                            key={stepId}
                            className={`p-3 rounded-lg border transition-all text-xs font-medium ${
                              active
                                ? 'bg-indigo-600/20 border-indigo-500 text-white animate-pulse-ring'
                                : 'bg-slate-800/20 border-white/5 text-slate-400'
                            }`}
                          >
                            <p className="font-bold flex items-center gap-1">
                              {active && <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                              {step.label}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Phase 3 */}
                    <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide border-b border-white/5 pb-1">Phase 3: Approval</p>
                      {['owner_review', 'mgt_review'].map(stepId => {
                        const step = RISK_STEPS.find(s => s.id === stepId)!
                        const active = selectedRisk.workflow_step === stepId
                        return (
                          <div
                            key={stepId}
                            className={`p-3 rounded-lg border transition-all text-xs font-medium ${
                              active
                                ? 'bg-indigo-600/20 border-indigo-500 text-white animate-pulse-ring'
                                : 'bg-slate-800/20 border-white/5 text-slate-400'
                            }`}
                          >
                            <p className="font-bold flex items-center gap-1">
                              {active && <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                              {step.label}
                            </p>
                          </div>
                        )
                      })}
                      {/* Sub Appetite check representation */}
                      <div className="p-2.5 rounded-lg border border-dashed border-white/5 text-[10px] text-slate-500 bg-black/10">
                        <Info className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
                        Residual risk appetite check (Limit: 8)
                      </div>
                    </div>

                    {/* Phase 4 & 5 */}
                    <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide border-b border-white/5 pb-1">Phase 4: Resolution</p>
                      {['treatment_plan', 'action_plan', 'implementation', 'validation', 'residual_reassessment', 'accepted', 'escalated', 'closed'].map(stepId => {
                        const step = RISK_STEPS.find(s => s.id === stepId)!
                        const active = selectedRisk.workflow_step === stepId
                        // Only display if active, or for critical final states
                        const shouldShow = active || stepId === 'accepted' || stepId === 'escalated' || stepId === 'closed'
                        if (!shouldShow) return null
                        return (
                          <div
                            key={stepId}
                            className={`p-2 rounded-lg border transition-all text-[11px] font-medium ${
                              active
                                ? 'bg-indigo-600/20 border-indigo-500 text-white animate-pulse-ring'
                                : 'bg-slate-800/10 border-white/5 text-slate-500'
                            }`}
                          >
                            <p className="font-bold flex items-center gap-1">
                              {active && <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />}
                              {step.label}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Flow description */}
                  <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs flex gap-3 items-start">
                    <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-300">Current Risk Status: {RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.label}</p>
                      <p className="text-slate-400 mt-1">{RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.desc}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">No risks found.</div>
              )}
            </div>

            {/* Right: Interactive Steps Action Panel */}
            <div className="card p-6 flex flex-col justify-between">
              {selectedRisk ? (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 uppercase">Active Step</span>
                    <h4 className="text-base font-bold text-white mt-2">
                      {RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.label || 'Registration'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">Fill in required details to progress to the next step.</p>
                  </div>

                  {/* STEP ACTIONS */}
                  <div className="space-y-4 pt-2">
                    
                    {/* Step: identified */}
                    {selectedRisk.workflow_step === 'identified' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300 font-medium">Risk initially identified. Move to the registration phase.</p>
                        <button
                          onClick={() => handleProgressRisk('registered')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start Registration
                        </button>
                      </div>
                    )}

                    {/* Step: registered */}
                    {selectedRisk.workflow_step === 'registered' && (
                      <div className="space-y-3">
                        <div className="text-xs space-y-1 text-slate-400">
                          <p><strong>Title:</strong> {selectedRisk.title}</p>
                          <p><strong>Category:</strong> {selectedRisk.category}</p>
                          <p><strong>Owner:</strong> {selectedRisk.owner_name || 'Not assigned'}</p>
                        </div>
                        <button
                          onClick={() => handleProgressRisk('assessed_inherent')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
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
                            <span>Likelihood: {inhLikelihood}</span>
                            <span className="text-[10px] text-slate-500">1 - Very Low, 5 - Very High</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={inhLikelihood}
                            onChange={(e) => setInhLikelihood(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Impact: {inhImpact}</span>
                            <span className="text-[10px] text-slate-500">1 - Negligible, 5 - Catastrophic</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={inhImpact}
                            onChange={(e) => setInhImpact(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="p-3 bg-black/10 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">Inherent Risk Score:</span>
                          <span className="font-black text-lg text-rose-500">{inhLikelihood * inhImpact} / 25</span>
                        </div>
                        <button
                          onClick={() => handleProgressRisk('control_mapped')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Go to Control Mapping
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: control_mapped */}
                    {selectedRisk.workflow_step === 'control_mapped' && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400">Available Compliance Controls</label>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
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
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Go to Effectiveness Assessment
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: control_assessed */}
                    {selectedRisk.workflow_step === 'control_assessed' && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400">Control Effectiveness</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'effective', label: 'Effective' },
                            { value: 'partially_effective', label: 'Partially' },
                            { value: 'ineffective', label: 'Ineffective' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setControlEffectiveness(opt.value as any)}
                              className={`p-2.5 rounded-lg border text-[11px] font-semibold text-center cursor-pointer transition-all ${
                                controlEffectiveness === opt.value
                                  ? 'border-indigo-500 text-white bg-indigo-600/20'
                                  : 'border-white/5 text-slate-400 hover:border-white/10'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleProgressRisk('assessed_residual')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Go to Residual Assessment
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: assessed_residual */}
                    {selectedRisk.workflow_step === 'assessed_residual' && (
                      <div className="space-y-4">
                        <p className="text-[10px] text-indigo-400">Inherent Risk Score: {selectedRisk.inherent_likelihood! * selectedRisk.inherent_impact!} (Likelihood {selectedRisk.inherent_likelihood} × Impact {selectedRisk.inherent_impact})</p>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Residual Likelihood: {resLikelihood}</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={resLikelihood}
                            onChange={(e) => setResLikelihood(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Residual Impact: {resImpact}</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={resImpact}
                            onChange={(e) => setResImpact(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="p-3 bg-black/10 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">Residual Risk Score:</span>
                          <span className="font-black text-lg text-amber-500">{resLikelihood * resImpact} / 25</span>
                        </div>
                        <button
                          onClick={() => handleProgressRisk('owner_review')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Send to Owner Review
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: owner_review */}
                    {selectedRisk.workflow_step === 'owner_review' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Risk Owner:</strong> {selectedRisk.owner_name || 'Management'}</p>
                        <p className="text-xs text-slate-400 italic">"This assessment reflects the real situation and the proposed controls are appropriate."</p>
                        <button
                          onClick={() => handleProgressRisk('mgt_review')}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      </div>
                    )}

                    {/* Step: mgt_review */}
                    {selectedRisk.workflow_step === 'mgt_review' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>2nd Line Review:</strong> Approval by Risk Management.</p>
                        <button
                          onClick={() => handleProgressRisk('appetite_check')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          2nd Line Approval & Appetite Check
                        </button>
                      </div>
                    )}

                    {/* Step: treatment_plan */}
                    {selectedRisk.workflow_step === 'treatment_plan' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-lg">
                          <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                          Residual Risk ({selectedRisk.residual_likelihood! * selectedRisk.residual_impact!}) exceeds Appetite Limit (8)! Treatment plan is required.
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Treatment Strategy (Treatment Plan)</label>
                          <textarea
                            placeholder="Describe the treatment strategy to mitigate the risk..."
                            value={treatmentPlan}
                            onChange={(e) => setTreatmentPlan(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl text-xs border border-white/10 bg-transparent outline-none text-white focus:border-indigo-500"
                          />
                        </div>
                        <button
                          onClick={() => handleProgressRisk('action_plan')}
                          disabled={!treatmentPlan.trim()}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          Go to Action Plan
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: action_plan */}
                    {selectedRisk.workflow_step === 'action_plan' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Action Plan Details & Tasks</label>
                          <textarea
                            placeholder="Mitigation steps, owners, and target deadlines..."
                            value={actionPlan}
                            onChange={(e) => setActionPlan(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl text-xs border border-white/10 bg-transparent outline-none text-white focus:border-indigo-500"
                          />
                        </div>
                        <button
                          onClick={() => handleProgressRisk('implementation')}
                          disabled={!actionPlan.trim()}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          Send to Implementation
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: implementation */}
                    {selectedRisk.workflow_step === 'implementation' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Action Plan in Progress:</strong></p>
                        <p className="text-xs text-slate-400 p-2.5 bg-black/10 rounded-lg">{selectedRisk.action_plan}</p>
                        <button
                          onClick={() => handleProgressRisk('validation')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Complete Actions & Upload Evidence
                        </button>
                      </div>
                    )}

                    {/* Step: validation */}
                    {selectedRisk.workflow_step === 'validation' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Evidence of Implementation (Note/Link)</label>
                          <textarea
                            placeholder="e.g., config change screenshot, report link..."
                            value={validationEvidence}
                            onChange={(e) => setValidationEvidence(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl text-xs border border-white/10 bg-transparent outline-none text-white focus:border-indigo-500"
                          />
                        </div>
                        <button
                          onClick={() => handleProgressRisk('residual_reassessment')}
                          disabled={!validationEvidence.trim()}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          Reassess Risk
                        </button>
                      </div>
                    )}

                    {/* Step: residual_reassessment */}
                    {selectedRisk.workflow_step === 'residual_reassessment' && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-300 font-semibold">Enter new Residual Risk values after implementation:</p>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>New Residual Likelihood: {resLikelihood}</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={resLikelihood}
                            onChange={(e) => setResLikelihood(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>New Residual Impact: {resImpact}</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={resImpact}
                            onChange={(e) => setResImpact(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="p-3 bg-black/10 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">New Residual Risk Score:</span>
                          <span className="font-black text-lg text-emerald-500">{resLikelihood * resImpact} / 25</span>
                        </div>
                        <button
                          onClick={() => handleProgressRisk('verify_reassessment')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Verify Appetite Check
                        </button>
                      </div>
                    )}

                    {/* Step: accepted */}
                    {selectedRisk.workflow_step === 'accepted' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-lg">
                          <CheckCircle className="w-4 h-4 inline mr-1.5" />
                          Risk is at an acceptable level and under monitoring.
                        </div>
                        <button
                          onClick={() => handleProgressRisk('closed')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Close Risk
                        </button>
                      </div>
                    )}

                    {/* Step: escalated */}
                    {selectedRisk.workflow_step === 'escalated' && (
                      <div className="space-y-4">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">
                          <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                          Risk level remains above limit! Board or Committee decision required.
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Board Decision (Executive Decision)</label>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            {[
                              { value: 'accept', label: 'Accept Risk' },
                              { value: 'mitigate', label: 'Mitigate Risk' },
                              { value: 'transfer', label: 'Transfer Risk (Insurance)' },
                              { value: 'avoid', label: 'Avoid Risk (Terminate)' }
                            ].map(opt => (
                              <button
                                key={opt.value}
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
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Apply Decision & Close
                        </button>
                      </div>
                    )}

                    {/* Step: closed */}
                    {selectedRisk.workflow_step === 'closed' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-500/10 border border-white/5 text-xs text-slate-400 rounded-lg text-center font-semibold">
                          File Closed. Risk mitigation completed.
                        </div>
                        <button
                          onClick={() => handleProgressRisk('identified')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Re-activate
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
        )}

        {/* TAB 2: UNIFIED GRC INTAKE WORKFLOW */}
        {activeTab === 'intake' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Active Intake Items List */}
            <div className="card p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">GRC Intake Records</h3>
                  <p className="text-xs text-slate-400 mt-1">Initial requirements, audit findings, and incidents.</p>
                </div>
                <button
                  onClick={() => setShowCreateIntake(true)}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Create Intake Panel (Popup/inline) */}
              {showCreateIntake && (
                <form onSubmit={handleCreateIntake} className="p-4 rounded-xl bg-slate-900 border border-indigo-500/20 space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <p className="text-xs font-bold text-indigo-400">New GRC Record</p>
                    <button type="button" onClick={() => setShowCreateIntake(false)} className="text-[10px] text-slate-500 hover:text-slate-400">Cancel</button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">Title</label>
                    <input
                      type="text" required placeholder="e.g., Weak password policy..."
                      value={intakeTitle} onChange={e => setIntakeTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">Description</label>
                    <textarea
                      placeholder="Enter detailed description..."
                      value={intakeDesc} onChange={e => setIntakeDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
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
                        <option value="finding">Audit Findings</option>
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

            {/* Right: GRC Intake Process Steps Stepper */}
            <div className="lg:col-span-2 card p-6 space-y-6">
              {selectedIntake ? (
                <div className="space-y-6">
                  
                  {/* Visual Intake Stepper Progress */}
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">GRC Intake & Compliance Steps</h3>
                    
                    {/* Desktop view stepper */}
                    <div className="hidden md:flex items-center gap-1 mt-4">
                      {[
                        { step: 'registration', label: '1. Intake' },
                        { step: 'classification', label: '2. Classification' },
                        { step: 'control_mapping', label: '3. Control Mapping' },
                        { step: 'evidence_collection', label: '4. Evidence' },
                        { step: 'compliance_assessment', label: '5. Assessment' },
                        { step: 'gap_assessment', label: '6. Gap/Result' },
                        { step: 'closed', label: '7. Closed' }
                      ].map((s, idx, arr) => {
                        const active = selectedIntake.step === s.step
                        const stepsOrder = arr.map(x => x.step)
                        const currentIdx = stepsOrder.indexOf(selectedIntake.step)
                        const myIdx = stepsOrder.indexOf(s.step)
                        const completed = myIdx < currentIdx

                        return (
                          <div key={s.step} className="flex-1 flex items-center gap-1">
                            <div className={`flex-1 p-2 rounded-lg border text-center text-[10px] font-bold ${
                              active ? 'bg-indigo-600/20 border-indigo-500 text-white animate-pulse-ring' :
                              completed ? 'bg-slate-900 border-emerald-500/20 text-emerald-400' :
                              'bg-slate-900/40 border-white/5 text-slate-500'
                            }`}>
                              {s.label}
                            </div>
                            {idx < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-700 shrink-0" />}
                          </div>
                        )
                      })}
                    </div>

                    {/* Mobile view stepper */}
                    <div className="flex md:hidden items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/5 mt-4">
                      <div>
                        <p className="text-[10px] text-indigo-400 uppercase font-bold">
                          Step {[
                            'registration', 'classification', 'control_mapping', 
                            'evidence_collection', 'compliance_assessment', 'gap_assessment', 'closed'
                          ].indexOf(selectedIntake.step) + 1} / 7
                        </p>
                        <p className="text-xs font-bold text-white mt-0.5">
                          {[
                            { step: 'registration', label: 'Intake' },
                            { step: 'classification', label: 'Classification' },
                            { step: 'control_mapping', label: 'Control Mapping' },
                            { step: 'evidence_collection', label: 'Evidence Collection' },
                            { step: 'compliance_assessment', label: 'Compliance Assessment' },
                            { step: 'gap_assessment', label: 'Gap Assessment' },
                            { step: 'closed', label: 'Closed' }
                          ].find(x => x.step === selectedIntake.step)?.label}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                        {Math.round((([
                          'registration', 'classification', 'control_mapping', 
                          'evidence_collection', 'compliance_assessment', 'gap_assessment', 'closed'
                        ].indexOf(selectedIntake.step) + 1) / 7) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* ACTIVE STEP CARD */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">Active Step Action</span>
                      <span className="text-[10px] text-slate-500">Source ID: {selectedIntake.id}</span>
                    </div>

                    {/* Step Content: registration */}
                    {selectedIntake.step === 'registration' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Incoming registration confirmation:</strong></p>
                        <div className="p-3 bg-black/10 rounded-lg text-xs space-y-1 text-slate-400">
                          <p><strong>Type:</strong> {selectedIntake.type.toUpperCase()}</p>
                          <p><strong>Title:</strong> {selectedIntake.title}</p>
                          <p><strong>Description:</strong> {selectedIntake.description}</p>
                        </div>
                        <button
                          onClick={() => handleProgressIntake('classification')}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Go to Classification
                        </button>
                      </div>
                    )}

                    {/* Step: classification */}
                    {selectedIntake.step === 'classification' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Determining classification and audit structure:</strong></p>
                        <div className="p-3 bg-black/10 rounded-lg text-xs space-y-1 text-slate-400">
                          <p><strong>System Classification:</strong> {selectedIntake.classification.toUpperCase()}</p>
                          <p><strong>Org ID:</strong> {selectedIntake.org_id}</p>
                        </div>
                        <button
                          onClick={() => handleProgressIntake('control_mapping')}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Go to Control Mapping
                        </button>
                      </div>
                    )}

                    {/* Step: control_mapping */}
                    {selectedIntake.step === 'control_mapping' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Select compliance controls to map:</strong></p>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {controls.map(c => {
                            const checked = intakeControlIds.includes(c.id)
                            return (
                              <label key={c.id} className="flex items-center gap-2 p-2 rounded bg-black/20 text-[11px] cursor-pointer border border-white/5">
                                <input
                                  type="checkbox" checked={checked}
                                  onChange={() => {
                                    if (checked) {
                                      setIntakeControlIds(prev => prev.filter(id => id !== c.id))
                                    } else {
                                      setIntakeControlIds(prev => [...prev, c.id])
                                    }
                                  }}
                                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                />
                                <span className="font-mono text-indigo-400 font-bold">{c.control_id}</span>
                                <span className="truncate text-slate-300">{c.title}</span>
                              </label>
                            )
                          })}
                        </div>
                        <button
                          onClick={() => handleProgressIntake('evidence_collection')}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Go to Evidence Collection
                        </button>
                      </div>
                    )}

                    {/* Step: evidence_collection */}
                    {selectedIntake.step === 'evidence_collection' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Enter evidence description for compliance:</strong></p>
                        <div className="space-y-2">
                          <input
                            type="text" placeholder="Evidence document URL (e.g., https://drive.google.com/...)"
                            value={intakeEvidenceUrl} onChange={e => setIntakeEvidenceUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                          />
                          <textarea
                            placeholder="Evidence note..."
                            value={intakeEvidenceNote} onChange={e => setIntakeEvidenceNote(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                            rows={2}
                          />
                        </div>
                        <button
                          onClick={() => handleProgressIntake('compliance_assessment')}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Start Compliance Assessment
                        </button>
                      </div>
                    )}

                    {/* Step: compliance_assessment */}
                    {selectedIntake.step === 'compliance_assessment' && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-300 font-semibold">Assess compliance based on provided evidence and control mapping:</p>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setIntakeIsCompliant(true)}
                            className={`flex-1 py-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                              intakeIsCompliant
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-white/5 text-slate-400'
                            }`}
                          >
                            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                            Fully Compliant
                          </button>
                          <button
                            onClick={() => setIntakeIsCompliant(false)}
                            className={`flex-1 py-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                              !intakeIsCompliant
                                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                                : 'border-white/5 text-slate-400'
                            }`}
                          >
                            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-400" />
                            Gap Identified
                          </button>
                        </div>
                        <button
                          onClick={() => handleProgressIntake('gap_assessment')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Go to Gap Assessment
                        </button>
                      </div>
                    )}

                    {/* Step: gap_assessment */}
                    {selectedIntake.step === 'gap_assessment' && (
                      <div className="space-y-4">
                        {!selectedIntake.gap_identified ? (
                          <div className="space-y-3">
                            <p className="text-xs text-slate-300"><strong>Compliance outcome:</strong> No gap identified. The system is fully compliant.</p>
                            <button
                              onClick={() => handleProgressIntake('closed')}
                              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                            >
                              Close Workflow (Compliant & Closed)
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-lg">
                              Non Compliance detected! Remediation action required.
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-400">Should a new Risk be registered in the Risk Register?</p>
                              <div className="flex gap-2 text-xs">
                                <button
                                  type="button" onClick={() => setIntakeGapRiskRequired(true)}
                                  className={`flex-1 py-2 rounded-xl border font-semibold cursor-pointer ${
                                    intakeGapRiskRequired ? 'border-indigo-500 text-white bg-indigo-500/5' : 'border-white/5 text-slate-400'
                                  }`}
                                >
                                  Yes (Create Risk)
                                </button>
                                <button
                                  type="button" onClick={() => setIntakeGapRiskRequired(false)}
                                  className={`flex-1 py-2 rounded-xl border font-semibold cursor-pointer ${
                                    !intakeGapRiskRequired ? 'border-indigo-500 text-white bg-indigo-500/5' : 'border-white/5 text-slate-400'
                                  }`}
                                >
                                  No (Create Issue Only)
                                </button>
                              </div>
                            </div>

                            {!intakeGapRiskRequired && (
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400">Issue Action Plan (Issue Management)</label>
                                <textarea
                                  placeholder="Steps to resolve the issue..."
                                  value={intakeIssuePlan} onChange={e => setIntakeIssuePlan(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                                  rows={2}
                                />
                              </div>
                            )}

                            <button
                              onClick={() => handleProgressIntake('closed')}
                              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                            >
                              Apply Actions & Close
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step: closed */}
                    {selectedIntake.step === 'closed' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-500/10 border border-white/5 text-xs text-slate-400 rounded-lg text-center font-semibold">
                          {selectedIntake.gap_identified
                            ? `Remediation completed. ${
                                selectedIntake.risk_created_id
                                  ? 'New risk created in the Risk Register.'
                                  : 'Issue action plan created.'
                              }`
                            : 'Step completed. The organization is fully compliant for this control.'}
                        </div>

                        {selectedIntake.risk_created_id && (
                          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
                              <div>
                                <p className="font-bold text-white">Created Risk Card</p>
                                <p className="text-[10px] text-indigo-300 font-mono mt-0.5">ID: {selectedIntake.risk_created_id}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedRiskId(selectedIntake.risk_created_id!)
                                setActiveTab('risk')
                                toast.success('New risk activated in the workflow!')
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              View Risk
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => handleProgressIntake('registration')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Reset & Start Over
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              ) : (
                <div className="text-center text-slate-500 py-24">
                  <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">No GRC Intake Record Selected</p>
                  <p className="text-xs text-slate-500 mt-1">Select a record from the left panel to simulate or start the workflow.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </>
  )
}
