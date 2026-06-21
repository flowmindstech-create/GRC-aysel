import { TopNav } from '@/components/layout/TopNav'
import { StressTestsClient } from '@/components/modules/StressTestsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Stress Tests | RiskShield IRM' }

export default function StressTestsPage() {
  return (
    <>
      <TopNav title="Stress Tests" subtitle="Stress testing & scenario analysis" />
      <main className="flex-1 overflow-y-auto p-6">
        <StressTestsClient />
      </main>
    </>
  )
}
