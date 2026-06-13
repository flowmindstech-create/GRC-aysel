'use client'

import {
  MOCK_RISKS, MOCK_INCIDENTS, MOCK_CONTROLS, MOCK_AUDITS,
  MOCK_FINDINGS, MOCK_VENDORS, MOCK_ACTIVITIES, MOCK_DASHBOARD_STATS,
  MOCK_USERS, SEED_ORG_UNITS
} from './seed-data'
import type {
  Risk, Incident, Control, Audit, AuditFinding, Vendor, Activity, DashboardStats,
  JiraConfig, JiraActivity, JiraComment, GRCIntakeItem, OrgUnit, UserProfile
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

const isSupabaseConfigured = () => {
  if (typeof window !== 'undefined' && document.cookie.includes('mock-session=true')) {
    return false
  }
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Unified Database and LocalStorage Client
export const db = {
  // ─── RISKS ─────────────────────────────────────────────────────────────────
  async getRisks(): Promise<Risk[]> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('risks').select('*').order('created_at', { ascending: false })
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
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('risks').upsert(risk).select().single()
      if (!error && data) return data as Risk
    }
    const current = getLocalItem<Risk[]>('risks', MOCK_RISKS)
    const idx = current.findIndex(r => r.id === risk.id)
    if (idx >= 0) {
      current[idx] = { ...risk, updated_at: new Date().toISOString() }
    } else {
      current.unshift(risk)
    }
    setLocalItem('risks', current)
    
    // Add to activity feed
    await this.addActivity({
      id: Math.random().toString(36).substr(2, 9),
      org_id: risk.org_id || 'org1',
      action: idx >= 0 ? 'updated risk' : 'created risk',
      entity_type: 'risk',
      entity_id: risk.id,
      entity_title: risk.title,
      created_at: new Date().toISOString()
    })
    
    return risk
  },

  async deleteRisk(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('risks').delete().eq('id', id)
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
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('incidents').upsert(incident).select().single()
      if (!error && data) return data as Incident
    }
    const current = getLocalItem<Incident[]>('incidents', MOCK_INCIDENTS)
    const idx = current.findIndex(i => i.id === incident.id)
    if (idx >= 0) {
      current[idx] = { ...incident, updated_at: new Date().toISOString() }
    } else {
      current.unshift(incident)
    }
    setLocalItem('incidents', current)

    await this.addActivity({
      id: Math.random().toString(36).substr(2, 9),
      org_id: incident.org_id || 'org1',
      action: idx >= 0 ? 'updated incident' : 'reported incident',
      entity_type: 'incident',
      entity_id: incident.id,
      entity_title: incident.title,
      created_at: new Date().toISOString()
    })

    return incident
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
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('controls').upsert(control).select().single()
      if (!error && data) return data as Control
    }
    const current = getLocalItem<Control[]>('controls', MOCK_CONTROLS)
    const idx = current.findIndex(c => c.id === control.id)
    if (idx >= 0) {
      current[idx] = { ...control, reviewed_at: new Date().toISOString() }
    } else {
      current.unshift(control)
    }
    setLocalItem('controls', current)

    await this.addActivity({
      id: Math.random().toString(36).substr(2, 9),
      org_id: control.org_id || 'org1',
      action: 'updated control review',
      entity_type: 'control',
      entity_id: control.id,
      entity_title: `${control.control_id} - ${control.title}`,
      created_at: new Date().toISOString()
    })

    return control
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
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('audits').upsert(audit).select().single()
      if (!error && data) return data as Audit
    }
    const current = getLocalItem<Audit[]>('audits', MOCK_AUDITS)
    const idx = current.findIndex(a => a.id === audit.id)
    if (idx >= 0) {
      current[idx] = audit
    } else {
      current.unshift(audit)
    }
    setLocalItem('audits', current)

    await this.addActivity({
      id: Math.random().toString(36).substr(2, 9),
      org_id: audit.org_id || 'org1',
      action: idx >= 0 ? 'updated audit' : 'created audit',
      entity_type: 'audit',
      entity_id: audit.id,
      entity_title: audit.title,
      created_at: new Date().toISOString()
    })

    return audit
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
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('audit_findings').upsert(finding).select().single()
      if (!error && data) return data as AuditFinding
    }
    const current = getLocalItem<AuditFinding[]>('findings', MOCK_FINDINGS)
    const idx = current.findIndex(f => f.id === finding.id)
    if (idx >= 0) {
      current[idx] = finding
    } else {
      current.unshift(finding)
    }
    setLocalItem('findings', current)
    return finding
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
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('vendors').upsert(vendor).select().single()
      if (!error && data) return data as Vendor
    }
    const current = getLocalItem<Vendor[]>('vendors', MOCK_VENDORS)
    const idx = current.findIndex(v => v.id === vendor.id)
    if (idx >= 0) {
      current[idx] = vendor
    } else {
      current.unshift(vendor)
    }
    setLocalItem('vendors', current)

    await this.addActivity({
      id: Math.random().toString(36).substr(2, 9),
      org_id: vendor.org_id || 'org1',
      action: idx >= 0 ? 'updated vendor profile' : 'added vendor',
      entity_type: 'vendor',
      entity_id: vendor.id,
      entity_title: vendor.name,
      created_at: new Date().toISOString()
    })

    return vendor
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
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('activities').insert(activity).select().single()
      if (!error && data) return data as Activity
    }
    const current = getLocalItem<Activity[]>('activities', MOCK_ACTIVITIES)
    current.unshift(activity)
    setLocalItem('activities', current)
    return activity
  },

  // ─── DASHBOARD STATS ───────────────────────────────────────────────────────
  async getDashboardStats(): Promise<DashboardStats> {
    // Generate dashboard stats dynamically based on the current risks, incidents, compliance controls, and vendors
    const risks = await this.getRisks()
    const incidents = await this.getIncidents()
    const controls = await this.getControls()
    
    const openRisks = risks.filter(r => ACTIVE_STATUSES.includes(normalizeStatus(r.status)))
    const criticalRisks = openRisks.filter(r => r.level === 'critical').length
    const openIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length
    
    const passedControls = controls.filter(c => c.status === 'pass').length
    const totalControls = controls.filter(c => c.status !== 'na').length
    const complianceScore = totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 100

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

    return {
      total_risks: risks.length,
      critical_risks: criticalRisks,
      open_incidents: openIncidents,
      compliance_score: complianceScore,
      risk_by_level: riskByLevel,
      risk_by_category: riskByCategory,
      monthly_risks: MOCK_DASHBOARD_STATS.monthly_risks,
      monthly_incidents: MOCK_DASHBOARD_STATS.monthly_incidents
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
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('grc_intake_items').upsert(item).select().single()
      if (!error && data) return data as GRCIntakeItem
    }
    const current = getLocalItem<GRCIntakeItem[]>('grc_intake_items', [])
    const idx = current.findIndex(i => i.id === item.id)
    if (idx >= 0) {
      current[idx] = item
    } else {
      current.unshift(item)
    }
    setLocalItem('grc_intake_items', current)

    await this.addActivity({
      id: Math.random().toString(36).substr(2, 9),
      org_id: item.org_id || 'org1',
      action: idx >= 0 ? `updated intake: ${item.title}` : `registered new GRC intake: ${item.title}`,
      entity_type: 'intake',
      entity_id: item.id,
      entity_title: item.title,
      created_at: new Date().toISOString()
    })

    return item
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
    const record: OrgUnit = { ...unit, updated_at: new Date().toISOString() }
    if (isSupabaseConfigured()) {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('org_units').upsert(record).select().single()
      if (!error && data) return data as OrgUnit
    }
    const current = getLocalItem<OrgUnit[]>('org_units', SEED_ORG_UNITS)
    const idx = current.findIndex(u => u.id === record.id)
    if (idx >= 0) {
      current[idx] = record
    } else {
      current.push(record)
    }
    setLocalItem('org_units', current)
    return record
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
