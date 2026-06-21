'use client'

import {
  MOCK_RISKS, MOCK_INCIDENTS, MOCK_CONTROLS, MOCK_AUDITS,
  MOCK_FINDINGS, MOCK_VENDORS, MOCK_ACTIVITIES,
  MOCK_USERS, SEED_ORG_UNITS, MOCK_REGULATORY_CHANGES
} from './seed-data'
import type {
  Risk, Incident, Control, Audit, AuditFinding, Vendor, Activity, DashboardStats,
  JiraConfig, JiraActivity, JiraComment, GRCIntakeItem, OrgUnit, UserProfile,
  ComplianceObligation, ObligationAuditLog, RegulatoryChange, InterestedParty, Process
} from '@/types'
import { RISK_CATEGORIES, normalizeCategory } from './risk-categories'
import { normalizeStatus, ACTIVE_STATUSES } from './risk-status'

// Helper to get items from localStorage
function getLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  const stored = localStorage.getItem(`riskshield_${key}`)
  if (!stored) {
    localStorage.setItem(`riskshield_${key}`, JSON.stringify(defaultValue))
    return defaultValue
  }
  try {
    return JSON.parse(stored) as T
  } catch {
    return defaultValue
  }
}

// Helper to save items to localStorage
function setLocalItem<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`riskshield_${key}`, JSON.stringify(value))
}
export function isUUID(str?: string): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export function ensureUUID(id?: string): string {
  if (id && isUUID(id)) return id
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const isSupabaseConfigured = () => {
  if (typeof window !== 'undefined' && document.cookie.includes('mock-session=true')) {
    return false
  }
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Resolve the authenticated user's org_id (Supabase mode) so writes satisfy RLS.
// Falls back to the default seed org. Mock mode keeps 'org1'. Cached per session.
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'
let _cachedOrgId: string | null = null

// Current signed-in profile (name/role) for the top nav. Mock → first mock user.
export async function getCurrentProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return MOCK_USERS[0] ?? null
  try {
    const { createClient } = await import('./supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error && error.code !== 'PGRST116') {
        console.error('Supabase getCurrentProfile select error:', error)
      }
      
      const fullName = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User'
      
      if (data) {
        if (!data.org_id) {
          const { error: updateErr } = await supabase.from('profiles').update({ org_id: DEFAULT_ORG_ID }).eq('id', user.id)
          if (updateErr) console.error('Supabase getCurrentProfile auto-backfill org_id error:', updateErr)
          data.org_id = DEFAULT_ORG_ID
        }
        return data as UserProfile
      } else {
        // Profile row is missing — create it dynamically in the database
        const newProfile: UserProfile = {
          id: user.id,
          org_id: DEFAULT_ORG_ID,
          full_name: fullName,
          email: user.email || '',
          role: 'admin',
          created_at: user.created_at || new Date().toISOString()
        }
        const { data: insertedData, error: insertErr } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()
        
        if (insertErr) {
          console.error('Supabase getCurrentProfile auto-create profile error:', insertErr)
          return newProfile
        }
        return insertedData as UserProfile
      }
    }
  } catch (err) {
    console.error('getCurrentProfile exception:', err)
  }
  return null
}

async function getCurrentOrgId(): Promise<string> {
  if (!isSupabaseConfigured()) return 'org1'
  if (_cachedOrgId) return _cachedOrgId
  try {
    const profile = await getCurrentProfile()
    if (profile && profile.org_id) {
      _cachedOrgId = profile.org_id
      return _cachedOrgId
    }
  } catch (err) {
    console.error('getCurrentOrgId exception:', err)
  }
  return DEFAULT_ORG_ID
}
export { getCurrentOrgId }

