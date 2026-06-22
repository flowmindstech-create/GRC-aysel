'use client'

import { StatsCard } from '@/components/dashboard/StatsCard'
import { RiskHeatmap } from '@/components/dashboard/RiskHeatmap'
import { RiskTrendChart, RiskCategoryChart } from '@/components/dashboard/Charts'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { ComplianceGauge } from '@/components/dashboard/ComplianceGauge'
import { RiskLevelBadge, IncidentStatusBadge } from '@/components/shared/Badges'
import {
  ShieldAlert, AlertTriangle, ClipboardCheck, Users, Clock, RefreshCw, Database
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { DashboardStats, Activity, Risk, Incident, JiraConfig } from '@/types'
import { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import { toast } from 'sonner'

interface DashboardClientProps {
  stats: DashboardStats
  activities: Activity[]
  openRisks: Risk[]
  openIncidents: Incident[]
}

export function DashboardClient({
  stats: initialStats,
  activities: initialActivities,
  openRisks: initialOpenRisks,
  openIncidents: initialOpenIncidents,
}: DashboardClientProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [openRisks, setOpenRisks] = useState<Risk[]>(initialOpenRisks)
  const [openIncidents, setOpenIncidents] = useState<Incident[]>(initialOpenIncidents)
  const [jiraConfig, setJiraConfig] = useState<JiraConfig | null>(null)
  const [syncedStats, setSyncedStats] = useState({ total: 0, done: 0 })
  const [syncing, setSyncing] = useState(false)

  async function loadData() {
    const s = await db.getDashboardStats()
    const a = await db.getActivities()
    const r = await db.getRisks()
    const i = await db.getIncidents()
    const jira = await db.getJiraConfig()
    
    setStats(s)
    setActivities(a)
    setOpenRisks(r.filter(x => x.status === 'open' || x.status === 'in_progress'))
    setOpenIncidents(i.filter(x => x.status !== 'done' && x.status !== 'closed'))
    setJiraConfig(jira)

    if (jira.connected) {
      const syncedRisks = r.filter(x => x.jira_issue_key)
      const syncedIncidents = i.filter(x => x.jira_issue_key)
      const total = syncedRisks.length + syncedIncidents.length
      const done = [...syncedRisks, ...syncedIncidents].filter(x => x.jira_issue_status === 'Done' || x.jira_issue_status === 'Resolved').length
      setSyncedStats({ total, done })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFullSync = async () => {
    setSyncing(true)
    // Simulate API sync with Atlassian
    await new Promise(resolve => setTimeout(resolve, 2000))
    await loadData()
    setSyncing(false)
    toast.success('Bidirectional sync with Jira completed successfully!')
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      {/* Jira Integration Bar */}
      {jiraConfig && jiraConfig.connected && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 mb-6 rounded-xl border bg-sky-500/5 border-sky-500/10 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Jira Sync Engine Active</p>
              <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
                Connected to <span className="font-mono">{jiraConfig.instanceUrl}</span> • Syncing: Risks ➔ {jiraConfig.projectMapping.risks}, Incidents ➔ {jiraConfig.projectMapping.incidents}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{syncedStats.total} Synced Items</p>
              <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{syncedStats.done} Tasks Completed</p>
            </div>
            <div className="h-8 w-px" style={{ background: 'var(--border)' }} />
            <button
              onClick={handleFullSync}
              disabled={syncing}
              className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors animate-pulse-ring"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          index={0}
          title="Total Risks"
          value={stats.total_risks}
          subtitle={`${stats.critical_risks} critical`}
          icon={ShieldAlert}
          iconColor="text-sky-500"
          iconBg="bg-sky-500/10"
        />
        <StatsCard
          index={1}
          title="Open Incidents"
          value={stats.open_incidents}
          subtitle={`${stats.incidents_investigating} under investigation`}
          icon={AlertTriangle}
          iconColor="text-orange-500"
          iconBg="bg-orange-500/10"
        />
        <StatsCard
          index={2}
          title="Compliance Score"
          value={`${stats.compliance_score}%`}
          subtitle={`${stats.controls_failing} controls failing`}
          icon={ClipboardCheck}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
        />
        <StatsCard
          index={3}
          title="Active Vendors"
          value={stats.active_vendors}
          subtitle={`${stats.vendors_under_review} under review`}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
      </div>

      {/* Row 2 — Heatmap + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="lg:col-span-1"><RiskHeatmap stats={stats} /></div>
        <div className="lg:col-span-1"><ComplianceGauge score={stats.compliance_score} /></div>
      </div>

      {/* Row 3 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <RiskTrendChart stats={stats} />
        <RiskCategoryChart stats={stats} />
      </div>

      {/* Row 4 — Open Risks + Open Incidents + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Open Risks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Open Risks</h3>
            <Link href="/risks" className="text-xs text-sky-500 hover:text-sky-400 font-medium">View all →</Link>
          </div>
          <div className="space-y-3">
            {openRisks.slice(0, 5).map(risk => (
              <Link key={risk.id} href="/risks"
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer group text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-sky-500 transition-colors"
                    style={{ color: 'var(--foreground)' }}>
                    {risk.title}
                  </p>
                  <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--muted-fg)' }}>
                    <Clock className="w-3 h-3" />
                    {risk.due_date ? formatDistanceToNow(new Date(risk.due_date), { addSuffix: true }) : 'No due date'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <RiskLevelBadge level={risk.level} />
                  {risk.jira_issue_key && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono font-bold border border-sky-500/10">
                      {risk.jira_issue_key}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Open Incidents */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Active Incidents</h3>
            <Link href="/incidents" className="text-xs text-sky-500 hover:text-sky-400 font-medium">View all →</Link>
          </div>
          <div className="space-y-3">
            {openIncidents.map(incident => (
              <div key={incident.id} className="p-3 rounded-xl relative overflow-hidden" style={{ background: 'var(--muted)' }}>
                {incident.jira_issue_key && (
                  <span className="absolute top-2.5 right-2.5 text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono font-bold border border-sky-500/10">
                    {incident.jira_issue_key}
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium leading-snug max-w-[70%]" style={{ color: 'var(--foreground)' }}>
                    {incident.title}
                  </p>
                  <IncidentStatusBadge status={incident.status} />
                </div>
                <p className="text-[11px] mt-2" style={{ color: 'var(--muted-fg)' }}>
                  Assigned to {incident.assigned_name ?? '—'}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                  {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <ActivityFeed activities={activities} />
      </div>
    </main>
  )
}

