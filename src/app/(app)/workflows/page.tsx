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

// Define English & Azerbaijani labels for Risk Workflow steps
interface StepInfo {
  id: string
  label: string
  desc: string
  phase: 'init' | 'assess' | 'review' | 'mitigate' | 'resolve'
}

const RISK_STEPS: StepInfo[] = [
  { id: 'identified', label: 'Risk Identified (Müəyyən Edildi)', desc: 'Yeni risk müəyyən edildi və qeydiyyat gözləyir.', phase: 'init' },
  { id: 'registered', label: 'Registration (Qeydiyyat)', desc: 'Risk təsvir edilib, sahibi və kateqoriyası təyin olunub.', phase: 'init' },
  { id: 'assessed_inherent', label: 'Inherent Assessment (Təbii Risk Qiymətləndirilməsi)', desc: 'Riskin hər hansı nəzarət tədbiri olmadan ehtimal və təsiri hesablanır.', phase: 'assess' },
  { id: 'control_mapped', label: 'Control Mapping (Nəzarət Eşlənməsi)', desc: 'Riski azaltmaq üçün müvafiq compliance nəzarətləri təyin olunur.', phase: 'assess' },
  { id: 'control_assessed', label: 'Control Effectiveness (Nəzarət Effektivliyi)', desc: 'Eşləşdirilmiş nəzarət mexanizmlərinin effektivliyi qiymətləndirilir.', phase: 'assess' },
  { id: 'assessed_residual', label: 'Residual Assessment (Qalıq Risk Qiymətləndirilməsi)', desc: 'Nəzarət mexanizmləri nəzərə alınmaqla qalıq risk hesablanır.', phase: 'assess' },
  { id: 'owner_review', label: 'Risk Owner Review (Risk Sahibinin Rəyi)', desc: 'Risk sahibi qiymətləndirmə nəticələrini və nəzarət tədbirlərini nəzərdən keçirir.', phase: 'review' },
  { id: 'mgt_review', label: '2nd Line Review (Risk Menecment Rəyi)', desc: 'Risk Menecment funksiyası (2-ci xətt) qiymətləndirməni təsdiqləyir.', phase: 'review' },
  { id: 'treatment_plan', label: 'Treatment Required (Tədbir Planı Tələbi)', desc: 'Qalıq risk iştah limitini keçdikdə müalicə planı tələb olunur.', phase: 'mitigate' },
  { id: 'action_plan', label: 'Action Plan Creation (Fəaliyyət Planının Qurulması)', desc: 'Riskin azaldılması üçün addım-addım fəaliyyət planı hazırlanır.', phase: 'mitigate' },
  { id: 'implementation', label: 'Implementation (İcra Mərhələsi)', desc: 'Müalicə planına uyğun tədbirlər həyata keçirilir.', phase: 'mitigate' },
  { id: 'validation', label: 'Validation (Sübut Yoxlanması)', desc: 'Tədbirlərin icra edildiyinə dair sübutlar yüklənir və təsdiq olunur.', phase: 'mitigate' },
  { id: 'residual_reassessment', label: 'Residual Reassessment (Qalıq Riskin Yenidən Hesablanması)', desc: 'Mitiqasiya addımlarından sonra qalıq risk səviyyəsi yenidən qiymətləndirilir.', phase: 'mitigate' },
  { id: 'accepted', label: 'Accept Risk & Monitor (Riskin Qəbulu və Monitorinq)', desc: 'Risk iştaha uyğundur, qəbul edilir və dövri monitorinqə yönləndirilir.', phase: 'resolve' },
  { id: 'escalated', label: 'Escalation (Eskalasiya və Komitə)', desc: 'Risk idarə edilə bilən səviyyədə deyil. Komitə və ya İdarə Heyətinə eskalasiya edilir.', phase: 'resolve' },
  { id: 'closed', label: 'Closed (Bağlı)', desc: 'Risk tamamilə aradan qaldırılıb və ya bağlanıb.', phase: 'resolve' }
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
    toast.success(`Risk statusu yeniləndi: ${RISK_STEPS.find(s => s.id === saved.workflow_step)?.label}`)
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
    toast.success('Yeni GRC Intake qeydiyyata alındı!')
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
            description: `Vahid GRC Intake (${selectedIntake.id}) üzərində təsbit edilmiş uyğunsuzluq boşluğu. Açıqlama: ${selectedIntake.description}`,
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
          toast.success('Sistemdə yeni Risk qeydiyyatdan keçirildi və Risk Reyestrinə əlavə olundu!')
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
          toast.success('Məsələ həlli planı (Issue Action Plan) qeydə alındı!')
        }
      }
    }

    const saved = await db.saveGRCIntakeItem({ ...selectedIntake, ...updates })
    setIntakeItems(prev => prev.map(i => i.id === saved.id ? saved : i))
    toast.success(`İntake mərhələsi yeniləndi: ${saved.step}`)
  }

  return (
    <>
      <TopNav title="İş Axınları (GRC Workflows)" subtitle="Risk Reyestri və Vahid GRC Giriş iş axınlarının vizual idarəedilməsi" />
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
              <span>Risk Reyestri İş Axını</span>
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
              <span>Vahid GRC Giriş İş Axını</span>
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
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">İş Axını Sxemi (Flowchart)</h3>
                  <p className="text-xs text-slate-400 mt-1">Seçilmiş riskin iş axınındakı mərhələsi və gedişat sxemi.</p>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Phase 1 */}
                    <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide border-b border-white/5 pb-1">Mərhələ 1: Giriş</p>
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
                              {step.label.split(' (')[0]}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Phase 2 */}
                    <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide border-b border-white/5 pb-1">Mərhələ 2: Qiymətləndirmə</p>
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
                              {step.label.split(' (')[0]}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Phase 3 */}
                    <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide border-b border-white/5 pb-1">Mərhələ 3: Razılaşma</p>
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
                              {step.label.split(' (')[0]}
                            </p>
                          </div>
                        )
                      })}
                      {/* Sub Appetite check representation */}
                      <div className="p-2.5 rounded-lg border border-dashed border-white/5 text-[10px] text-slate-500 bg-black/10">
                        <Info className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
                        Qalıq risk limit yoxlanışı (Limit: 8)
                      </div>
                    </div>

                    {/* Phase 4 & 5 */}
                    <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide border-b border-white/5 pb-1">Mərhələ 4: Yekun</p>
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
                              {step.label.split(' (')[0]}
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
                      <p className="font-bold text-slate-300">Riskin Cari Statusu: {RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.label}</p>
                      <p className="text-slate-400 mt-1">{RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.desc}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">Heç bir risk tapılmadı.</div>
              )}
            </div>

            {/* Right: Interactive Steps Action Panel */}
            <div className="card p-6 flex flex-col justify-between">
              {selectedRisk ? (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 uppercase">Aktiv Mərhələ</span>
                    <h4 className="text-base font-bold text-white mt-2">
                      {RISK_STEPS.find(s => s.id === selectedRisk.workflow_step)?.label.split(' (')[1]?.replace(')', '') || 'Qeydiyyat'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">İş axınında növbəti addıma keçmək üçün tələb olunan məlumatları doldurun.</p>
                  </div>

                  {/* STEP ACTIONS */}
                  <div className="space-y-4 pt-2">
                    
                    {/* Step: identified */}
                    {selectedRisk.workflow_step === 'identified' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300 font-medium">Risk ilkin olaraq müəyyən olunub. Qeydiyyat mərhələsinə keçin.</p>
                        <button
                          onClick={() => handleProgressRisk('registered')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Qeydiyyatı Başlat
                        </button>
                      </div>
                    )}

                    {/* Step: registered */}
                    {selectedRisk.workflow_step === 'registered' && (
                      <div className="space-y-3">
                        <div className="text-xs space-y-1 text-slate-400">
                          <p><strong>Başlıq:</strong> {selectedRisk.title}</p>
                          <p><strong>Kateqoriya:</strong> {selectedRisk.category}</p>
                          <p><strong>Sahibi:</strong> {selectedRisk.owner_name || 'Təyin olunmayıb'}</p>
                        </div>
                        <button
                          onClick={() => handleProgressRisk('assessed_inherent')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          İlkin Qiymətləndirməyə Keç
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: assessed_inherent */}
                    {selectedRisk.workflow_step === 'assessed_inherent' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Likelihood (Ehtimal): {inhLikelihood}</span>
                            <span className="text-[10px] text-slate-500">1 - Çox Aşağı, 5 - Çox Yüksək</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={inhLikelihood}
                            onChange={(e) => setInhLikelihood(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Impact (Təsir): {inhImpact}</span>
                            <span className="text-[10px] text-slate-500">1 - Cüzi, 5 - Fəlakətli</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={inhImpact}
                            onChange={(e) => setInhImpact(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="p-3 bg-black/10 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">İlkin Risk Skoru:</span>
                          <span className="font-black text-lg text-rose-500">{inhLikelihood * inhImpact} / 25</span>
                        </div>
                        <button
                          onClick={() => handleProgressRisk('control_mapped')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Nəzarət Eşləşməsinə Keç
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: control_mapped */}
                    {selectedRisk.workflow_step === 'control_mapped' && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400">Mövcud Compliance Nəzarət Mexanizmləri</label>
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
                          Effektivliyin Qiymətləndirilməsinə Keç
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: control_assessed */}
                    {selectedRisk.workflow_step === 'control_assessed' && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400">Nəzarət Mexanizmlərinin Effektivliyi</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'effective', label: 'Effektiv', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                            { value: 'partially_effective', label: 'Qismən', color: 'border-amber-500/20 text-amber-400 bg-amber-500/5' },
                            { value: 'ineffective', label: 'Effektiv deyil', color: 'border-rose-500/20 text-rose-400 bg-rose-500/5' }
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
                          Qalıq Riskin Qiymətləndirilməsinə Keç
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: assessed_residual */}
                    {selectedRisk.workflow_step === 'assessed_residual' && (
                      <div className="space-y-4">
                        <p className="text-[10px] text-indigo-400">İlkin Risk Skoru: {selectedRisk.inherent_likelihood! * selectedRisk.inherent_impact!} (Likelihood {selectedRisk.inherent_likelihood} × Impact {selectedRisk.inherent_impact})</p>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Qalıq Likelihood: {resLikelihood}</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={resLikelihood}
                            onChange={(e) => setResLikelihood(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Qalıq Impact: {resImpact}</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={resImpact}
                            onChange={(e) => setResImpact(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="p-3 bg-black/10 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">Qalıq Risk Skoru:</span>
                          <span className="font-black text-lg text-amber-500">{resLikelihood * resImpact} / 25</span>
                        </div>
                        <button
                          onClick={() => handleProgressRisk('owner_review')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Risk Sahibinin Rəyinə Göndər
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: owner_review */}
                    {selectedRisk.workflow_step === 'owner_review' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Risk Sahibi:</strong> {selectedRisk.owner_name || 'Rəhbərlik'}</p>
                        <p className="text-xs text-slate-400 italic">"Bu qiymətləndirmə real vəziyyəti əks etdirir və təklif edilən nəzarət mexanizmləri uyğundur."</p>
                        <button
                          onClick={() => handleProgressRisk('mgt_review')}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Təsdiqlə (Approve)
                        </button>
                      </div>
                    )}

                    {/* Step: mgt_review */}
                    {selectedRisk.workflow_step === 'mgt_review' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>2-ci Xətt Review:</strong> Risk Menecment şöbəsinin təsdiqi.</p>
                        <button
                          onClick={() => handleProgressRisk('appetite_check')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          2-ci Xətt Təsdiqi və Limit Yoxlanışı
                        </button>
                      </div>
                    )}

                    {/* Step: treatment_plan */}
                    {selectedRisk.workflow_step === 'treatment_plan' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-lg">
                          <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                          Qalıq Risk ({selectedRisk.residual_likelihood! * selectedRisk.residual_impact!}) Risk İştahası Limitindən (8) yüksəkdir! Müalicə planı mütləqdir.
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Müalicə Strategiyası (Treatment Plan)</label>
                          <textarea
                            placeholder="Riskin azaldılması üzrə müalicə strategiyasını təsvir edin..."
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
                          Fəaliyyət Planına Keç
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: action_plan */}
                    {selectedRisk.workflow_step === 'action_plan' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Konkret Fəaliyyət Planı və Tapşırıqlar</label>
                          <textarea
                            placeholder="Görüləcək tədbirlər, məsul şəxslər və son icra tarixləri..."
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
                          İcra Mərhələsinə Göndər
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Step: implementation */}
                    {selectedRisk.workflow_step === 'implementation' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Fəaliyyət Planı İcra Olunur:</strong></p>
                        <p className="text-xs text-slate-400 p-2.5 bg-black/10 rounded-lg">{selectedRisk.action_plan}</p>
                        <button
                          onClick={() => handleProgressRisk('validation')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Tədbirlərin İcrasını Tamamla & Sübut Yüklə
                        </button>
                      </div>
                    )}

                    {/* Step: validation */}
                    {selectedRisk.workflow_step === 'validation' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">İcra Sübutu (Evidence Note / File link)</label>
                          <textarea
                            placeholder="Məsələn, konfiqurasiya dəyişikliyinin skrinşotu, hesabat linki..."
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
                          Riskin Yenidən Qiymətləndirilməsi
                        </button>
                      </div>
                    )}

                    {/* Step: residual_reassessment */}
                    {selectedRisk.workflow_step === 'residual_reassessment' && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-300 font-semibold">Tədbirlərdən sonra yeni Qalıq Risk dəyərlərini daxil edin:</p>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Yeni Qalıq Likelihood: {resLikelihood}</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={resLikelihood}
                            onChange={(e) => setResLikelihood(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 flex justify-between">
                            <span>Yeni Qalıq Impact: {resImpact}</span>
                          </label>
                          <input
                            type="range" min="1" max="5" value={resImpact}
                            onChange={(e) => setResImpact(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="p-3 bg-black/10 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">Yeni Qalıq Risk Skoru:</span>
                          <span className="font-black text-lg text-emerald-500">{resLikelihood * resImpact} / 25</span>
                        </div>
                        <button
                          onClick={() => handleProgressRisk('verify_reassessment')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Limit Uyğunluğunu Yoxla
                        </button>
                      </div>
                    )}

                    {/* Step: accepted */}
                    {selectedRisk.workflow_step === 'accepted' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-lg">
                          <CheckCircle className="w-4 h-4 inline mr-1.5" />
                          Risk məqbul səviyyədədir və monitorinqdədir.
                        </div>
                        <button
                          onClick={() => handleProgressRisk('closed')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Riski Bağla (Close)
                        </button>
                      </div>
                    )}

                    {/* Step: escalated */}
                    {selectedRisk.workflow_step === 'escalated' && (
                      <div className="space-y-4">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">
                          <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                          Risk səviyyəsi yenə də limitdən yüksəkdir! Komitə və İdarə Heyəti (Board) səviyyəsində qərar tələb olunur.
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">İdarə Heyətinin Qərarı (Executive Decision)</label>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            {[
                              { value: 'accept', label: 'Riski Qəbul Et' },
                              { value: 'mitigate', label: 'Əlavə Tədbir Gör' },
                              { value: 'transfer', label: 'Riski Ötür (Sığorta)' },
                              { value: 'avoid', label: 'Riskdən Qaçın (Dayandır)' }
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
                          Qərarı Tətbiq Et və Bağla
                        </button>
                      </div>
                    )}

                    {/* Step: closed */}
                    {selectedRisk.workflow_step === 'closed' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-500/10 border border-white/5 text-xs text-slate-400 rounded-lg text-center font-semibold">
                          Fayl Bağlanıb. Risk fəaliyyəti tamamlanmışdır.
                        </div>
                        <button
                          onClick={() => handleProgressRisk('identified')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Yenidən Aktiv Et
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-12">Detalları görmək üçün risk seçin.</div>
              )}

              {/* Reset State Button */}
              {selectedRisk && (
                <button
                  onClick={() => handleProgressRisk('identified')}
                  className="mt-6 text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider text-center cursor-pointer"
                >
                  İş axınını sıfırla (Reset)
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
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">GRC Giriş Qeydləri</h3>
                  <p className="text-xs text-slate-400 mt-1">İlkin daxil olmuş tələb, audit tapıntıları və insidentlər.</p>
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
                    <p className="text-xs font-bold text-indigo-400">Yeni GRC Qeydi</p>
                    <button type="button" onClick={() => setShowCreateIntake(false)} className="text-[10px] text-slate-500 hover:text-slate-400">Ləğv et</button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">Başlıq</label>
                    <input
                      type="text" required placeholder="Məsələn: Zəif şifrə siyasəti..."
                      value={intakeTitle} onChange={e => setIntakeTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">Təsvir</label>
                    <textarea
                      placeholder="Ətraflı məlumat daxil edin..."
                      value={intakeDesc} onChange={e => setIntakeDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Növü</label>
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
                      <label className="text-[10px] font-semibold text-slate-400">Təsnifat</label>
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
                    Qeyd et
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
                          <span>Mərhələ: <strong>{item.step}</strong></span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-slate-500 py-12 text-xs">GRC girişi üçün hələ qeyd yaradılmayıb. Sağ üst küncdəki düymədən əlavə edin.</div>
                )}
              </div>
            </div>

            {/* Right: GRC Intake Process Steps Stepper */}
            <div className="lg:col-span-2 card p-6 space-y-6">
              {selectedIntake ? (
                <div className="space-y-6">
                  
                  {/* Visual Intake Stepper Progress */}
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Giriş və Uyğunluq Qiymətləndirilməsi Mərhələləri</h3>
                    <div className="flex items-center gap-1 mt-4">
                      {[
                        { step: 'registration', label: '1. Giriş' },
                        { step: 'classification', label: '2. Təsnifat' },
                        { step: 'control_mapping', label: '3. Nəzarət Eşlənməsi' },
                        { step: 'evidence_collection', label: '4. Sübut' },
                        { step: 'compliance_assessment', label: '5. Qiymətləndirmə' },
                        { step: 'gap_assessment', label: '6. Boşluq/Nəticə' },
                        { step: 'closed', label: '7. Bağlı' }
                      ].map((s, idx, arr) => {
                        const active = selectedIntake.step === s.step
                        // check if completed
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
                  </div>

                  {/* ACTIVE STEP CARD */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">Cari Addım Fəaliyyəti</span>
                      <span className="text-[10px] text-slate-500">Mənbə ID: {selectedIntake.id}</span>
                    </div>

                    {/* Step Content: registration */}
                    {selectedIntake.step === 'registration' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Daxil olan qeydiyyat təsdiqi:</strong></p>
                        <div className="p-3 bg-black/10 rounded-lg text-xs space-y-1 text-slate-400">
                          <p><strong>Növ:</strong> {selectedIntake.type.toUpperCase()}</p>
                          <p><strong>Başlıq:</strong> {selectedIntake.title}</p>
                          <p><strong>Təsvir:</strong> {selectedIntake.description}</p>
                        </div>
                        <button
                          onClick={() => handleProgressIntake('classification')}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Təsnifat Mərhələsinə Keç
                        </button>
                      </div>
                    )}

                    {/* Step: classification */}
                    {selectedIntake.step === 'classification' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Klassifikasiya və Audit strukturu müəyyən edilir:</strong></p>
                        <div className="p-3 bg-black/10 rounded-lg text-xs space-y-1 text-slate-400">
                          <p><strong>Sistem Təsnifatı:</strong> {selectedIntake.classification.toUpperCase()}</p>
                          <p><strong>Org ID:</strong> {selectedIntake.org_id}</p>
                        </div>
                        <button
                          onClick={() => handleProgressIntake('control_mapping')}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Nəzarət Mexanizmi Eşlənməsinə Keç
                        </button>
                      </div>
                    )}

                    {/* Step: control_mapping */}
                    {selectedIntake.step === 'control_mapping' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Uyğunluq nəzarət bəndlərini seçin:</strong></p>
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
                          Sübutların Toplanmasına Keç
                        </button>
                      </div>
                    )}

                    {/* Step: evidence_collection */}
                    {selectedIntake.step === 'evidence_collection' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300"><strong>Uyğunluq üçün sübut təsvirini daxil edin:</strong></p>
                        <div className="space-y-2">
                          <input
                            type="text" placeholder="Sübut sənəd URL-i (məs: https://drive.google.com/...)"
                            value={intakeEvidenceUrl} onChange={e => setIntakeEvidenceUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                          />
                          <textarea
                            placeholder="Sübut haqqında qeyd..."
                            value={intakeEvidenceNote} onChange={e => setIntakeEvidenceNote(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-black/20 border border-white/10 text-white outline-none focus:border-indigo-500"
                            rows={2}
                          />
                        </div>
                        <button
                          onClick={() => handleProgressIntake('compliance_assessment')}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Uyğunluq Qiymətləndirilməsinə Başla
                        </button>
                      </div>
                    )}

                    {/* Step: compliance_assessment */}
                    {selectedIntake.step === 'compliance_assessment' && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-300 font-semibold">Təqdim olunmuş sübutlar və nəzarət eşlənməsi əsasında uyğunluq rəyi verin:</p>
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
                            Tam Uyğundur (Compliant)
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
                            Boşluq var (Gap Identified)
                          </button>
                        </div>
                        <button
                          onClick={() => handleProgressIntake('gap_assessment')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Boşluq Təsbit Mərhələsinə Keç
                        </button>
                      </div>
                    )}

                    {/* Step: gap_assessment */}
                    {selectedIntake.step === 'gap_assessment' && (
                      <div className="space-y-4">
                        {!selectedIntake.gap_identified ? (
                          <div className="space-y-3">
                            <p className="text-xs text-slate-300"><strong>Uyğunluq nəticəsi:</strong> Boşluq (Gap) təsbit edilmədi. Sistem tam uyğundur.</p>
                            <button
                              onClick={() => handleProgressIntake('closed')}
                              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                            >
                              İş axınını bağla (Compliant & Closed)
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-lg">
                              Uyğunsuzluq (Gap) aşkar edilmişdir! Tənzimləyici addım tələb olunur.
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-400">Risk reyestrində yeni Risk təbəqəsi yaradılsın?</p>
                              <div className="flex gap-2 text-xs">
                                <button
                                  type="button" onClick={() => setIntakeGapRiskRequired(true)}
                                  className={`flex-1 py-2 rounded-xl border font-semibold cursor-pointer ${
                                    intakeGapRiskRequired ? 'border-indigo-500 text-white bg-indigo-500/5' : 'border-white/5 text-slate-400'
                                  }`}
                                >
                                  Bəli (Risk Yaradılsın)
                                </button>
                                <button
                                  type="button" onClick={() => setIntakeGapRiskRequired(false)}
                                  className={`flex-1 py-2 rounded-xl border font-semibold cursor-pointer ${
                                    !intakeGapRiskRequired ? 'border-indigo-500 text-white bg-indigo-500/5' : 'border-white/5 text-slate-400'
                                  }`}
                                >
                                  Xeyr (Yalnız Məsələ Yaradılsın)
                                </button>
                              </div>
                            </div>

                            {!intakeGapRiskRequired && (
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400">Məsələ Üzrə Fəaliyyət Planı (Issue Management)</label>
                                <textarea
                                  placeholder="Məsələni həll etmək üçün addımlar..."
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
                              Tənzimləməni İcra Et və Bağla (Resolve & Close)
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
                            ? `Tənzimləmə tamamlanıb. ${
                                selectedIntake.risk_created_id
                                  ? 'Risk Reyestrində yeni risk yaradıldı.'
                                  : 'Məsələ planı yaradıldı.'
                              }`
                            : 'Mərhələ tamamlanmışdır. Müəssisə bu bənd üzrə tam uyğundur.'}
                        </div>

                        {selectedIntake.risk_created_id && (
                          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
                              <div>
                                <p className="font-bold text-white">Yaradılmış Risk Kartı</p>
                                <p className="text-[10px] text-indigo-300 font-mono mt-0.5">ID: {selectedIntake.risk_created_id}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedRiskId(selectedIntake.risk_created_id!)
                                setActiveTab('risk')
                                toast.success('İş axınında yeni risk aktivləşdirildi!')
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              Riski Gör
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => handleProgressIntake('registration')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Sıfırla və Yenidən Başlat
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              ) : (
                <div className="text-center text-slate-500 py-24">
                  <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">Heç bir GRC Giriş qeydi seçilməyib</p>
                  <p className="text-xs text-slate-500 mt-1">İş axınını başlatmaq və ya simulyasiya etmək üçün sol paneldən bir qeyd seçin.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </>
  )
}
