import { TopNav } from '@/components/layout/TopNav'
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Monitoring | GRCell IRM' }

export default function MonitoringPage() {
  return (
    <>
      <TopNav
        title="Monitoring"
        subtitle="KRI · KCI · KPI — real-time threshold tracking and alert management"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <MonitoringDashboard />
      </main>
    </>
  )
}
