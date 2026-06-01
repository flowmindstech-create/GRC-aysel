import { TopNav } from '@/components/layout/TopNav'
import { RiskTable } from '@/components/risks/RiskTable'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Risks' }

export default function RisksPage() {
  return (
    <>
      <TopNav title="Risk Management" subtitle="Identify, assess and mitigate organisational risks" />
      <main className="flex-1 overflow-y-auto p-6">
        <RiskTable />
      </main>
    </>
  )
}
