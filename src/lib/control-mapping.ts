import type {
  ControlMapping, ControlIssue, ControlTestRun,
  RiskAppetiteStatement, GRCIntakeItem, Risk,
  RiskLevel, EffectivenessRating, MappingType, MappingEntityType,
  TestResult, AppetiteLevel,
} from '@/types'

// ── Risk Score ───────────────────────────────────────────────────────────────

export function calcRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact
}

export function scoreToLevel(score: number): RiskLevel {
  if (score <= 4)  return 'low'
  if (score <= 9)  return 'medium'
  if (score <= 15) return 'high'
  return 'critical'
}

// ── Control Effectiveness → Residual Reduction ───────────────────────────────

const EFFECTIVENESS_REDUCTION: Record<EffectivenessRating, number> = {
  effective:            0.6,
  partially_effective:  0.35,
  ineffective:          0.05,
  na:                   0,
}

export function applyControlReduction(
  inherentScore: number,
  effectiveness: EffectivenessRating
): number {
  const reduction = EFFECTIVENESS_REDUCTION[effectiveness] ?? 0
  return Math.max(1, Math.round(inherentScore * (1 - reduction)))
}

// ── Appetite Evaluation ───────────────────────────────────────────────────────

const APPETITE_MAX_SCORE: Record<AppetiteLevel, number> = {
  zero:     2,
  low:      6,
  moderate: 12,
  elevated: 16,
  high:     25,
}

export function evaluateAppetite(
  residualScore: number,
  appetiteLevel: AppetiteLevel
): 'within' | 'outside' {
  return residualScore <= APPETITE_MAX_SCORE[appetiteLevel] ? 'within' : 'outside'
}

export function evaluateAppetiteForItem(
  item: GRCIntakeItem,
  ras: RiskAppetiteStatement
): 'within' | 'outside' | null {
  if (item.residual_likelihood == null || item.residual_impact == null) return null
  const score = calcRiskScore(item.residual_likelihood, item.residual_impact)
  return evaluateAppetite(score, ras.appetite_level)
}

// ── Gap Detection ─────────────────────────────────────────────────────────────

export function evaluateGap(item: GRCIntakeItem): boolean {
  if (!item.mapped_control_ids || item.mapped_control_ids.length === 0) return true
  if (item.control_effectiveness === 'ineffective') return true
  if (item.control_effectiveness === 'na') return true
  return false
}

// ── Workflow Step Transitions ─────────────────────────────────────────────────

type StepTransition = {
  from: GRCIntakeItem['step']
  condition?: (item: GRCIntakeItem) => boolean
  to: GRCIntakeItem['step']
}

const COMPLIANCE_TRANSITIONS: StepTransition[] = [
  { from: 'registration',               to: 'classification' },
  { from: 'classification',             to: 'control_mapping' },
  { from: 'control_mapping',            to: 'evidence_collection' },
  { from: 'evidence_collection',        to: 'compliance_assessment' },
  {
    from: 'compliance_assessment',
    condition: (i) => !evaluateGap(i),
    to: 'compliant_closed',
  },
  {
    from: 'compliance_assessment',
    condition: (i) => evaluateGap(i),
    to: 'inherent_assessment',
  },
  { from: 'inherent_assessment',        to: 'control_effectiveness_review' },
  { from: 'control_effectiveness_review', to: 'residual_assessment' },
  { from: 'residual_assessment',        to: 'owner_review' },
  { from: 'owner_review',              to: 'mgt_review' },
  { from: 'mgt_review',                to: 'appetite_gate' },
  {
    from: 'appetite_gate',
    condition: (i) => i.appetite_decision === 'accept',
    to: 'monitoring',
  },
  {
    from: 'appetite_gate',
    condition: (i) => i.appetite_decision === 'treat',
    to: 'action_plan',
  },
  { from: 'action_plan',               to: 'assignment' },
  { from: 'assignment',                to: 'implementation' },
  { from: 'implementation',            to: 'evidence_upload' },
  { from: 'evidence_upload',           to: 'validation' },
  { from: 'validation',                to: 'reassessment' },
  {
    from: 'reassessment',
    condition: (i) => i.post_treatment_appetite === 'within',
    to: 'monitoring',
  },
  {
    from: 'reassessment',
    condition: (i) => i.post_treatment_appetite === 'outside',
    to: 'escalation',
  },
  { from: 'escalation',               to: 'committee_review' },
  { from: 'committee_review',         to: 'monitoring' },
  { from: 'monitoring',               to: 'closed' },
]

