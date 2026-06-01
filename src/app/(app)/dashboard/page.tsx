import { TopNav } from '@/components/layout/TopNav'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import {
  MOCK_DASHBOARD_STATS, MOCK_ACTIVITIES, MOCK_AI_INSIGHTS,
  MOCK_RISKS, MOCK_INCIDENTS,
} from '@/lib/seed-data'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard | RiskShield IRM' }

export default function DashboardPage() {
  const stats = MOCK_DASHBOARD_STATS
  const openRisks = MOCK_RISKS.filter(r => r.status === 'open' || r.status === 'in_progress')
  const openIncidents = MOCK_INCIDENTS.filter(i => i.status !== 'resolved' && i.status !== 'closed')

  return (
    <>
      <TopNav title="Dashboard" subtitle="Welcome back, Ali — here is your risk overview" />
      <DashboardClient
        stats={stats}
        activities={MOCK_ACTIVITIES}
        insights={MOCK_AI_INSIGHTS}
        openRisks={openRisks}
        openIncidents={openIncidents}
      />
    </>
  )
}

