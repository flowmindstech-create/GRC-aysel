'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'
import { getNextStep, canAdvance, evaluateGap } from '@/lib/control-mapping'
import type { GRCIntakeItem, GRCIntakeStep, GRCIntakeType, EffectivenessRating } from '@/types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  CheckCircle2, Circle, CircleDot, ArrowLeft,
  AlertTriangle, ChevronRight, Save, FileText,
  ShieldAlert, Search, Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

// ── Step config ───────────────────────────────────────────────────────────────

const STEP_META: Partial<Record<GRCIntakeStep, { label: string; phase: string; decision?: boolean; terminal?: boolean }>> = {
  registration:               { label: 'Registration',           phase: 'Intake' },
  classification:             { label: 'Classification',         phase: 'Intake' },
  control_mapping:            { label: 'Control Mapping',        phase: 'Mapping' },
  evidence_collection:        { label: 'Evidence Collection',    phase: 'Mapping' },
  compliance_assessment:      { label: 'Compliance Assessment',  phase: 'Mapping', decision: true },
  compliant_closed:           { label: 'Compliant — Closed',     phase: 'Closed', terminal: true },
  inherent_assessment:        { label: 'Inherent Risk Assessment', phase: 'Risk Assessment' },
  control_effectiveness_review: { label: 'Control Effectiveness', phase: 'Risk Assessment' },
  residual_assessment:        { label: 'Residual Risk Assessment', phase: 'Risk Assessment' },
  owner_review:               { label: 'Risk Owner Review',      phase: 'Review' },
  mgt_review:                 { label: 'Management Review',      phase: 'Review' },
  appetite_gate:              { label: 'Appetite Gate',          phase: 'Review', decision: true },
  action_plan:                { label: 'Action Plan',            phase: 'Treatment' },
  assignment:                 { label: 'Assignment',             phase: 'Treatment' },
  implementation:             { label: 'Implementation',         phase: 'Treatment' },
  evidence_upload:            { label: 'Evidence Upload',        phase: 'Treatment' },
  validation:                 { label: 'Validation',             phase: 'Treatment' },
  reassessment:               { label: 'Residual Reassessment',  phase: 'Treatment', decision: true },
  escalation:                 { label: 'Escalation',             phase: 'Escalation' },
  committee_review:           { label: 'Committee Review',       phase: 'Escalation' },
  monitoring:                 { label: 'Monitoring',             phase: 'Closed' },
  closed:                     { label: 'Closed',                 phase: 'Closed', terminal: true },
}

function getRelevantSteps(item: GRCIntakeItem): GRCIntakeStep[] {
  const base: GRCIntakeStep[] = ['registration', 'classification', 'control_mapping', 'evidence_collection', 'compliance_assessment']
  if (item.gap_identified === false && item.step !== 'registration') return [...base, 'compliant_closed']
  const gapPath: GRCIntakeStep[] = [...base,
    'inherent_assessment', 'control_effectiveness_review', 'residual_assessment',
    'owner_review', 'mgt_review', 'appetite_gate',
  ]
  if (item.appetite_decision === 'accept') return [...gapPath, 'monitoring', 'closed']
  const treatPath: GRCIntakeStep[] = [...gapPath,
    'action_plan', 'assignment', 'implementation', 'evidence_upload', 'validation', 'reassessment',
  ]
  if (item.post_treatment_appetite === 'within') return [...treatPath, 'monitoring', 'closed']
  if (item.post_treatment_appetite === 'outside') return [...treatPath, 'escalation', 'committee_review', 'monitoring', 'closed']
  return treatPath
}

// ── Slider ────────────────────────────────────────────────────────────────────

function RatingSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 4 ? '#e11d48' : value >= 3 ? '#ea580c' : value >= 2 ? '#d97706' : '#059669'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>{label}</label>
        <span className="text-sm font-bold" style={{ color }}>{value}</span>
      </div>
      <input
        type="range" min={1} max={5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
        <span>1 Very Low</span><span>5 Very High</span>
      </div>
    </div>
  )
}

// ── Step Panels ───────────────────────────────────────────────────────────────

