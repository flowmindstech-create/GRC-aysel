import { TopNav } from '@/components/layout/TopNav'
import { IncidentTable } from '@/components/incidents/IncidentTable'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Incidents' }

export default function IncidentsPage() {
  return (
    <>
      <TopNav title="Incident Management" subtitle="Report, investigate and resolve security incidents" />
      <main className="flex-1 overflow-y-auto p-6">
        <IncidentTable />
      </main>
    </>
  )
}