// Unified Database and LocalStorage Client
export const db = {
  // ─── RISKS ─────────────────────────────────────────────────────────────────
  async getRisks(): Promise<Risk[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('risks').select('*').order('created_at', { ascending: false })
      if (error) console.error('Supabase getRisks error:', error)
      if (!error && data) return (data as Risk[]).map(r => ({ ...r, category: normalizeCategory(r.category), status: normalizeStatus(r.status) }))
    }
    const risks = getLocalItem<Risk[]>('risks', MOCK_RISKS)
    let modified = false
    const mapped = risks.map(r => {
      // Remap legacy category (hr/legal/compliance) and status (mitigated/accepted/closed) on read
      const category = normalizeCategory(r.category)
      const status = normalizeStatus(r.status)
      if (category !== r.category || status !== r.status) modified = true

      if (!r.workflow_step) {
        modified = true
        return {
          ...r,
          category,
          status,
          workflow_step: status === 'solved' ? 'closed' : status === 'done' ? 'accepted' : 'registered',
          inherent_likelihood: r.likelihood,
          inherent_impact: r.impact,
          residual_likelihood: r.likelihood > 1 ? r.likelihood - 1 : 1,
          residual_impact: r.impact > 1 ? r.impact - 1 : 1,
          control_effectiveness: 'effective' as const,
          escalation_level: 'none' as const,
        }
      }
      return { ...r, category, status }
    })
    if (modified) {
      setLocalItem('risks', mapped)
    }
    return mapped
  },

  async saveRisk(risk: Risk): Promise<Risk> {
    const orgId = await getCurrentOrgId()
    const sanitized: Risk = {
      ...risk,
      id: ensureUUID(risk.id),
      org_id: orgId,
      owner_id: (risk.owner_id && isUUID(risk.owner_id)) ? risk.owner_id : undefined
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = {
        ...sanitized,
        owner_id: sanitized.owner_id || null
      }
      delete payload.owner_name
      const { data, error } = await supabase.from('risks').upsert(payload).select().single()
      if (error) console.error('Supabase saveRisk error:', error)
      if (!error && data) return data as Risk
    }
    const current = getLocalItem<Risk[]>('risks', MOCK_RISKS)
    const idx = current.findIndex(r => r.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = { ...sanitized, updated_at: new Date().toISOString() }
    } else {
      current.unshift(sanitized)
    }
    setLocalItem('risks', current)
    
    // Add to activity feed
    await this.addActivity({
      id: ensureUUID(),
      org_id: sanitized.org_id,
      action: idx >= 0 ? 'updated risk' : 'created risk',
      entity_type: 'risk',
      entity_id: sanitized.id,
      entity_title: sanitized.title,
      created_at: new Date().toISOString()
    })
    
    return sanitized
  },

  async deleteRisk(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('risks').delete().eq('id', id)
      if (error) console.error('Supabase deleteRisk error:', error)
      if (!error) return true
    }
    const current = getLocalItem<Risk[]>('risks', MOCK_RISKS)
    const filtered = current.filter(r => r.id !== id)
    setLocalItem('risks', filtered)
    return true
  },

  // ─── INCIDENTS ─────────────────────────────────────────────────────────────
  async getIncidents(): Promise<Incident[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Incident[]
    }
    return getLocalItem<Incident[]>('incidents', MOCK_INCIDENTS)
  },

  async saveIncident(incident: Incident): Promise<Incident> {
    const orgId = await getCurrentOrgId()
    const sanitized: Incident = {
      ...incident,
      id: ensureUUID(incident.id),
      org_id: orgId,
      assigned_to: (incident.assigned_to && isUUID(incident.assigned_to)) ? incident.assigned_to : undefined,
      reported_by: (incident.reported_by && isUUID(incident.reported_by)) ? incident.reported_by : undefined
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = {
        ...sanitized,
        assigned_to: sanitized.assigned_to || null,
        reported_by: sanitized.reported_by || null,
        risk_id: sanitized.risk_id || null,
        control_id: sanitized.control_id || null,
        process_id: sanitized.process_id || null,
      }
      // Only send columns that exist in the incidents table (priority is derived, not stored)
      const dbColumns = [
        'id', 'org_id', 'title', 'description', 'severity', 'status', 'workflow_stage',
        'assigned_to', 'reported_by', 'reporter_email', 'reporter_structure',
        'occurrence_datetime', 'discovery_datetime', 'likelihood', 'impact',
        'loss_effect', 'loss_amount', 'loss_currency', 'attached_files',
        'root_cause', 'root_cause_category', 'investigation_notes', 'investigation_lead',
        'investigation_members', 'investigation_start', 'investigation_end',
        'affected_systems', 'affected_departments',
        'acknowledged_at', 'sla_due_date', 'forwarded_at', 'forwarded_to',
        'risk_id', 'control_id', 'process_id',
        'resolution_summary', 'corrective_actions', 'lessons_learned', 'reputation_impact',
        'incident_residual_level',
        'resolved_at', 'closed_at', 'created_at', 'updated_at',
        'jira_issue_key', 'jira_issue_status', 'jira_last_sync', 'jira_project_key',
      ]
      for (const key of Object.keys(payload)) {
        if (!dbColumns.includes(key)) delete payload[key]
      }
      const { data, error } = await supabase.from('incidents').upsert(payload).select().single()
      if (error) console.error('Supabase saveIncident error:', error)
      if (!error && data) return data as Incident
    }
    const current = getLocalItem<Incident[]>('incidents', MOCK_INCIDENTS)
    const idx = current.findIndex(i => i.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = { ...sanitized, updated_at: new Date().toISOString() }
    } else {
      current.unshift(sanitized)
    }
    setLocalItem('incidents', current)

    await this.addActivity({
      id: ensureUUID(),
      org_id: sanitized.org_id,
      action: idx >= 0 ? 'updated incident' : 'reported incident',
      entity_type: 'incident',
      entity_id: sanitized.id,
      entity_title: sanitized.title,
      created_at: new Date().toISOString()
    })

    return sanitized
  },

  async deleteIncident(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('incidents').delete().eq('id', id)
      if (!error) return true
    }
    const current = getLocalItem<Incident[]>('incidents', MOCK_INCIDENTS)
    const filtered = current.filter(i => i.id !== id)
    setLocalItem('incidents', filtered)
    return true
  },

  // ─── COMPLIANCE CONTROLS ───────────────────────────────────────────────────
  async getControls(): Promise<Control[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('controls').select('*').order('control_id', { ascending: true })
      if (!error && data) return data as Control[]
    }
    return getLocalItem<Control[]>('controls', MOCK_CONTROLS)
  },

  async saveControl(control: Control): Promise<Control> {
    const orgId = await getCurrentOrgId()
    const sanitized: Control = {
      ...control,
      id: ensureUUID(control.id),
      org_id: orgId,
      reviewed_by: (control.reviewed_by && isUUID(control.reviewed_by)) ? control.reviewed_by : undefined
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = {
        ...sanitized,
        reviewed_by: sanitized.reviewed_by || null
      }
      const { data, error } = await supabase.from('controls').upsert(payload).select().single()
      if (error) console.error('Supabase saveControl error:', error)
      if (!error && data) return data as Control
    }
    const current = getLocalItem<Control[]>('controls', MOCK_CONTROLS)
    const idx = current.findIndex(c => c.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = { ...sanitized, reviewed_at: new Date().toISOString() }
    } else {
      current.unshift(sanitized)
    }
    setLocalItem('controls', current)

    await this.addActivity({
      id: ensureUUID(),
      org_id: sanitized.org_id,
      action: 'updated control review',
      entity_type: 'control',
      entity_id: sanitized.id,
      entity_title: `${sanitized.control_id} - ${sanitized.title}`,
      created_at: new Date().toISOString()
    })

    return sanitized
  },

  // ─── AUDITS & FINDINGS ─────────────────────────────────────────────────────
  async getAudits(): Promise<Audit[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('audits').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Audit[]
    }
    return getLocalItem<Audit[]>('audits', MOCK_AUDITS)
  },

  async saveAudit(audit: Audit): Promise<Audit> {
    const orgId = await getCurrentOrgId()
    const sanitized: Audit = {
      ...audit,
      id: ensureUUID(audit.id),
      org_id: orgId,
      auditor_id: (audit.auditor_id && isUUID(audit.auditor_id)) ? audit.auditor_id : undefined
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = {
        ...sanitized,
        auditor_id: sanitized.auditor_id || null
      }
      delete payload.auditor_name
      const { data, error } = await supabase.from('audits').upsert(payload).select().single()
      if (error) console.error('Supabase saveAudit error:', error)
      if (!error && data) return data as Audit
    }
    const current = getLocalItem<Audit[]>('audits', MOCK_AUDITS)
    const idx = current.findIndex(a => a.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = sanitized
    } else {
      current.unshift(sanitized)
    }
    setLocalItem('audits', current)

    await this.addActivity({
      id: ensureUUID(),
      org_id: sanitized.org_id,
      action: idx >= 0 ? 'updated audit' : 'created audit',
      entity_type: 'audit',
      entity_id: sanitized.id,
      entity_title: sanitized.title,
      created_at: new Date().toISOString()
    })

    return sanitized
  },

  async deleteAudit(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('audits').delete().eq('id', id)
      if (!error) return true
    }
    const current = getLocalItem<Audit[]>('audits', MOCK_AUDITS)
    const filtered = current.filter(a => a.id !== id)
    setLocalItem('audits', filtered)
    return true
  },

  async getFindings(): Promise<AuditFinding[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('audit_findings').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as AuditFinding[]
    }
    return getLocalItem<AuditFinding[]>('findings', MOCK_FINDINGS)
  },

  async saveFinding(finding: AuditFinding): Promise<AuditFinding> {
    const sanitized = {
      ...finding,
      id: ensureUUID(finding.id),
      audit_id: ensureUUID(finding.audit_id)
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('audit_findings').upsert(sanitized).select().single()
      if (error) console.error('Supabase saveFinding error:', error)
      if (!error && data) return data as AuditFinding
    }
    const current = getLocalItem<AuditFinding[]>('findings', MOCK_FINDINGS)
    const idx = current.findIndex(f => f.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = sanitized
    } else {
      current.unshift(sanitized)
    }
    setLocalItem('findings', current)
    return sanitized
  },

  async deleteFinding(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('audit_findings').delete().eq('id', id)
      if (!error) return true
    }
    const current = getLocalItem<AuditFinding[]>('findings', MOCK_FINDINGS)
    const filtered = current.filter(f => f.id !== id)
    setLocalItem('findings', filtered)
    return true
  },

  // ─── VENDORS ───────────────────────────────────────────────────────────────
  async getVendors(): Promise<Vendor[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('vendors').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Vendor[]
    }
    return getLocalItem<Vendor[]>('vendors', MOCK_VENDORS)
  },

  async saveVendor(vendor: Vendor): Promise<Vendor> {
    const orgId = await getCurrentOrgId()
    const sanitized = {
      ...vendor,
      id: ensureUUID(vendor.id),
      org_id: orgId
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('vendors').upsert(sanitized).select().single()
      if (error) console.error('Supabase saveVendor error:', error)
      if (!error && data) return data as Vendor
    }
    const current = getLocalItem<Vendor[]>('vendors', MOCK_VENDORS)
    const idx = current.findIndex(v => v.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = sanitized
    } else {
      current.unshift(sanitized)
    }
    setLocalItem('vendors', current)

    await this.addActivity({
      id: ensureUUID(),
      org_id: sanitized.org_id,
      action: idx >= 0 ? 'updated vendor profile' : 'added vendor',
      entity_type: 'vendor',
      entity_id: sanitized.id,
      entity_title: sanitized.name,
      created_at: new Date().toISOString()
    })

    return sanitized
  },

  async deleteVendor(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('vendors').delete().eq('id', id)
      if (!error) return true
    }
    const current = getLocalItem<Vendor[]>('vendors', MOCK_VENDORS)
    const filtered = current.filter(v => v.id !== id)
    setLocalItem('vendors', filtered)
    return true
  },

  // ─── ACTIVITIES ────────────────────────────────────────────────────────────
  async getActivities(): Promise<Activity[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Activity[]
    }
    return getLocalItem<Activity[]>('activities', MOCK_ACTIVITIES)
  },

  async addActivity(activity: Activity): Promise<Activity> {
    const orgId = await getCurrentOrgId()
    const sanitized: Activity = {
      ...activity,
      id: ensureUUID(activity.id),
      org_id: orgId,
      user_id: (activity.user_id && isUUID(activity.user_id)) ? activity.user_id : undefined,
      entity_id: (activity.entity_id && isUUID(activity.entity_id)) ? activity.entity_id : undefined
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = {
        ...sanitized,
        user_id: sanitized.user_id || null,
        entity_id: sanitized.entity_id || null
      }
      delete payload.user_name
      const { data, error } = await supabase.from('activities').insert(payload).select().single()
      if (error) console.error('Supabase addActivity error:', error)
      if (!error && data) return data as Activity
    }
    const current = getLocalItem<Activity[]>('activities', MOCK_ACTIVITIES)
    current.unshift(sanitized)
    setLocalItem('activities', current)
    return sanitized
  },

  // ─── DASHBOARD STATS ───────────────────────────────────────────────────────
  async getDashboardStats(): Promise<DashboardStats> {
    // Generate dashboard stats dynamically based on the current risks, incidents, compliance controls, and vendors
    const risks = await this.getRisks()
    const incidents = await this.getIncidents()
    const controls = await this.getControls()
    const vendors = await this.getVendors()

    const openRisks = risks.filter(r => ACTIVE_STATUSES.includes(normalizeStatus(r.status)))
    const criticalRisks = openRisks.filter(r => r.level === 'critical').length
    const openIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length
    const incidentsInvestigating = incidents.filter(i => i.status === 'investigating').length

    const passedControls = controls.filter(c => c.status === 'pass').length
    const failingControls = controls.filter(c => c.status === 'fail').length
    const totalControls = controls.filter(c => c.status !== 'na').length
    const complianceScore = totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 100

    const activeVendors = vendors.filter(v => v.status === 'active').length
    const vendorsUnderReview = vendors.filter(v => v.status === 'under_review').length

    const riskByLevel = {
      minimal: risks.filter(r => r.level === 'minimal').length,
      low: risks.filter(r => r.level === 'low').length,
      medium: risks.filter(r => r.level === 'medium').length,
      high: risks.filter(r => r.level === 'high').length,
      critical: risks.filter(r => r.level === 'critical').length
    }

    const riskByCategory = RISK_CATEGORIES.reduce((acc, c) => {
      acc[c.value] = risks.filter(r => normalizeCategory(r.category) === c.value).length
      return acc
    }, {} as DashboardStats['risk_by_category'])

    // Real cumulative trend over the last 14 days, from created_at dates.
    // Cumulative so a risk added on a day stays counted on every following day.
    const TREND_DAYS = 14
    const buildTrend = (items: { created_at?: string }[]) => {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const series: { month: string; count: number }[] = []
      for (let i = TREND_DAYS - 1; i >= 0; i--) {
        const day = new Date(today); day.setDate(today.getDate() - i)
        const end = new Date(day); end.setDate(day.getDate() + 1)
        const count = items.filter(it => it.created_at && new Date(it.created_at).getTime() < end.getTime()).length
        series.push({ month: `${day.getDate()}/${day.getMonth() + 1}`, count })
      }
      return series
    }

    return {
      total_risks: risks.length,
      critical_risks: criticalRisks,
      open_incidents: openIncidents,
      incidents_investigating: incidentsInvestigating,
      compliance_score: complianceScore,
      controls_failing: failingControls,
      active_vendors: activeVendors,
      vendors_under_review: vendorsUnderReview,
      risk_by_level: riskByLevel,
      risk_by_category: riskByCategory,
      monthly_risks: buildTrend(risks),
      monthly_incidents: buildTrend(incidents)
    }
  },

  // ─── JIRA INTEGRATION ──────────────────────────────────────────────────────
  async getJiraConfig(): Promise<JiraConfig> {
    const defaultConfig: JiraConfig = {
      instanceUrl: '',
      email: '',
      apiToken: '',
      connected: false,
      projectMapping: { risks: 'RMK', incidents: 'SEC' },
      issueTypeMapping: { risks: 'Task', incidents: 'Bug' }
    }
    return getLocalItem<JiraConfig>('jira_config', defaultConfig)
  },

  async saveJiraConfig(config: JiraConfig): Promise<JiraConfig> {
    setLocalItem('jira_config', config)
    return config
  },

  async getJiraActivities(issueKey: string): Promise<JiraActivity[]> {
    const defaultActivities: JiraActivity[] = [
      {
        id: 'ja1',
        key: issueKey,
        action: 'Issue Created in Jira',
        actor: 'RiskShield Integrator',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'ja2',
        key: issueKey,
        action: 'Assigned to Leyla Mammadova (Risk Owner)',
        actor: 'Jira Automator',
        created_at: new Date(Date.now() - 3600000 * 1.8).toISOString()
      },
      {
        id: 'ja3',
        key: issueKey,
        action: 'Transitioned status to IN PROGRESS',
        actor: 'Leyla Mammadova',
        created_at: new Date(Date.now() - 3600000 * 0.5).toISOString()
      }
    ]
    return getLocalItem<JiraActivity[]>(`jira_activities_${issueKey}`, defaultActivities)
  },

  async getJiraComments(issueKey: string): Promise<JiraComment[]> {
    const defaultComments: JiraComment[] = [
      {
        id: 'jc1',
        author: 'Jira Automator',
        content: 'Automatically linked to RiskShield risk register item. Please review mitigation checklist.',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        author: 'Leyla Mammadova',
        content: 'I have started documenting the mitigation steps in the wiki page. WAF rule deployment in progress.',
        created_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
        id: 'jc2'
      }
    ]
    return getLocalItem<JiraComment[]>(`jira_comments_${issueKey}`, defaultComments)
  },

  async addJiraComment(issueKey: string, content: string, author: string): Promise<JiraComment> {
    const comments = await this.getJiraComments(issueKey)
    const newComment: JiraComment = {
      id: Math.random().toString(36).substr(2, 9),
      author,
      content,
      created_at: new Date().toISOString()
    }
    comments.push(newComment)
    setLocalItem(`jira_comments_${issueKey}`, comments)
    return newComment
  },

  async syncRiskToJira(riskId: string): Promise<Risk> {
    const risks = await this.getRisks()
    const config = await this.getJiraConfig()
    const risk = risks.find(r => r.id === riskId)
    if (!risk) throw new Error('Risk not found')

    const randomNum = Math.floor(100 + Math.random() * 900)
    const projectKey = config.projectMapping.risks || 'RMK'
    const issueKey = `${projectKey}-${randomNum}`

    risk.jira_issue_key = issueKey
    risk.jira_issue_status = 'In Progress'
    risk.jira_last_sync = new Date().toISOString()
    risk.jira_project_key = projectKey

    await this.saveRisk(risk)

    // Seed activities
    await this.getJiraActivities(issueKey)
    // Seed comments
    await this.getJiraComments(issueKey)

    // Add activity
    await this.addActivity({
      id: Math.random().toString(36).substr(2, 9),
      org_id: risk.org_id || 'org1',
      action: `synced to Jira issue ${issueKey}`,
      entity_type: 'risk',
      entity_id: risk.id,
      entity_title: risk.title,
      created_at: new Date().toISOString()
    })

    return risk
  },

  async syncIncidentToJira(incidentId: string): Promise<Incident> {
    const incidents = await this.getIncidents()
    const config = await this.getJiraConfig()
    const incident = incidents.find(i => i.id === incidentId)
    if (!incident) throw new Error('Incident not found')

    const randomNum = Math.floor(100 + Math.random() * 900)
    const projectKey = config.projectMapping.incidents || 'SEC'
    const issueKey = `${projectKey}-${randomNum}`

    incident.jira_issue_key = issueKey
    incident.jira_issue_status = 'In Progress'
    incident.jira_last_sync = new Date().toISOString()
    incident.jira_project_key = projectKey

    await this.saveIncident(incident)

    // Seed activities
    await this.getJiraActivities(issueKey)
    // Seed comments
    await this.getJiraComments(issueKey)

    // Add activity
    await this.addActivity({
      id: Math.random().toString(36).substr(2, 9),
      org_id: incident.org_id || 'org1',
      action: `escalated to Jira issue ${issueKey}`,
      entity_type: 'incident',
      entity_id: incident.id,
      entity_title: incident.title,
      created_at: new Date().toISOString()
    })

    return incident
  },

  async syncJiraIssueStatus(issueKey: string, newStatus: string): Promise<boolean> {
    // Sync risk status
    const risks = await this.getRisks()
    const risk = risks.find(r => r.jira_issue_key === issueKey)
    if (risk) {
      risk.jira_issue_status = newStatus
      risk.jira_last_sync = new Date().toISOString()
      
      // Map Jira statuses to RiskShield status
      if (newStatus === 'Done' || newStatus === 'Resolved') {
        risk.status = 'done'
      } else if (newStatus === 'In Progress') {
        risk.status = 'in_progress'
      }
      
      await this.saveRisk(risk)
      
      // Add a jira activity log
      const activities = await this.getJiraActivities(issueKey)
      activities.push({
        id: Math.random().toString(36).substr(2, 9),
        key: issueKey,
        action: `Transitioned status to ${newStatus.toUpperCase()}`,
        actor: 'Jira Webhook',
        created_at: new Date().toISOString()
      })
      setLocalItem(`jira_activities_${issueKey}`, activities)
      return true
    }

    // Sync incident status
    const incidents = await this.getIncidents()
    const incident = incidents.find(i => i.jira_issue_key === issueKey)
    if (incident) {
      incident.jira_issue_status = newStatus
      incident.jira_last_sync = new Date().toISOString()
      
      // Map Jira statuses to Incident status
      if (newStatus === 'Done' || newStatus === 'Resolved') {
        incident.status = 'resolved'
        incident.resolved_at = new Date().toISOString()
      } else if (newStatus === 'In Progress') {
        incident.status = 'investigating'
      }
      
      await this.saveIncident(incident)
      
      // Add a jira activity log
      const activities = await this.getJiraActivities(issueKey)
      activities.push({
        id: Math.random().toString(36).substr(2, 9),
        key: issueKey,
        action: `Transitioned status to ${newStatus.toUpperCase()}`,
        actor: 'Jira Webhook',
        created_at: new Date().toISOString()
      })
      setLocalItem(`jira_activities_${issueKey}`, activities)
      return true
    }

    return false
  },

  // ─── COMPLIANCE OBLIGATIONS ─────────────────────────────────────────────────
  async getObligations(): Promise<ComplianceObligation[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('compliance_obligations')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) return data as ComplianceObligation[]
    }
    return getLocalItem<ComplianceObligation[]>('compliance_obligations', [])
  },

  async saveObligation(item: ComplianceObligation): Promise<ComplianceObligation> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    const sanitized: ComplianceObligation = {
      ...item,
      id: ensureUUID(item.id),
      org_id: orgId,
      updated_at: now,
    }
    const existingList = await this.getObligations()
    const prior = existingList.find(o => o.id === sanitized.id) ?? null
    // Auto-generate obligation_code if missing (COMP-OBL-YYYY-NNN)
    if (!sanitized.obligation_code) {
      const year = new Date().getFullYear()
      const seq = existingList.length + 1
      sanitized.obligation_code = `COMP-OBL-${year}-${String(seq).padStart(3, '0')}`
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = { ...sanitized }
      const dbColumns = [
        'id', 'org_id', 'obligation_code', 'title', 'description', 'compliance_condition',
        'source', 'source_type', 'obligation_type', 'source_reference', 'source_url', 'regulator',
        'accountable_owner', 'responsible_party', 'responsible_role', 'responsible_structure',
        'applicable_depts', 'evidence',
        'status', 'criticality', 'primary_risk_id', 'noncompliance_risk', 'materialized_risk_id',
        'effective_date', 'next_review_date',
        'created_at', 'updated_at'
      ]
      for (const key of Object.keys(payload)) {
        if (!dbColumns.includes(key)) delete payload[key]
      }
      const { data, error } = await supabase
        .from('compliance_obligations')
        .upsert(payload)
        .select()
        .single()
      if (error) console.error('Supabase saveObligation error:', error)
      if (!error && data) {
        await this.logObligationChange(prior, sanitized)
        return data as ComplianceObligation
      }
    }
    const current = getLocalItem<ComplianceObligation[]>('compliance_obligations', [])
    const idx = current.findIndex(i => i.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = sanitized
    } else {
      current.unshift(sanitized)
    }
    setLocalItem('compliance_obligations', current)
    await this.logObligationChange(prior, sanitized)
    return sanitized
  },

  async deleteObligation(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      // links + audit logs are removed by ON DELETE CASCADE
      await supabase.from('compliance_obligations').delete().eq('id', id)
    }
    const current = getLocalItem<ComplianceObligation[]>('compliance_obligations', [])
    setLocalItem('compliance_obligations', current.filter(i => i.id !== id))
    // Mock mode: clean up links + audit manually (no cascade)
    setLocalItem('obligation_risk_links', getLocalItem<any[]>('obligation_risk_links', []).filter(l => l.obligation_id !== id))
    setLocalItem('obligation_control_links', getLocalItem<any[]>('obligation_control_links', []).filter(l => l.obligation_id !== id))
    setLocalItem('obligation_audit_logs', getLocalItem<ObligationAuditLog[]>('obligation_audit_logs', []).filter(l => l.obligation_id !== id))
  },

  // ── Obligation audit trail (ISO 37301 traceability) ──────────────────────────
  // Compares prior vs next and records a change entry (created / status_changed / updated).
  async logObligationChange(prior: ComplianceObligation | null, next: ComplianceObligation): Promise<void> {
    const fields: (keyof ComplianceObligation)[] = [
      'title', 'description', 'compliance_condition', 'source', 'source_type', 'obligation_type',
      'source_reference', 'source_url', 'regulator', 'accountable_owner', 'responsible_party',
      'responsible_role', 'responsible_structure', 'applicable_depts', 'evidence',
      'status', 'criticality', 'primary_risk_id', 'effective_date', 'next_review_date',
    ]
    let action = 'created'
    let oldValue: Record<string, unknown> | null = null
    let newValue: Record<string, unknown> | null = { title: next.title, status: next.status, criticality: next.criticality }
    if (prior) {
      if (prior.status !== next.status) {
        action = 'status_changed'
        oldValue = { status: prior.status }
        newValue = { status: next.status }
      } else {
        const changed = fields.filter(f => JSON.stringify((prior as any)[f] ?? null) !== JSON.stringify((next as any)[f] ?? null))
        if (changed.length === 0) return
        action = 'updated'
        oldValue = Object.fromEntries(changed.map(f => [f, (prior as any)[f] ?? null]))
        newValue = Object.fromEntries(changed.map(f => [f, (next as any)[f] ?? null]))
      }
    }
    await this.addObligationAudit({
      id: ensureUUID(),
      org_id: next.org_id,
      obligation_id: next.id,
      changed_by: (await getCurrentProfile())?.full_name ?? 'System',
      action,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString(),
    })
  },

  async addObligationAudit(log: ObligationAuditLog): Promise<void> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('obligation_audit_logs').insert({
        id: log.id, org_id: log.org_id, obligation_id: log.obligation_id,
        changed_by: log.changed_by, action: log.action,
        old_value: log.old_value ?? null, new_value: log.new_value ?? null,
        created_at: log.created_at,
      })
      if (error) console.error('Supabase addObligationAudit error:', error)
      if (!error) return
    }
    const current = getLocalItem<ObligationAuditLog[]>('obligation_audit_logs', [])
    current.unshift(log)
    setLocalItem('obligation_audit_logs', current)
  },

  async getObligationAuditLog(obligationId: string): Promise<ObligationAuditLog[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('obligation_audit_logs').select('*')
        .eq('obligation_id', obligationId)
        .order('created_at', { ascending: false })
      if (!error && data) return data as ObligationAuditLog[]
    }
    return getLocalItem<ObligationAuditLog[]>('obligation_audit_logs', [])
      .filter(l => l.obligation_id === obligationId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  // ── Obligation ↔ Risk / Control links (M:N) ──────────────────────────────────
  async getObligationRiskIds(obligationId: string): Promise<string[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('obligation_risk_links').select('risk_id').eq('obligation_id', obligationId)
      if (!error && data) return (data as any[]).map(r => r.risk_id)
    }
    return getLocalItem<any[]>('obligation_risk_links', []).filter(l => l.obligation_id === obligationId).map(l => l.risk_id)
  },

  async setObligationRisks(obligationId: string, riskIds: string[]): Promise<void> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('obligation_risk_links').delete().eq('obligation_id', obligationId)
      if (riskIds.length > 0) {
        const rows = riskIds.map(rid => ({ id: ensureUUID(), org_id: orgId, obligation_id: obligationId, risk_id: rid, created_at: now }))
        const { error } = await supabase.from('obligation_risk_links').insert(rows)
        if (error) console.error('Supabase setObligationRisks error:', error)
      }
      return
    }
    const all = getLocalItem<any[]>('obligation_risk_links', []).filter(l => l.obligation_id !== obligationId)
    riskIds.forEach(rid => all.push({ id: ensureUUID(), org_id: orgId, obligation_id: obligationId, risk_id: rid, created_at: now }))
    setLocalItem('obligation_risk_links', all)
  },

  async getObligationControlIds(obligationId: string): Promise<string[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('obligation_control_links').select('control_id').eq('obligation_id', obligationId)
      if (!error && data) return (data as any[]).map(r => r.control_id)
    }
    return getLocalItem<any[]>('obligation_control_links', []).filter(l => l.obligation_id === obligationId).map(l => l.control_id)
  },

  async setObligationControls(obligationId: string, controlIds: string[]): Promise<void> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('obligation_control_links').delete().eq('obligation_id', obligationId)
      if (controlIds.length > 0) {
        const rows = controlIds.map(cid => ({ id: ensureUUID(), org_id: orgId, obligation_id: obligationId, control_id: cid, created_at: now }))
        const { error } = await supabase.from('obligation_control_links').insert(rows)
        if (error) console.error('Supabase setObligationControls error:', error)
      }
      return
    }
    const all = getLocalItem<any[]>('obligation_control_links', []).filter(l => l.obligation_id !== obligationId)
    controlIds.forEach(cid => all.push({ id: ensureUUID(), org_id: orgId, obligation_id: obligationId, control_id: cid, created_at: now }))
    setLocalItem('obligation_control_links', all)
  },

  async getObligationPolicyIds(obligationId: string): Promise<string[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('obligation_policy_links').select('policy_id').eq('obligation_id', obligationId)
      if (!error && data) return (data as any[]).map(r => r.policy_id)
    }
    return getLocalItem<any[]>('obligation_policy_links', []).filter(l => l.obligation_id === obligationId).map(l => l.policy_id)
  },

  async setObligationPolicies(obligationId: string, policyIds: string[]): Promise<void> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('obligation_policy_links').delete().eq('obligation_id', obligationId)
      if (policyIds.length > 0) {
        const rows = policyIds.map(pid => ({ id: ensureUUID(), org_id: orgId, obligation_id: obligationId, policy_id: pid, created_at: now }))
        const { error } = await supabase.from('obligation_policy_links').insert(rows)
        if (error) console.error('Supabase setObligationPolicies error:', error)
      }
      return
    }
    const all = getLocalItem<any[]>('obligation_policy_links', []).filter(l => l.obligation_id !== obligationId)
    policyIds.forEach(pid => all.push({ id: ensureUUID(), org_id: orgId, obligation_id: obligationId, policy_id: pid, created_at: now }))
    setLocalItem('obligation_policy_links', all)
  },

  // Risk/control/policy link counts per obligation (for the register table)
  async getObligationLinkCounts(): Promise<Record<string, { risks: number; controls: number; policies: number }>> {
    const counts: Record<string, { risks: number; controls: number; policies: number }> = {}
    const bump = (id: string, key: 'risks' | 'controls' | 'policies') => {
      if (!counts[id]) counts[id] = { risks: 0, controls: 0, policies: 0 }
      counts[id][key]++
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const [{ data: rl }, { data: cl }, { data: pl }] = await Promise.all([
        supabase.from('obligation_risk_links').select('obligation_id'),
        supabase.from('obligation_control_links').select('obligation_id'),
        supabase.from('obligation_policy_links').select('obligation_id'),
      ])
      ;((rl as any[]) ?? []).forEach(r => bump(r.obligation_id, 'risks'))
      ;((cl as any[]) ?? []).forEach(c => bump(c.obligation_id, 'controls'))
      ;((pl as any[]) ?? []).forEach(p => bump(p.obligation_id, 'policies'))
      return counts
    }
    getLocalItem<any[]>('obligation_risk_links', []).forEach(l => bump(l.obligation_id, 'risks'))
    getLocalItem<any[]>('obligation_control_links', []).forEach(l => bump(l.obligation_id, 'controls'))
    getLocalItem<any[]>('obligation_policy_links', []).forEach(l => bump(l.obligation_id, 'policies'))
    return counts
  },

  // Per-obligation control + policy id arrays (for showing codes in the register)
  async getObligationLinkMaps(): Promise<Record<string, { controlIds: string[]; policyIds: string[] }>> {
    const maps: Record<string, { controlIds: string[]; policyIds: string[] }> = {}
    const ensure = (id: string) => { if (!maps[id]) maps[id] = { controlIds: [], policyIds: [] }; return maps[id] }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const [{ data: cl }, { data: pl }] = await Promise.all([
        supabase.from('obligation_control_links').select('obligation_id, control_id'),
        supabase.from('obligation_policy_links').select('obligation_id, policy_id'),
      ])
      ;((cl as any[]) ?? []).forEach(c => ensure(c.obligation_id).controlIds.push(c.control_id))
      ;((pl as any[]) ?? []).forEach(p => ensure(p.obligation_id).policyIds.push(p.policy_id))
      return maps
    }
    getLocalItem<any[]>('obligation_control_links', []).forEach(l => ensure(l.obligation_id).controlIds.push(l.control_id))
    getLocalItem<any[]>('obligation_policy_links', []).forEach(l => ensure(l.obligation_id).policyIds.push(l.policy_id))
    return maps
  },

  // ─── REGULATORY CHANGE MANAGEMENT ────────────────────────────────────────────
  async getRegulatoryChanges(): Promise<RegulatoryChange[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('regulatory_changes').select('*').order('created_at', { ascending: false })
      if (error) console.error('Supabase getRegulatoryChanges error:', error)
      if (!error && data) return data as RegulatoryChange[]
    }
    return getLocalItem<RegulatoryChange[]>('regulatory_changes', MOCK_REGULATORY_CHANGES)
  },

  async saveRegulatoryChange(item: RegulatoryChange): Promise<RegulatoryChange> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    const sanitized: RegulatoryChange = { ...item, id: ensureUUID(item.id), org_id: orgId, updated_at: now }
    if (!sanitized.change_code) {
      const existing = await this.getRegulatoryChanges()
      const year = new Date().getFullYear()
      sanitized.change_code = `RCM-${year}-${String(existing.length + 1).padStart(3, '0')}`
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = { ...sanitized }
      const dbColumns = [
        'id', 'org_id', 'change_code', 'title', 'source', 'regulator', 'change_date', 'effective_date',
        'description', 'impact_assessment', 'business_effect', 'assessor', 'action_plan',
        'responsible_structure', 'responsible_person', 'requirement_link_id',
        'status', 'created_at', 'updated_at'
      ]
      for (const key of Object.keys(payload)) {
        if (!dbColumns.includes(key)) delete payload[key]
      }
      const { data, error } = await supabase.from('regulatory_changes').upsert(payload).select().single()
      if (error) console.error('Supabase saveRegulatoryChange error:', error)
      if (!error && data) return data as RegulatoryChange
    }
    const current = getLocalItem<RegulatoryChange[]>('regulatory_changes', [])
    const idx = current.findIndex(i => i.id === sanitized.id)
    if (idx >= 0) current[idx] = sanitized
    else current.unshift(sanitized)
    setLocalItem('regulatory_changes', current)
    return sanitized
  },

  async deleteRegulatoryChange(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('regulatory_changes').delete().eq('id', id)
    }
    const current = getLocalItem<RegulatoryChange[]>('regulatory_changes', [])
    setLocalItem('regulatory_changes', current.filter(i => i.id !== id))
    setLocalItem('regulatory_change_links', getLocalItem<any[]>('regulatory_change_links', []).filter(l => l.change_id !== id))
  },

  async getRegulatoryChangeObligationIds(changeId: string): Promise<string[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('regulatory_change_links').select('obligation_id').eq('change_id', changeId)
      if (!error && data) return (data as any[]).map(r => r.obligation_id)
    }
    return getLocalItem<any[]>('regulatory_change_links', []).filter(l => l.change_id === changeId).map(l => l.obligation_id)
  },

  async setRegulatoryChangeObligations(changeId: string, obligationIds: string[]): Promise<void> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('regulatory_change_links').delete().eq('change_id', changeId)
      if (obligationIds.length > 0) {
        const rows = obligationIds.map(oid => ({ id: ensureUUID(), org_id: orgId, change_id: changeId, obligation_id: oid, created_at: now }))
        const { error } = await supabase.from('regulatory_change_links').insert(rows)
        if (error) console.error('Supabase setRegulatoryChangeObligations error:', error)
      }
      return
    }
    const all = getLocalItem<any[]>('regulatory_change_links', []).filter(l => l.change_id !== changeId)
    obligationIds.forEach(oid => all.push({ id: ensureUUID(), org_id: orgId, change_id: changeId, obligation_id: oid, created_at: now }))
    setLocalItem('regulatory_change_links', all)
  },

  async getRegulatoryChangeAffectedCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('regulatory_change_links').select('change_id')
      ;((data as any[]) ?? []).forEach(r => { counts[r.change_id] = (counts[r.change_id] ?? 0) + 1 })
      return counts
    }
    getLocalItem<any[]>('regulatory_change_links', []).forEach(l => { counts[l.change_id] = (counts[l.change_id] ?? 0) + 1 })
    return counts
  },

  // ─── INTERESTED PARTIES (ISO 37301/37001) ────────────────────────────────────
  async getInterestedParties(): Promise<InterestedParty[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('interested_parties').select('*').order('created_at', { ascending: false })
      if (error) console.error('Supabase getInterestedParties error:', error)
      if (!error && data) return data as InterestedParty[]
    }
    return getLocalItem<InterestedParty[]>('interested_parties', [])
  },

  async saveInterestedParty(item: InterestedParty): Promise<InterestedParty> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    const sanitized: InterestedParty = { ...item, id: ensureUUID(item.id), org_id: orgId, updated_at: now }
    if (!sanitized.party_code) {
      const existing = await this.getInterestedParties()
      const year = new Date().getFullYear()
      sanitized.party_code = `IP-${year}-${String(existing.length + 1).padStart(3, '0')}`
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = { ...sanitized }
      const dbColumns = [
        'id', 'org_id', 'party_code', 'name', 'party_type',
        'needs_expectations', 'influence', 'owner', 'notes',
        'created_at', 'updated_at',
      ]
      for (const key of Object.keys(payload)) {
        if (!dbColumns.includes(key)) delete payload[key]
      }
      const { data, error } = await supabase.from('interested_parties').upsert(payload).select().single()
      if (error) console.error('Supabase saveInterestedParty error:', error)
      if (!error && data) return data as InterestedParty
    }
    const current = getLocalItem<InterestedParty[]>('interested_parties', [])
    const idx = current.findIndex(i => i.id === sanitized.id)
    if (idx >= 0) current[idx] = sanitized
    else current.unshift(sanitized)
    setLocalItem('interested_parties', current)
    return sanitized
  },

  async deleteInterestedParty(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('interested_parties').delete().eq('id', id)
    }
    const current = getLocalItem<InterestedParty[]>('interested_parties', [])
    setLocalItem('interested_parties', current.filter(i => i.id !== id))
    setLocalItem('party_obligation_links', getLocalItem<any[]>('party_obligation_links', []).filter(l => l.party_id !== id))
  },

  // ── Interested Party ↔ Obligation links (M:N) ────────────────────────────────
  async getPartyObligationIds(partyId: string): Promise<string[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('party_obligation_links').select('obligation_id').eq('party_id', partyId)
      if (!error && data) return (data as any[]).map(r => r.obligation_id)
    }
    return getLocalItem<any[]>('party_obligation_links', []).filter(l => l.party_id === partyId).map(l => l.obligation_id)
  },

  async setPartyObligations(partyId: string, obligationIds: string[]): Promise<void> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('party_obligation_links').delete().eq('party_id', partyId)
      if (obligationIds.length > 0) {
        const rows = obligationIds.map(oid => ({ id: ensureUUID(), org_id: orgId, party_id: partyId, obligation_id: oid, created_at: now }))
        const { error } = await supabase.from('party_obligation_links').insert(rows)
        if (error) console.error('Supabase setPartyObligations error:', error)
      }
      return
    }
    const all = getLocalItem<any[]>('party_obligation_links', []).filter(l => l.party_id !== partyId)
    obligationIds.forEach(oid => all.push({ id: ensureUUID(), org_id: orgId, party_id: partyId, obligation_id: oid, created_at: now }))
    setLocalItem('party_obligation_links', all)
  },

  async getPartyObligationCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('party_obligation_links').select('party_id')
      ;((data as any[]) ?? []).forEach(r => { counts[r.party_id] = (counts[r.party_id] ?? 0) + 1 })
      return counts
    }
    getLocalItem<any[]>('party_obligation_links', []).forEach(l => { counts[l.party_id] = (counts[l.party_id] ?? 0) + 1 })
    return counts
  },

  // ─── BUSINESS PROCESSES (Control Map) ────────────────────────────────────────
  async getProcesses(): Promise<Process[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('processes').select('*').order('created_at', { ascending: false })
      if (error) console.error('Supabase getProcesses error:', error)
      if (!error && data) return data as Process[]
    }
    return getLocalItem<Process[]>('processes', [])
  },

  async saveProcess(item: Process): Promise<Process> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    const sanitized: Process = { ...item, id: ensureUUID(item.id), org_id: orgId, updated_at: now }
    if (!sanitized.code) {
      const existing = await this.getProcesses()
      const year = new Date().getFullYear()
      sanitized.code = `PRC-${year}-${String(existing.length + 1).padStart(3, '0')}`
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = { ...sanitized }
      const dbColumns = ['id', 'org_id', 'code', 'name', 'owner_dept', 'description', 'created_at', 'updated_at']
      for (const key of Object.keys(payload)) {
        if (!dbColumns.includes(key)) delete payload[key]
      }
      const { data, error } = await supabase.from('processes').upsert(payload).select().single()
      if (error) console.error('Supabase saveProcess error:', error)
      if (!error && data) return data as Process
    }
    const current = getLocalItem<Process[]>('processes', [])
    const idx = current.findIndex(p => p.id === sanitized.id)
    if (idx >= 0) current[idx] = sanitized
    else current.unshift(sanitized)
    setLocalItem('processes', current)
    return sanitized
  },

  async deleteProcess(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('processes').delete().eq('id', id)
    }
    setLocalItem('processes', getLocalItem<Process[]>('processes', []).filter(p => p.id !== id))
    setLocalItem('process_control_links', getLocalItem<any[]>('process_control_links', []).filter(l => l.process_id !== id))
  },

  async getProcessControlIds(processId: string): Promise<string[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('process_control_links').select('control_id').eq('process_id', processId)
      if (!error && data) return (data as any[]).map(r => r.control_id)
    }
    return getLocalItem<any[]>('process_control_links', []).filter(l => l.process_id === processId).map(l => l.control_id)
  },

  async setProcessControls(processId: string, controlIds: string[]): Promise<void> {
    const orgId = await getCurrentOrgId()
    const now = new Date().toISOString()
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      await supabase.from('process_control_links').delete().eq('process_id', processId)
      if (controlIds.length > 0) {
        const rows = controlIds.map(cid => ({ id: ensureUUID(), org_id: orgId, process_id: processId, control_id: cid, created_at: now }))
        const { error } = await supabase.from('process_control_links').insert(rows)
        if (error) console.error('Supabase setProcessControls error:', error)
      }
      return
    }
    const all = getLocalItem<any[]>('process_control_links', []).filter(l => l.process_id !== processId)
    controlIds.forEach(cid => all.push({ id: ensureUUID(), org_id: orgId, process_id: processId, control_id: cid, created_at: now }))
    setLocalItem('process_control_links', all)
  },

  async getProcessControlCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('process_control_links').select('process_id')
      ;((data as any[]) ?? []).forEach(r => { counts[r.process_id] = (counts[r.process_id] ?? 0) + 1 })
      return counts
    }
    getLocalItem<any[]>('process_control_links', []).forEach(l => { counts[l.process_id] = (counts[l.process_id] ?? 0) + 1 })
    return counts
  },

  // ─── GRC INTAKE ITEMS ──────────────────────────────────────────────────────
  async getGRCIntakeItems(): Promise<GRCIntakeItem[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('grc_intake_items').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as GRCIntakeItem[]
    }
    return getLocalItem<GRCIntakeItem[]>('grc_intake_items', [])
  },

  async saveGRCIntakeItem(item: GRCIntakeItem): Promise<GRCIntakeItem> {
    const orgId = await getCurrentOrgId()
    const sanitized = {
      ...item,
      id: ensureUUID(item.id),
      org_id: orgId
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = { ...sanitized }
      const dbColumns = [
        'id', 'org_id', 'type', 'title', 'description', 'classification',
        'mapped_control_ids', 'evidence_url', 'evidence_note', 'status',
        'step', 'gap_identified', 'risk_creation_required', 'risk_created_id',
        'created_at'
      ]
      for (const key of Object.keys(payload)) {
        if (!dbColumns.includes(key)) {
          delete payload[key]
        }
      }
      const { data, error } = await supabase.from('grc_intake_items').upsert(payload).select().single()
      if (error) console.error('Supabase saveGRCIntakeItem error:', error)
      if (!error && data) return data as GRCIntakeItem
    }
    const current = getLocalItem<GRCIntakeItem[]>('grc_intake_items', [])
    const idx = current.findIndex(i => i.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = sanitized
    } else {
      current.unshift(sanitized)
    }
    setLocalItem('grc_intake_items', current)

    await this.addActivity({
      id: ensureUUID(),
      org_id: sanitized.org_id,
      action: idx >= 0 ? `updated intake: ${sanitized.title}` : `registered new GRC intake: ${sanitized.title}`,
      entity_type: 'intake',
      entity_id: sanitized.id,
      entity_title: sanitized.title,
      created_at: new Date().toISOString()
    })

    return sanitized
  },

  async deleteGRCIntakeItem(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('grc_intake_items').delete().eq('id', id)
      if (!error) return true
    }
    const current = getLocalItem<GRCIntakeItem[]>('grc_intake_items', [])
    const filtered = current.filter(i => i.id !== id)
    setLocalItem('grc_intake_items', filtered)
    return true
  },

  // ─── PROFILES (users) ──────────────────────────────────────────────────────
  async getProfiles(): Promise<UserProfile[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (!error && data) return data as UserProfile[]
    }
    return MOCK_USERS
  },

  // ─── ORG STRUCTURE (org_units) ─────────────────────────────────────────────
  async getOrgUnits(): Promise<OrgUnit[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('org_units').select('*').order('order_index', { ascending: true })
      if (!error && data) return data as OrgUnit[]
    }
    return getLocalItem<OrgUnit[]>('org_units', SEED_ORG_UNITS)
  },

  async saveOrgUnit(unit: OrgUnit): Promise<OrgUnit> {
    const orgId = await getCurrentOrgId()
    const sanitized: OrgUnit = {
      ...unit,
      id: ensureUUID(unit.id),
      org_id: orgId,
      parent_id: (unit.parent_id && isUUID(unit.parent_id)) ? unit.parent_id : undefined,
      head_user_id: (unit.head_user_id && isUUID(unit.head_user_id)) ? unit.head_user_id : undefined,
      updated_at: new Date().toISOString()
    }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const payload: any = {
        ...sanitized,
        parent_id: sanitized.parent_id || null,
        head_user_id: sanitized.head_user_id || null
      }
      const { data, error } = await supabase.from('org_units').upsert(payload).select().single()
      if (error) console.error('Supabase saveOrgUnit error:', error)
      if (!error && data) return data as OrgUnit
    }
    const current = getLocalItem<OrgUnit[]>('org_units', SEED_ORG_UNITS)
    const idx = current.findIndex(u => u.id === sanitized.id)
    if (idx >= 0) {
      current[idx] = sanitized
    } else {
      current.push(sanitized)
    }
    setLocalItem('org_units', current)
    return sanitized
  },

  async deleteOrgUnit(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('org_units').delete().eq('id', id)
      if (!error) return true
    }
    const current = getLocalItem<OrgUnit[]>('org_units', SEED_ORG_UNITS)
    setLocalItem('org_units', current.filter(u => u.id !== id))
    return true
  }
}