export function getNextStep(
  item: GRCIntakeItem
): GRCIntakeItem['step'] | null {
  const match = COMPLIANCE_TRANSITIONS.find(
    (t) => t.from === item.step && (!t.condition || t.condition(item))
  )
  return match?.to ?? null
}

export function canAdvance(item: GRCIntakeItem): { ok: boolean; reason?: string } {
  const step = item.step

  if (step === 'compliance_assessment' && item.mapped_control_ids.length === 0)
    return { ok: false, reason: 'En az bir control map edilməlidir.' }

  if (step === 'inherent_assessment' && (item.inherent_likelihood == null || item.inherent_impact == null))
    return { ok: false, reason: 'Inherent likelihood və impact daxil edilməlidir.' }

  if (step === 'residual_assessment' && (item.residual_likelihood == null || item.residual_impact == null))
    return { ok: false, reason: 'Residual likelihood və impact daxil edilməlidir.' }

  if (step === 'appetite_gate' && !item.appetite_decision)
    return { ok: false, reason: 'Qərar seçin: Accept və ya Treat.' }

  if (step === 'action_plan' && !item.action_plan?.trim())
    return { ok: false, reason: 'Action plan mətni tələb olunur.' }

  if (step === 'validation' && !item.validation_note?.trim())
    return { ok: false, reason: 'Validation notu tələb olunur.' }

  if (step === 'reassessment' && !item.post_treatment_appetite)
    return { ok: false, reason: 'Post-treatment appetite qiymətləndirilməlidir.' }

  return { ok: true }
}

// ── Test Run → Effectiveness Update ──────────────────────────────────────────

export function testResultToEffectiveness(
  results: TestResult[]
): EffectivenessRating {
  if (results.length === 0) return 'na'
  const passes = results.filter((r) => r === 'pass').length
  const ratio  = passes / results.length
  if (ratio >= 0.9) return 'effective'
  if (ratio >= 0.6) return 'partially_effective'
  return 'ineffective'
}

// ── Control Issue Auto-creation ───────────────────────────────────────────────

export function shouldCreateIssue(run: ControlTestRun): boolean {
  return run.result === 'fail' || run.exceptions_found > 0
}

export function buildIssueFromTestRun(
  run: ControlTestRun,
  orgId: string,
  issueSeq: number
): Omit<ControlIssue, 'id' | 'created_at' | 'updated_at'> {
  return {
    org_id:          orgId,
    issue_id:        `ISS-${String(issueSeq).padStart(4, '0')}`,
    control_id:      run.control_id,
    title:           `Control test failure — ${run.test_type} effectiveness`,
    description:     `Test run on ${run.run_date} resulted in ${run.result}. Exceptions found: ${run.exceptions_found}.`,
    source:          'control_test',
    severity:        run.result === 'fail' ? 'high' : 'medium',
    identified_at:   run.run_date,
    identified_by:   run.tested_by,
    status:          'open',
    linked_risk_ids: [],
    test_run_id:     run.id,
  }
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

export function buildMapping(
  orgId: string,
  controlId: string,
  entityType: MappingEntityType,
  entityId: string,
  mappingType: MappingType,
  mappedBy?: string
): Omit<ControlMapping, 'id' | 'created_at'> {
  return {
    org_id:          orgId,
    control_id:      controlId,
    entity_type:     entityType,
    entity_id:       entityId,
    mapping_type:    mappingType,
    mapped_by:       mappedBy,
    mapped_at:       new Date().toISOString(),
    approval_status: 'pending',
  }
}

export function coverageScore(
  mappings: ControlMapping[],
  effectivenessMap: Record<string, EffectivenessRating>
): { effective: number; partial: number; ineffective: number; total: number } {
  const total       = mappings.length
  const effective   = mappings.filter((m) => effectivenessMap[m.control_id] === 'effective').length
  const partial     = mappings.filter((m) => effectivenessMap[m.control_id] === 'partially_effective').length
  const ineffective = total - effective - partial
  return { effective, partial, ineffective, total }
}