function StepPanel({ item, onChange }: { item: GRCIntakeItem; onChange: (patch: Partial<GRCIntakeItem>) => void }) {
  const step = item.step

  const field = (label: string, value: string, key: keyof GRCIntakeItem, placeholder = '') => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>{label}</label>
      <input
        value={value ?? ''}
        onChange={e => onChange({ [key]: e.target.value } as Partial<GRCIntakeItem>)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )

  const textarea = (label: string, value: string, key: keyof GRCIntakeItem, placeholder = '') => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>{label}</label>
      <textarea
        value={value ?? ''}
        onChange={e => onChange({ [key]: e.target.value } as Partial<GRCIntakeItem>)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )

  if (step === 'registration') return (
    <div className="space-y-4">
      <InfoRow label="Type" value={item.type} />
      <InfoRow label="Title" value={item.title} />
      <InfoRow label="Description" value={item.description || '—'} />
      <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)', color: 'var(--brand-500)' }}>
        Review the information above and click Advance to move to Classification.
      </p>
    </div>
  )

  if (step === 'classification') return (
    <div className="space-y-4">
      {field('Classification *', item.classification, 'classification', 'e.g. Regulatory')}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Notes</label>
        <textarea
          value={item.evidence_note ?? ''}
          onChange={e => onChange({ evidence_note: e.target.value })}
          placeholder="Additional classification context…"
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
      </div>
    </div>
  )

  if (step === 'control_mapping') return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
        Map this item to relevant controls. Enter control IDs separated by commas (full control mapping UI coming in Phase 4).
      </p>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Mapped Control IDs</label>
        <input
          value={item.mapped_control_ids?.join(', ') ?? ''}
          onChange={e => onChange({ mapped_control_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          placeholder="uuid1, uuid2, …"
          className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
      </div>
      <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>
        {item.mapped_control_ids?.length ?? 0} control(s) mapped.
      </p>
    </div>
  )

  if (step === 'evidence_collection') return (
    <div className="space-y-4">
      {field('Evidence URL', item.evidence_url ?? '', 'evidence_url', 'https://…')}
      {textarea('Evidence Note', item.evidence_note ?? '', 'evidence_note', 'Describe the evidence collected…')}
    </div>
  )

  if (step === 'compliance_assessment') return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
        Assess whether this item has a compliance gap based on the mapped controls and collected evidence.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: false, label: 'No Gap', desc: 'Controls are adequate', color: 'rgba(5,150,105,0.15)', border: 'rgba(5,150,105,0.4)', text: '#059669' },
          { value: true,  label: 'Gap Found', desc: 'Risk assessment required', color: 'rgba(225,29,72,0.1)', border: 'rgba(225,29,72,0.4)', text: '#e11d48' },
        ].map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => onChange({ gap_identified: opt.value })}
            className="flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all"
            style={{
              background: item.gap_identified === opt.value ? opt.color : 'var(--muted)',
              borderColor: item.gap_identified === opt.value ? opt.border : 'var(--border)',
            }}
          >
            <span className="text-sm font-semibold" style={{ color: item.gap_identified === opt.value ? opt.text : 'var(--foreground)' }}>
              {opt.label}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )

  if (step === 'inherent_assessment') return (
    <div className="space-y-5">
      <RatingSlider
        label="Inherent Likelihood"
        value={item.inherent_likelihood ?? 3}
        onChange={v => onChange({ inherent_likelihood: v })}
      />
      <RatingSlider
        label="Inherent Impact"
        value={item.inherent_impact ?? 3}
        onChange={v => onChange({ inherent_impact: v })}
      />
      {item.inherent_likelihood && item.inherent_impact && (
        <div className="p-3 rounded-lg text-center" style={{ background: 'var(--muted)' }}>
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Inherent Risk Score</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>
            {item.inherent_likelihood * item.inherent_impact}
            <span className="text-sm font-normal ml-2" style={{ color: 'var(--muted-fg)' }}>/25</span>
          </p>
        </div>
      )}
    </div>
  )

  if (step === 'control_effectiveness_review') return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>Control Effectiveness Rating *</label>
        <select
          value={item.control_effectiveness ?? ''}
          onChange={e => onChange({ control_effectiveness: e.target.value as EffectivenessRating })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          <option value="">Select rating…</option>
          <option value="effective">Effective</option>
          <option value="partially_effective">Partially Effective</option>
          <option value="ineffective">Ineffective</option>
          <option value="na">Not Applicable</option>
        </select>
      </div>
    </div>
  )

  if (step === 'residual_assessment') return (
    <div className="space-y-5">
      <RatingSlider
        label="Residual Likelihood"
        value={item.residual_likelihood ?? 2}
        onChange={v => onChange({ residual_likelihood: v })}
      />
      <RatingSlider
        label="Residual Impact"
        value={item.residual_impact ?? 2}
        onChange={v => onChange({ residual_impact: v })}
      />
      {item.inherent_likelihood && item.residual_likelihood && item.inherent_impact && item.residual_impact && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg text-center" style={{ background: 'var(--muted)' }}>
            <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Inherent</p>
            <p className="text-lg font-bold" style={{ color: '#e11d48' }}>{item.inherent_likelihood * item.inherent_impact}</p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: 'var(--muted)' }}>
            <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Residual</p>
            <p className="text-lg font-bold" style={{ color: '#059669' }}>{item.residual_likelihood * item.residual_impact}</p>
          </div>
        </div>
      )}
    </div>
  )

  if (step === 'owner_review' || step === 'mgt_review') return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
        {step === 'owner_review' ? 'Risk Owner' : 'Risk Management Function (2nd Line)'} reviews the assessment and approves progression.
      </p>
      {textarea('Review Notes', item.evidence_note ?? '', 'evidence_note', 'Add review comments or observations…')}
    </div>
  )

  if (step === 'appetite_gate') {
    const score = (item.residual_likelihood ?? 0) * (item.residual_impact ?? 0)
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg" style={{ background: 'var(--muted)' }}>
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Residual Risk Score</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: score > 9 ? '#e11d48' : '#059669' }}>{score || '—'}</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Is the residual risk within the organisation's risk appetite?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'accept', label: 'Accept Risk', desc: 'Within appetite — move to monitoring', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
            { value: 'treat',  label: 'Treatment Required', desc: 'Outside appetite — create action plan', color: '#e11d48', bg: 'rgba(225,29,72,0.08)' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ appetite_decision: opt.value as 'accept' | 'treat' })}
              className="flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all"
              style={{
                background: item.appetite_decision === opt.value ? opt.bg : 'var(--muted)',
                borderColor: item.appetite_decision === opt.value ? opt.color : 'var(--border)',
              }}
            >
              <span className="text-sm font-semibold" style={{ color: item.appetite_decision === opt.value ? opt.color : 'var(--foreground)' }}>
                {opt.label}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'action_plan') return (
    <div className="space-y-4">
      {textarea('Action Plan *', item.action_plan ?? '', 'action_plan', 'Describe the treatment actions required…')}
      {field('Implementation Due Date', item.implementation_due ?? '', 'implementation_due', 'YYYY-MM-DD')}
    </div>
  )

  if (step === 'assignment') return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Assign responsibility for implementation.</p>
      {field('Assigned To (User ID)', item.assigned_to ?? '', 'assigned_to', 'User ID or name')}
    </div>
  )

  if (step === 'implementation') return (
    <div className="space-y-4">
      {textarea('Implementation Notes', item.evidence_note ?? '', 'evidence_note', 'Describe actions taken…')}
      {field('Evidence URL', item.implementation_evidence_url ?? '', 'implementation_evidence_url', 'https://…')}
    </div>
  )

  if (step === 'evidence_upload') return (
    <div className="space-y-4">
      {field('Evidence URL *', item.implementation_evidence_url ?? '', 'implementation_evidence_url', 'https://…')}
      {field('Evidence Note', item.evidence_note ?? '', 'evidence_note', 'Describe the evidence…')}
    </div>
  )

  if (step === 'validation') return (
    <div className="space-y-4">
      {textarea('Validation Note *', item.validation_note ?? '', 'validation_note', 'Confirm that the action plan has been successfully implemented…')}
      {field('Validated By', item.validated_by ?? '', 'validated_by', 'Validator name or ID')}
    </div>
  )

  if (step === 'reassessment') return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>After treatment, is the residual risk now within appetite?</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'within',  label: 'Within Appetite',  color: '#059669', bg: 'rgba(5,150,105,0.1)' },
          { value: 'outside', label: 'Still Outside',     color: '#e11d48', bg: 'rgba(225,29,72,0.08)' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange({ post_treatment_appetite: opt.value as 'within' | 'outside' })}
            className="flex flex-col gap-1 p-4 rounded-xl border text-left transition-all"
            style={{
              background: item.post_treatment_appetite === opt.value ? opt.bg : 'var(--muted)',
              borderColor: item.post_treatment_appetite === opt.value ? opt.color : 'var(--border)',
            }}
          >
            <span className="text-sm font-semibold" style={{ color: item.post_treatment_appetite === opt.value ? opt.color : 'var(--foreground)' }}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  if (step === 'escalation') return (
    <div className="space-y-4">
      <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(225,29,72,0.08)', color: '#e11d48' }}>
        Risk remains outside appetite after treatment. Escalation to Risk Committee required.
      </p>
      {textarea('Escalation Reason', item.evidence_note ?? '', 'evidence_note', 'Explain why risk could not be reduced within appetite…')}
    </div>
  )

  if (step === 'committee_review') return (
    <div className="space-y-4">
      {field('Committee Decision', item.committee_decision ?? '', 'committee_decision', 'Accept / Mitigate / Transfer / Avoid')}
      {textarea('Decision Notes', item.evidence_note ?? '', 'evidence_note', 'Document the committee decision and rationale…')}
    </div>
  )

  if (step === 'monitoring') return (
    <div className="space-y-4">
      <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)', color: 'var(--brand-500)' }}>
        Risk is now in the monitoring phase. Periodic review will be triggered based on the review schedule.
      </p>
      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Click Advance to formally close this item.</p>
    </div>
  )

  return (
    <div className="p-4 rounded-lg text-center" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Completed</p>
      <p className="text-xs mt-1">This workflow item has been closed.</p>
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

export function WorkflowStepperClient({ id }: { id: string }) {
  const router = useRouter()
  const [item, setItem]       = useState<GRCIntakeItem | null>(null)
  const [draft, setDraft]     = useState<GRCIntakeItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    db.getGRCIntakeItems().then(items => {
      const found = items.find(i => i.id === id) ?? null
      setItem(found)
      setDraft(found)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted-fg)' }}>Loading…</div>
  )
  if (!item || !draft) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted-fg)' }}>Item not found.</div>
  )

  const steps     = getRelevantSteps(draft)
  const currentIdx = steps.indexOf(draft.step)
  const meta      = STEP_META[draft.step]
  const isTerminal = meta?.terminal ?? false

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await db.saveGRCIntakeItem(draft!)
      setItem(saved); setDraft(saved)
      toast.success('Saved')
    } catch { toast.error('Save failed') }
    setSaving(false)
  }

  async function handleAdvance() {
    const check = canAdvance(draft!)
    if (!check.ok) { toast.error(check.reason ?? 'Cannot advance'); return }
    const nextStep = getNextStep(draft!)
    if (!nextStep) { toast.error('No next step'); return }

    // Special handling: gap_identified drives the path
    let patch: Partial<GRCIntakeItem> = { step: nextStep }
    if (draft!.step === 'compliance_assessment') {
      patch.gap_identified = draft!.gap_identified
      if (!draft!.gap_identified) patch.step = 'compliant_closed'
    }
    if (draft!.step === 'compliance_assessment' && !draft!.gap_identified) {
      patch.status = 'compliant'
    }
    if (nextStep === 'closed' || nextStep === 'compliant_closed') {
      patch.status = 'closed'
      patch.closed_at = new Date().toISOString()
    }

    const updated = { ...draft!, ...patch }
    setSaving(true)
    try {
      const saved = await db.saveGRCIntakeItem(updated)
      setItem(saved); setDraft(saved)
      toast.success(`Advanced to: ${STEP_META[nextStep]?.label ?? nextStep}`)
    } catch { toast.error('Failed to advance') }
    setSaving(false)
  }

  return (
    <div className="flex h-full">
      {/* Sidebar stepper */}
      <div
        className="w-64 flex-shrink-0 overflow-y-auto border-r p-4"
        style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => router.push('/compliance-workflow')}
          className="flex items-center gap-2 text-xs mb-5 transition-colors hover:text-sky-400"
          style={{ color: 'var(--muted-fg)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Items
        </button>

        <div className="space-y-1">
          {steps.map((step, idx) => {
            const m = STEP_META[step]
            const isActive    = idx === currentIdx
            const isCompleted = idx < currentIdx
            const isPending   = idx > currentIdx

            return (
              <div key={step} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all"
                style={isActive ? { background: 'rgba(14,165,233,0.09)', boxShadow: 'inset 2px 0 0 var(--brand-500)' } : {}}>
                <div className="shrink-0">
                  {isCompleted
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : isActive
                    ? <CircleDot className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
                    : <Circle className="w-4 h-4" style={{ color: 'var(--border)' }} />}
                </div>
                <div className="min-w-0">
                  <p className={cn('text-xs font-medium truncate', isActive ? 'text-sky-400' : '')}
                    style={{ color: isCompleted ? 'var(--muted-fg)' : isActive ? '' : 'var(--muted-fg)', opacity: isPending ? 0.5 : 1 }}>
                    {m?.label ?? step}
                  </p>
                  {isActive && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)', opacity: 0.7 }}>{m?.phase}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div
          key={draft.step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-xl mx-auto space-y-5"
        >
          {/* Step header */}
          <div className="card p-5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted-fg)', opacity: 0.6 }}>
                  {meta?.phase ?? '—'} · Step {currentIdx + 1} of {steps.length}
                </p>
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                  {meta?.label ?? draft.step}
                </h2>
              </div>
              {draft.gap_identified && (
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(225,29,72,0.1)', color: '#e11d48' }}>
                  <AlertTriangle className="w-3 h-3" /> Gap
                </span>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted-fg)' }}>
              {item.title} · <span className="capitalize">{item.type}</span> · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Step form */}
          <div className="card p-5">
            <StepPanel item={draft} onChange={patch => setDraft(prev => prev ? { ...prev, ...patch } : prev)} />
          </div>

          {/* Actions */}
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex-1 justify-center"
                style={{ background: 'var(--brand-500)' }}
              >
                {draft.step === 'monitoring' ? 'Close Item' : 'Advance'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
