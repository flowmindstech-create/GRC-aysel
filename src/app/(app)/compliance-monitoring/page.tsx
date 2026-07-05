import { TopNav } from '@/components/layout/TopNav'
import { ComplianceMonitoringClient } from '@/components/compliance-monitoring/ComplianceMonitoringClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance Monitoring | GRCell IRM' }

export default function ComplianceMonitoringPage() {
  return (
    <>
      <TopNav title="Compliance Monitoring" subtitle="Periodic assessments, framework coverage & control checklist" />
      <main className="flex-1 overflow-y-auto p-6">
        <ComplianceMonitoringClient />
      </main>
    </>
  )
}
