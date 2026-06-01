'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { dbExt } from '@/lib/db-extensions'
import type { AuditFindingWorkflow, AuditFindingWorkflowStep, ControlFramework } from '@/types'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Circle, CircleDot, ArrowLeft,
  AlertTriangle, ChevronRight, Save, GitBranch,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Step configuration ────────────────────────────────────────────────────────

const STEP_META: Record<AuditFindingWorkflowStep, { label: string; phase: string; decision?: boolean; terminal?: boolean }> = {
  registration:                 { label: 'Registration',            phase: 'Intake' },
  classification:               { label: 'Classification',          phase: 'Intake' },
  severity_assessment:          { label: 'Severity Assessment',     phase: 'Intake', decision: true },
  immediate_correction:         { label: 'Immediate Correction',    phase: 'Fast Track' },
  verification:                 { label: 'Verification',            phase: 'Fast Track' },
  investigation:                { label: 'Investigation',           phase: 'Investigation' },
  evidence_review:              { label: 'Evidence Review',         phase: 'Investigation' },
  root_cause_analysis:          { label: 'Root Cause Analysis',     phase: 'Investigation' },
  compliance_impact_assessment: { label: 'Compliance Impact',       phase: 'Assessment' },
  corrective_action_gate:       { label: 'Corrective Action Gate',  phase: 'Assessment', decision: true },
  action_plan:                  { label: 'Action Plan',             phase: 'Treatment' },
  implementation:               { label: 'Implementation',          phase: 'Treatment' },
  validation:                   { label: 'Validation',              phase: 'Treatment' },
  risk_creation_gate:           { label: 'Risk Creation Gate',      phase: 'Treatment', decision: true },
  closure:                      { label: 'Closed',                  phase: 'Closed', terminal: true },
}

function getRelevantSteps(wf: AuditFindingWorkflow): AuditFindingWorkflowStep[] {
  const base: AuditFindingWorkflowStep[] = ['registration', 'classification', 'severity_assessment']

  if (wf.immediate_correction_required) {
    base.push('immediate_correction', 'verification')
  } else {
    base.push('investigation', 'evidence_review', 'root_cause_analysis')
  }

  base.push('compliance_impact_assessment', 'corrective_action_gate')

  if (wf.corrective_action_required) {
    base.push('action_plan', 'implementation', 'validation', 'risk_creation_gate')
  }

  base.push('closure')
  return base
}

function getNextStep(wf: AuditFindingWorkflow): AuditFindingWorkflowStep | null {
  const steps  = getRelevantSteps(wf)
  const idx    = steps.indexOf(wf.step)
  return idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null
}

function canAdvance(wf: AuditFindingWorkflow): { ok: boolean; reason?: string } {
  const { step } = wf
  if (step === 'severity_assessment' && !wf.priority)
    return { ok: false, reason: 'Priority seçilməlidir.' }
  if (step === 'immediate_correction' && !wf.immediate_correction_note?.trim())
    return { ok: false, reason: 'Düzəliş qeydi tələb olunur.' }
  if (step === 'verification' && !wf.verification_note?.trim())
    return { ok: false, reason: 'Yoxlama qeydi tələb olunur.' }
  if (step === 'root_cause_analysis' && !wf.root_cause?.trim())
    return { ok: false, reason: 'Kök səbəb tələb olunur.' }
  if (step === 'action_plan' && !wf.action_plan?.trim())
    return { ok: false, reason: 'Fəaliyyət planı tələb olunur.' }
  if (step === 'validation' && !wf.validation_note?.trim())
    return { ok: false, reason: 'Yoxlama qeydi tələb olunur.' }
  return { ok: true }
}

// ── Step Panel ────────────────────────────────────────────────────────────────

