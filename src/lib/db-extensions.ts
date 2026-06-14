import type { AuditFindingWorkflow, NIRAPItem, KRIItem, KCIItem, KPIItem, MonitoringAlert, Policy, PolicyApproval } from '@/types'
import { isUUID, ensureUUID } from './db'

const isSupabase = () => {
  if (typeof window !== 'undefined' && document.cookie.includes('mock-session=true')) {
    return false
  }
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

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
    const sanitized = {
      ...item,
      id: ensureUUID(item.id),
      org_id: ensureUUID(item.org_id),
      audit_finding_id: ensureUUID(item.audit_finding_id),
      updated_at: new Date().toISOString()
    }
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const sb = createClient()
      const { data, error } = await sb
        .from('audit_finding_workflow')
        .upsert(sanitized)
        .select()
        .single()
      if (error) console.error('Supabase saveAuditFindingWorkflow error:', error)
      if (!error && data) return data as AuditFindingWorkflow
    }
    const all  = getLocal<AuditFindingWorkflow[]>('audit_finding_workflows', [])
    const next = sanitized
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
    const sanitized = {
      ...item,
      id: ensureUUID(item.id),
      org_id: ensureUUID(item.org_id),
      updated_at: new Date().toISOString()
    }
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const sb = createClient()
      const { data, error } = await sb
        .from('nirap_items')
        .upsert(sanitized)
        .select()
        .single()
      if (error) console.error('Supabase saveNIRAPItem error:', error)
      if (!error && data) return data as NIRAPItem
    }
    const all  = getLocal<NIRAPItem[]>('nirap_items', [])
    const next = sanitized
    const idx  = all.findIndex(n => n.id === next.id)
    if (idx >= 0) all[idx] = next; else all.unshift(next)
    setLocal('nirap_items', all)
    return next
  },

  // ── Control Mappings ───────────────────────────────────────────────────────

  async getControlMappings(): Promise<import('@/types').ControlMapping[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data } = await createClient().from('control_mappings').select('*').order('created_at', { ascending: false })
      return (data ?? []) as import('@/types').ControlMapping[]
    }
    return getLocal<import('@/types').ControlMapping[]>('control_mappings', [])
  },

  async saveControlMapping(item: import('@/types').ControlMapping): Promise<import('@/types').ControlMapping> {
    const sanitized: import('@/types').ControlMapping = {
      ...item,
      id: ensureUUID(item.id),
      org_id: ensureUUID(item.org_id),
      control_id: ensureUUID(item.control_id),
      entity_id: ensureUUID(item.entity_id)
    }
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data, error } = await createClient().from('control_mappings').upsert(sanitized).select().single()
      if (error) console.error('Supabase saveControlMapping error:', error)
      if (!error && data) return data as import('@/types').ControlMapping
    }
    const all = getLocal<import('@/types').ControlMapping[]>('control_mappings', [])
    const idx = all.findIndex(m => m.id === sanitized.id)
    if (idx >= 0) all[idx] = sanitized; else all.unshift(sanitized)
    setLocal('control_mappings', all)
    return sanitized
  },

  // ── KRI ────────────────────────────────────────────────────────────────────

  async getKRIItems(): Promise<KRIItem[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data } = await createClient().from('kri_items').select('*').order('created_at', { ascending: false })
      return (data ?? []) as KRIItem[]
    }
    return getLocal<KRIItem[]>('kri_items', [])
  },

  async saveKRIItem(item: KRIItem): Promise<KRIItem> {
    const sanitized: KRIItem = {
      ...item,
      id: ensureUUID(item.id),
      org_id: ensureUUID(item.org_id),
      related_risk_id: (item.related_risk_id && isUUID(item.related_risk_id)) ? item.related_risk_id : undefined,
      updated_at: new Date().toISOString()
    }
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const payload: any = {
        ...sanitized,
        related_risk_id: sanitized.related_risk_id || null
      }
      const { data, error } = await createClient().from('kri_items').upsert(payload).select().single()
      if (error) console.error('Supabase saveKRIItem error:', error)
      if (!error && data) return data as KRIItem
    }
    const all = getLocal<KRIItem[]>('kri_items', [])
    const next = sanitized
    const idx = all.findIndex(k => k.id === next.id)
    if (idx >= 0) all[idx] = next; else all.unshift(next)
    setLocal('kri_items', all)
    return next
  },

  // ── KCI ────────────────────────────────────────────────────────────────────

  async getKCIItems(): Promise<KCIItem[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data } = await createClient().from('kci_items').select('*').order('created_at', { ascending: false })
      return (data ?? []) as KCIItem[]
    }
    return getLocal<KCIItem[]>('kci_items', [])
  },

  async saveKCIItem(item: KCIItem): Promise<KCIItem> {
    const sanitized: KCIItem = {
      ...item,
      id: ensureUUID(item.id),
      org_id: ensureUUID(item.org_id),
      control_id: (item.control_id && isUUID(item.control_id)) ? item.control_id : undefined,
      updated_at: new Date().toISOString()
    }
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const payload: any = {
        ...sanitized,
        control_id: sanitized.control_id || null
      }
      const { data, error } = await createClient().from('kci_items').upsert(payload).select().single()
      if (error) console.error('Supabase saveKCIItem error:', error)
      if (!error && data) return data as KCIItem
    }
    const all = getLocal<KCIItem[]>('kci_items', [])
    const next = sanitized
    const idx = all.findIndex(k => k.id === next.id)
    if (idx >= 0) all[idx] = next; else all.unshift(next)
    setLocal('kci_items', all)
    return next
  },

  // ── KPI ────────────────────────────────────────────────────────────────────

  async getKPIItems(): Promise<KPIItem[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data } = await createClient().from('kpi_items').select('*').order('created_at', { ascending: false })
      return (data ?? []) as KPIItem[]
    }
    return getLocal<KPIItem[]>('kpi_items', [])
  },

  async saveKPIItem(item: KPIItem): Promise<KPIItem> {
    const sanitized = {
      ...item,
      id: ensureUUID(item.id),
      org_id: ensureUUID(item.org_id),
      updated_at: new Date().toISOString()
    }
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data, error } = await createClient().from('kpi_items').upsert(sanitized).select().single()
      if (error) console.error('Supabase saveKPIItem error:', error)
      if (!error && data) return data as KPIItem
    }
    const all = getLocal<KPIItem[]>('kpi_items', [])
    const next = sanitized
    const idx = all.findIndex(k => k.id === next.id)
    if (idx >= 0) all[idx] = next; else all.unshift(next)
    setLocal('kpi_items', all)
    return next
  },

  // ── Monitoring Alerts ──────────────────────────────────────────────────────

  async getMonitoringAlerts(): Promise<MonitoringAlert[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data } = await createClient().from('monitoring_alerts').select('*').order('created_at', { ascending: false })
      return (data ?? []) as MonitoringAlert[]
    }
    return getLocal<MonitoringAlert[]>('monitoring_alerts', [])
  },

  async acknowledgeAlert(id: string): Promise<void> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      await createClient().from('monitoring_alerts').update({ acknowledged: true, acknowledged_at: new Date().toISOString() }).eq('id', id)
      return
    }
    const all = getLocal<MonitoringAlert[]>('monitoring_alerts', [])
    const idx = all.findIndex(a => a.id === id)
    if (idx >= 0) { all[idx].acknowledged = true; all[idx].acknowledged_at = new Date().toISOString() }
    setLocal('monitoring_alerts', all)
  },

  // ── Policies ───────────────────────────────────────────────────────────────

  async getPolicies(): Promise<Policy[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data } = await createClient().from('policies').select('*').order('created_at', { ascending: false })
      return (data ?? []) as Policy[]
    }
    return getLocal<Policy[]>('policies', [])
  },

  async savePolicy(item: Policy): Promise<Policy> {
    const sanitized: Policy = {
      ...item,
      id: ensureUUID(item.id),
      org_id: ensureUUID(item.org_id),
      owner_id: (item.owner_id && isUUID(item.owner_id)) ? item.owner_id : undefined,
      updated_at: new Date().toISOString()
    }
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const payload: any = {
        ...sanitized,
        owner_id: sanitized.owner_id || null
      }
      const { data, error } = await createClient()
        .from('policies')
        .upsert(payload)
        .select().single()
      if (error) console.error('Supabase savePolicy error:', error)
      if (!error && data) return data as Policy
    }
    const all  = getLocal<Policy[]>('policies', [])
    const next = sanitized
    const idx  = all.findIndex(p => p.id === next.id)
    if (idx >= 0) all[idx] = next; else all.unshift(next)
    setLocal('policies', all)
    return next
  },

  async getPolicyApprovals(policyId: string): Promise<PolicyApproval[]> {
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const { data } = await createClient().from('policy_approvals').select('*').eq('policy_id', policyId).order('created_at', { ascending: true })
      return (data ?? []) as PolicyApproval[]
    }
    return getLocal<PolicyApproval[]>(`policy_approvals_${policyId}`, [])
  },

  async addPolicyApproval(approval: PolicyApproval): Promise<PolicyApproval> {
    const sanitized: PolicyApproval = {
      ...approval,
      id: ensureUUID(approval.id),
      policy_id: ensureUUID(approval.policy_id),
      actor_id: (approval.actor_id && isUUID(approval.actor_id)) ? approval.actor_id : undefined
    }
    if (isSupabase()) {
      const { createClient } = await import('./supabase/client')
      const payload: any = {
        ...sanitized,
        actor_id: sanitized.actor_id || null
      }
      const { data, error } = await createClient().from('policy_approvals').insert(payload).select().single()
      if (error) console.error('Supabase addPolicyApproval error:', error)
      if (!error && data) return data as PolicyApproval
    }
    const key = `policy_approvals_${sanitized.policy_id}`
    const all = getLocal<PolicyApproval[]>(key, [])
    all.push(sanitized)
    setLocal(key, all)
    return sanitized
  },
}
