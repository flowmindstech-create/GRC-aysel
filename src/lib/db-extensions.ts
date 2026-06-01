'use client'

import type { AuditFindingWorkflow, AuditFindingWorkflowStep, NIRAPItem } from '@/types'

const isSupabase = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function getLocal<T>(key: string, def: T): T {
  if (typeof window === 'undefined') return def
  try { return JSON.parse(localStorage.getItem(`riskshield_${key}`) ?? 'null') ?? def }
  catch { return def }
}

function setLocal<T>(key: string, val: T) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`riskshield_${key}`, JSON.stringify(val))
}

// ── Audit Finding Workflows ───────────────────────────────────────────────────

export const dbExt = {
  async getAuditFindingWorkflows(): Promise<AuditFindingWorkflow[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const sb = createClient()
      const { data } = await sb
        .from('audit_finding_workflow')
        .select('*, audit_findings(title, severity, recommendation)')
        .order('created_at', { ascending: false })
      return (data ?? []).map((r: any) => ({
        ...r,
        finding_title:          r.audit_findings?.title,
        finding_severity:       r.audit_findings?.severity,
        finding_recommendation: r.audit_findings?.recommendation,
      }))
    }
    return getLocal<AuditFindingWorkflow[]>('audit_finding_workflows', [])
  },

  async getAuditFindingWorkflow(id: string): Promise<AuditFindingWorkflow | null> {
    const all = await dbExt.getAuditFindingWorkflows()
    return all.find(w => w.id === id) ?? null
  },

  async getWorkflowForFinding(findingId: string): Promise<AuditFindingWorkflow | null> {
    const all = await dbExt.getAuditFindingWorkflows()
    return all.find(w => w.audit_finding_id === findingId) ?? null
  },

  async saveAuditFindingWorkflow(item: AuditFindingWorkflow): Promise<AuditFindingWorkflow> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const sb = createClient()
      const { data, error } = await sb
        .from('audit_finding_workflow')
        .upsert({ ...item, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (!error && data) return data as AuditFindingWorkflow
    }
    const all  = getLocal<AuditFindingWorkflow[]>('audit_finding_workflows', [])
    const next = { ...item, updated_at: new Date().toISOString() }
    const idx  = all.findIndex(w => w.id === next.id)
    if (idx >= 0) all[idx] = next; else all.unshift(next)
    setLocal('audit_finding_workflows', all)
    return next
  },

  async promoteToWorkflow(
    findingId: string,
    orgId: string,
    findingTitle?: string,
    findingSeverity?: string,
    findingRecommendation?: string
  ): Promise<AuditFindingWorkflow> {
    const existing = await dbExt.getWorkflowForFinding(findingId)
    if (existing) return existing
    const wf: AuditFindingWorkflow = {
      id:                          crypto.randomUUID(),
      org_id:                      orgId,
      audit_finding_id:            findingId,
      step:                        'registration',
      status:                      'open',
      immediate_correction_required: false,
      corrective_action_required:  true,
      risk_creation_required:      false,
      finding_title:               findingTitle,
      finding_severity:            findingSeverity as any,
      finding_recommendation:      findingRecommendation,
      created_at:                  new Date().toISOString(),
      updated_at:                  new Date().toISOString(),
    }
    return dbExt.saveAuditFindingWorkflow(wf)
  },

  // ── NIRAP ──────────────────────────────────────────────────────────────────

  async getNIRAPItems(): Promise<NIRAPItem[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const sb = createClient()
      const { data } = await sb.from('nirap_items').select('*').order('created_at', { ascending: false })
      return (data ?? []) as NIRAPItem[]
    }
    return getLocal<NIRAPItem[]>('nirap_items', [])
  },

  async getNIRAPItem(id: string): Promise<NIRAPItem | null> {
    const all = await dbExt.getNIRAPItems()
    return all.find(i => i.id === id) ?? null
  },

  async saveNIRAPItem(item: NIRAPItem): Promise<NIRAPItem> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const sb = createClient()
      const { data, error } = await sb
        .from('nirap_items')
        .upsert({ ...item, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (!error && data) return data as NIRAPItem
    }
    const all  = getLocal<NIRAPItem[]>('nirap_items', [])
    const next = { ...item, updated_at: new Date().toISOString() }
    const idx  = all.findIndex(n => n.id === next.id)
    if (idx >= 0) all[idx] = next; else all.unshift(next)
    setLocal('nirap_items', all)
    return next
  },
}