function StepPanel({ wf, onChange }: { wf: AuditFindingWorkflow; onChange: (p: Partial<AuditFindingWorkflow>) => void }) {
  const txt = (label: string, val: string, key: keyof AuditFindingWorkflow, ph = '') => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>{label}</label>
      <textarea
        value={val ?? ''}
        onChange={e => onChange({ [key]: e.target.value } as any)}
        placeholder={ph}
        rows={3}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )

  const inp = (label: string, val: string, key: keyof AuditFindingWorkflow, ph = '') => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>{label}</label>
      <input
        value={val ?? ''}
        onChange={e => onChange({ [key]: e.target.value } as any)}
        placeholder={ph}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )

  const { step } = wf

  if (step === 'registration') return (
    <div className="space-y-4">
      <InfoRow label="Finding" value={wf.finding_title ?? '—'} />
      {wf.finding_severity && <InfoRow label="Severity" value={wf.finding_severity} />}
      {wf.finding_recommendation && <InfoRow label="Recommendation" value={wf.finding_recommendation} />}
      <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)', color: 'var(--brand-500)' }}>
        Review the finding details and advance to Classification.
      </p>
    </div>
  )

  if (step === 'classification') return (
    <div className="space-y-4">
      {inp('Classification', wf.classification ?? '', 'classification', 'e.g. Process / Control Design / Compliance')}
    </div>
  )

  if (step === 'severity_assessment') return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-fg)' }}>Priority *</label>
        <div className="grid grid-cols-4 gap-2">
          {(['critical','high','medium','low'] as const).map(p => {
            const colors = { critical: '#e11d48', high: '#ea580c', medium: '#d97706', low: '#059669' }
            return (
              <button key={p}
                onClick={() => onChange({ priority: p })}
                className="py-2 rounded-lg text-xs font-semibold capitalize border transition-all"
                style={{
                  background: wf.priority === p ? `rgba(${p === 'critical' ? '225,29,72' : p === 'high' ? '234,88,12' : p === 'medium' ? '217,119,6' : '5,150,105'},0.15)` : 'var(--muted)',
                  borderColor: wf.priority === p ? colors[p] : 'var(--border)',
                  color: wf.priority === p ? colors[p] : 'var(--muted-fg)',
                }}
              >
                {p}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-fg)' }}>Immediate Correction Required?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: true,  label: 'Yes — Urgent',  color: '#e11d48', bg: 'rgba(225,29,72,0.1)' },
            { v: false, label: 'No — Investigate', color: 'var(--muted-fg)', bg: 'var(--muted)' },
          ].map(o => (
            <button key={String(o.v)}
              onClick={() => onChange({ immediate_correction_required: o.v })}
              className="p-3 rounded-xl border text-sm font-medium transition-all"
              style={{
                background: wf.immediate_correction_required === o.v ? o.bg : 'var(--muted)',
                borderColor: wf.immediate_correction_required === o.v ? o.color : 'var(--border)',
                color: wf.immediate_correction_required === o.v ? o.color : 'var(--muted-fg)',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (step === 'immediate_correction') return (
    <div className="space-y-4">
      <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(225,29,72,0.08)', color: '#e11d48' }}>
        Urgent — apply immediate corrective action before investigation.
      </p>
      {txt('Correction Action *', wf.immediate_correction_note ?? '', 'immediate_correction_note', 'Describe the immediate correction applied…')}
    </div>
  )

  if (step === 'verification') return (
    <div className="space-y-4">
      {txt('Verification Note *', wf.verification_note ?? '', 'verification_note', 'Confirm the correction has been applied and verified…')}
      {inp('Verified By', wf.verified_by ?? '', 'verified_by', 'Verifier name')}
    </div>
  )

  if (step === 'investigation') return (
    <div className="space-y-4">
      {txt('Investigation Notes', wf.investigation_note ?? '', 'investigation_note', 'Document the investigation findings…')}
    </div>
  )

  if (step === 'evidence_review') return (
    <div className="space-y-4">
      {txt('Evidence Review Note', wf.evidence_review_note ?? '', 'evidence_review_note', 'Summarise the evidence reviewed…')}
      {inp('Evidence URL', wf.evidence_url ?? '', 'evidence_url', 'https://…')}
    </div>
  )

  if (step === 'root_cause_analysis') return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-fg)' }}>Root Cause Category</label>
        <div className="grid grid-cols-2 gap-2">
          {(['process','technology','people','external'] as const).map(c => (
            <button key={c}
              onClick={() => onChange({ root_cause_category: c })}
              className="py-2 rounded-lg text-xs font-medium capitalize border transition-all"
              style={{
                background: wf.root_cause_category === c ? 'rgba(14,165,233,0.1)' : 'var(--muted)',
                borderColor: wf.root_cause_category === c ? 'rgba(14,165,233,0.4)' : 'var(--border)',
                color: wf.root_cause_category === c ? 'var(--brand-500)' : 'var(--muted-fg)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {txt('Root Cause Description *', wf.root_cause ?? '', 'root_cause', 'Describe the underlying root cause…')}
    </div>
  )

  if (step === 'compliance_impact_assessment') return (
    <div className="space-y-4">
      {txt('Compliance Impact Note', wf.compliance_impact_note ?? '', 'compliance_impact_note', 'Describe impact on regulatory frameworks…')}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Affected Frameworks</label>
        <div className="flex flex-wrap gap-2">
          {(['iso27001','soc2','gdpr','pci_dss'] as ControlFramework[]).map(fw => {
            const active = (wf.compliance_frameworks_affected ?? []).includes(fw)
            return (
              <button key={fw}
                onClick={() => {
                  const cur = wf.compliance_frameworks_affected ?? []
                  onChange({ compliance_frameworks_affected: active ? cur.filter(f => f !== fw) : [...cur, fw] })
                }}
                className="px-3 py-1 rounded-full text-xs font-medium border transition-all uppercase"
                style={{
                  background: active ? 'rgba(14,165,233,0.15)' : 'var(--muted)',
                  borderColor: active ? 'rgba(14,165,233,0.4)' : 'var(--border)',
                  color: active ? 'var(--brand-500)' : 'var(--muted-fg)',
                }}
              >
                {fw}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (step === 'corrective_action_gate') return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Is a corrective action plan required to close this finding?</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { v: true,  label: 'Yes — Action Plan Required', color: '#ea580c', bg: 'rgba(234,88,12,0.1)' },
          { v: false, label: 'No — Close Finding',          color: '#059669', bg: 'rgba(5,150,105,0.1)' },
        ].map(o => (
          <button key={String(o.v)}
            onClick={() => onChange({ corrective_action_required: o.v })}
            className="p-3 rounded-xl border text-sm font-medium text-left transition-all"
            style={{
              background: wf.corrective_action_required === o.v ? o.bg : 'var(--muted)',
              borderColor: wf.corrective_action_required === o.v ? o.color : 'var(--border)',
              color: wf.corrective_action_required === o.v ? o.color : 'var(--muted-fg)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )

  if (step === 'action_plan') return (
    <div className="space-y-4">
      {txt('Action Plan *', wf.action_plan ?? '', 'action_plan', 'Detail the corrective actions to be taken…')}
      {inp('Assigned To', wf.assigned_to ?? '', 'assigned_to', 'Responsible person')}
      {inp('Due Date', wf.due_date ?? '', 'due_date', 'YYYY-MM-DD')}
    </div>
  )

  if (step === 'implementation') return (
    <div className="space-y-4">
      {txt('Implementation Note', wf.implementation_note ?? '', 'implementation_note', 'Describe actions taken…')}
      {inp('Evidence URL', wf.implementation_evidence_url ?? '', 'implementation_evidence_url', 'https://…')}
    </div>
  )

  if (step === 'validation') return (
    <div className="space-y-4">
      {txt('Validation Note *', wf.validation_note ?? '', 'validation_note', 'Confirm corrective actions were completed and effective…')}
      {inp('Validated By', wf.validated_by ?? '', 'validated_by', 'Validator name')}
    </div>
  )

  if (step === 'risk_creation_gate') return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Should this finding be escalated to a Risk Register entry?</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { v: true,  label: 'Yes — Create Risk',   color: '#ea580c', bg: 'rgba(234,88,12,0.1)' },
          { v: false, label: 'No — Close Finding',  color: '#059669', bg: 'rgba(5,150,105,0.1)' },
        ].map(o => (
          <button key={String(o.v)}
            onClick={() => onChange({ risk_creation_required: o.v })}
            className="p-3 rounded-xl border text-sm font-medium text-left transition-all"
            style={{
              background: wf.risk_creation_required === o.v ? o.bg : 'var(--muted)',
              borderColor: wf.risk_creation_required === o.v ? o.color : 'var(--border)',
              color: wf.risk_creation_required === o.v ? o.color : 'var(--muted-fg)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {wf.risk_creation_required && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(234,88,12,0.08)', color: '#ea580c' }}>
          Navigate to Risk Register after closing to create the risk entry.
        </p>
      )}
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <CheckCircle2 className="w-10 h-10 text-green-500" />
      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Finding Workflow Closed</p>
      <p className="text-xs text-center" style={{ color: 'var(--muted-fg)' }}>
        All steps completed. {wf.risk_created_id ? 'Risk has been created in the Risk Register.' : ''}
      </p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--muted-fg)', opacity: 0.6 }}>{label}</p>
      <p className="text-sm" style={{ color: 'var(--foreground)' }}>{value}</p>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function FindingWorkflowStepper({ id }: { id: string }) {
  const router = useRouter()
  const [wf, setWf]       = useState<AuditFindingWorkflow | null>(null)
  const [draft, setDraft] = useState<AuditFindingWorkflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    dbExt.getAuditFindingWorkflow(id).then(found => {
      setWf(found); setDraft(found); setLoading(false)
    })
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted-fg)' }}>Loading…</div>
  if (!wf || !draft) return <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted-fg)' }}>Workflow not found.</div>

  const steps      = getRelevantSteps(draft)
  const currentIdx = steps.indexOf(draft.step)
  const meta       = STEP_META[draft.step]
  const isTerminal = meta?.terminal ?? false

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await dbExt.saveAuditFindingWorkflow(draft!)
      setWf(saved); setDraft(saved); toast.success('Saved')
    } catch { toast.error('Save failed') }
    setSaving(false)
  }

  async function handleAdvance() {
    const check = canAdvance(draft!)
    if (!check.ok) { toast.error(check.reason ?? 'Cannot advance'); return }
    const nextStep = getNextStep(draft!)
    if (!nextStep) { toast.error('No next step defined'); return }

    const patch: Partial<AuditFindingWorkflow> = { step: nextStep }
    if (nextStep === 'closure') {
      patch.status    = 'closed'
      patch.closed_at = new Date().toISOString()
    } else if (draft!.status === 'open') {
      patch.status = 'in_progress'
    }

    setSaving(true)
    try {
      const saved = await dbExt.saveAuditFindingWorkflow({ ...draft!, ...patch })
      setWf(saved); setDraft(saved)
      toast.success(`Advanced to: ${STEP_META[nextStep]?.label ?? nextStep}`)
    } catch { toast.error('Failed to advance') }
    setSaving(false)
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className="w-60 flex-shrink-0 overflow-y-auto border-r p-4"
        style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => router.push('/audit-findings-workflow')}
          className="flex items-center gap-2 text-xs mb-5 hover:text-sky-400 transition-colors"
          style={{ color: 'var(--muted-fg)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Findings
        </button>

        {/* Phase grouping */}
        {['Intake','Fast Track','Investigation','Assessment','Treatment','Closed'].map(phase => {
          const phaseSteps = steps.filter(s => STEP_META[s]?.phase === phase)
          if (phaseSteps.length === 0) return null
          return (
            <div key={phase} className="mb-3">
              <p className="text-[10px] uppercase tracking-widest px-2 mb-1" style={{ color: 'var(--muted-fg)', opacity: 0.45 }}>{phase}</p>
              {phaseSteps.map(step => {
                const idx        = steps.indexOf(step)
                const isActive   = idx === currentIdx
                const isDone     = idx < currentIdx
                const isPending  = idx > currentIdx
                return (
                  <div key={step}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={isActive ? { background: 'rgba(14,165,233,0.09)', boxShadow: 'inset 2px 0 0 var(--brand-500)' } : {}}
                  >
                    {isDone
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-500" />
                      : isActive
                      ? <CircleDot className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--brand-500)' }} />
                      : <Circle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--border)' }} />}
                    <span
                      className={cn('text-xs font-medium truncate')}
                      style={{ color: isActive ? 'var(--brand-500)' : isDone ? 'var(--muted-fg)' : 'var(--muted-fg)', opacity: isPending ? 0.45 : 1 }}
                    >
                      {STEP_META[step]?.label}
                    </span>
                    {STEP_META[step]?.decision && <GitBranch className="w-3 h-3 shrink-0 ml-auto" style={{ color: 'var(--muted-fg)', opacity: 0.5 }} />}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div
          key={draft.step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-xl mx-auto space-y-5"
        >
          <div className="card p-5">
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted-fg)', opacity: 0.6 }}>
              {meta?.phase} · Step {currentIdx + 1} of {steps.length}
            </p>
            <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{meta?.label}</h2>
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted-fg)' }}>
              {draft.finding_title ?? 'Untitled'}
              {draft.finding_severity && (
                <span className="ml-2 capitalize px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}>
                  {draft.finding_severity}
                </span>
              )}
            </p>
          </div>

          <div className="card p-5">
            <StepPanel wf={draft} onChange={p => setDraft(prev => prev ? { ...prev, ...p } : prev)} />
          </div>

          {!isTerminal && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                onClick={handleAdvance}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-1 justify-center"
                style={{ background: 'var(--brand-500)' }}
              >
                Advance <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
