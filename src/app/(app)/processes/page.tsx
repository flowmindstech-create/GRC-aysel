import { TopNav } from '@/components/layout/TopNav'
import { ProcessesClient } from '@/components/control-mapping/ProcessesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Business Processes | GRCell IRM' }

export default function BusinessProcessesPage() {
  return (
    <>
      <TopNav title="Business Processes" subtitle="Biznes proseslərinin mərkəzi reyestri (master data)" />
      <main className="flex-1 overflow-y-auto p-6">
        <ProcessesClient />
      </main>
    </>
  )
}
