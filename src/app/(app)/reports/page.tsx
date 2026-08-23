import { TopNav } from '@/components/layout/TopNav'
import { ReportsClient } from '@/components/reports/ReportsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports | GRCell IRM' }

export default function ReportsPage() {
  return (
    <>
      <TopNav title="Reports" subtitle="Reports built from live data across the modules" />
      <main className="flex-1 overflow-y-auto p-6">
        <ReportsClient />
      </main>
    </>
  )
}
