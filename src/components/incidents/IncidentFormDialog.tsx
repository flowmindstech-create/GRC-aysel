'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { Incident, IncidentWorkflowStage, IncidentPriority } from '@/types'
import { MOCK_USERS } from '@/lib/seed-data'
import { cn } from '@/lib/utils'
import { IncidentWorkflowStepper } from './IncidentWorkflowStepper'
import { IncidentIntakeForm } from './IncidentIntakeForm'
import { IncidentInvestigationForm } from './IncidentInvestigationForm'
import { IncidentResolutionForm } from './IncidentResolutionForm'

interface Props {
  incident: Incident | null
  onClose: () => void
  onSave: (i: Incident) => void
}

function generateIncidentId() {
  return `i-${Date.now()}`
}

const STAGES: IncidentWorkflowStage[] = ['intake', 'investigation', 'resolution']

export function IncidentFormDialog({ incident, onClose, onSave }: Props) {
  const isEdit = !!incident
  
  // Track active step: 0 for intake, 1 for investigation, 2 for resolution
  const [activeStep, setActiveStep] = useState<number>(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  // Initialize form data
  const [formData, setFormData] = useState<Partial<Incident>>({
    severity: 'medium',
    status: 'open',
    workflow_stage: 'intake',
    likelihood: 3,
    impact: 3,
    priority: 'P3_medium',
    attached_files: [],
    corrective_actions: [],
    affected_systems: [],
    affected_departments: [],
  })

  useEffect(() => {
    if (incident) {
      setFormData(incident)
      const stageIdx = STAGES.indexOf(incident.workflow_stage || 'intake')
      setActiveStep(stageIdx >= 0 ? stageIdx : 0)
      
      // Determine completed steps based on fields filled
      const completed: number[] = []
      if (incident.title && incident.description) {
        completed.push(0)
      }
      if (incident.root_cause || incident.investigation_notes || incident.investigation_lead) {
        completed.push(1)
      }
      if (incident.resolution_summary || (incident.corrective_actions && incident.corrective_actions.length > 0)) {
        completed.push(2)
      }
      setCompletedSteps(completed)
    } else {
      // Set defaults for new incident
      setFormData({
        severity: 'medium',
        status: 'open',
        workflow_stage: 'intake',
        likelihood: 3,
        impact: 3,
        priority: 'P3_medium',
        reporter_name: 'Ali Hasanov',
        reporter_email: 'ali@acmecorp.az',
        reporter_structure: 'Korporativ xidmətlər departamenti',
        discovery_datetime: new Date().toISOString(),
        attached_files: [],
        corrective_actions: [],
        affected_systems: [],
        affected_departments: [],
      })
    }
  }, [incident])

  // Track field changes
  const handleDataChange = (updated: Partial<Incident>) => {
    setFormData(prev => ({ ...prev, ...updated }))
  }

  // Basic validation per step
  const validateStep = (step: number): boolean => {
    if (step === 0) {
      return !!(formData.title?.trim() && formData.description?.trim())
    }
    if (step === 2) {
      // If status is set to done/closed, require resolution summary
      if (formData.status === 'done' || formData.status === 'closed') {
        return !!formData.resolution_summary?.trim()
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep(activeStep)) {
      alert('Zəhmət olmasa tələb olunan sahələri doldurun!')
      return
    }
    
    // Add active step to completed steps
    if (!completedSteps.includes(activeStep)) {
      setCompletedSteps(prev => [...prev, activeStep])
    }

    const nextStep = activeStep + 1
    if (nextStep < STAGES.length) {
      setActiveStep(nextStep)
      // Update workflow stage field dynamically
      handleDataChange({ workflow_stage: STAGES[nextStep] })
    }
  }

  const handleBack = () => {
    const prevStep = activeStep - 1
    if (prevStep >= 0) {
      setActiveStep(prevStep)
      handleDataChange({ workflow_stage: STAGES[prevStep] })
    }
  }

  const handleStepClick = (stepIdx: number) => {
    // Check validation of current step before jumping
    if (stepIdx > activeStep && !validateStep(activeStep)) {
      alert('Zəhmət olmasa tələb olunan sahələri doldurun!')
      return
    }
    setActiveStep(stepIdx)
    handleDataChange({ workflow_stage: STAGES[stepIdx] })
  }

  const handleSaveDraft = () => {
    // To save as draft, we only require title (minimum summary)
    if (!formData.title?.trim()) {
      alert('Zəhmət olmasa ən azı qısa təsvir (Summary) daxil edin!')
      return
    }

    const investigator = MOCK_USERS.find(u => u.id === formData.assigned_to)
    const saved: Incident = {
      id: incident?.id ?? generateIncidentId(),
      org_id: incident?.org_id ?? 'org1',
      title: formData.title || '',
      description: formData.description || '',
      severity: formData.severity || 'medium',
      status: formData.status || 'open',
      workflow_stage: STAGES[activeStep],
      ...formData,
      assigned_name: investigator?.full_name || formData.assigned_name,
      created_at: incident?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Incident

    onSave(saved)
  }

  const handleComplete = () => {
    if (!validateStep(activeStep)) {
      alert('Zəhmət olmasa tələb olunan sahələri doldurun!')
      return
    }

    const investigator = MOCK_USERS.find(u => u.id === formData.assigned_to)
    
    // Automatically advance to 'done' if completed in step 2 (unless already further)
    let finalStatus = formData.status || 'open'
    if (activeStep === 2 && finalStatus === 'open') {
      finalStatus = 'done'
    }

    const saved: Incident = {
      id: incident?.id ?? generateIncidentId(),
      org_id: incident?.org_id ?? 'org1',
      title: formData.title || '',
      description: formData.description || '',
      severity: formData.severity || 'medium',
      status: finalStatus,
      workflow_stage: STAGES[activeStep],
      ...formData,
      assigned_name: investigator?.full_name || formData.assigned_name,
      created_at: incident?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Incident

    onSave(saved)
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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                {isEdit ? 'Edit Incident' : 'Report Incident'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                ID: {formData.id || 'Yeni'} • Status: <span className="capitalize">{formData.status}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
            </button>
          </div>

          {/* Stepper container */}
          <div className="px-6 pt-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--muted)/10' }}>
            <IncidentWorkflowStepper
              currentStep={activeStep}
              onStepChange={handleStepClick}
              completedSteps={completedSteps}
            />
          </div>

          {/* Form Scrollable Area */}
          <div className="overflow-y-auto flex-1 p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeStep === 0 && (
                  <IncidentIntakeForm data={formData} onChange={handleDataChange} />
                )}
                {activeStep === 1 && (
                  <IncidentInvestigationForm data={formData} onChange={handleDataChange} />
                )}
                {activeStep === 2 && (
                  <IncidentResolutionForm data={formData} onChange={handleDataChange} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            {/* Left action */}
            <div className="flex gap-2">
              {activeStep > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Geri
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--muted-fg)' }}
                >
                  Ləğv et
                </button>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                <Save className="w-3.5 h-3.5" /> Qaralama Yadda Saxla
              </button>

              {activeStep < 2 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
                >
                  Davam et <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" /> Tamamla və Saxla
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
