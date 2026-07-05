import { TopNav } from '@/components/layout/TopNav'
import { RiskRegisterTabs } from '@/components/risks/RiskRegisterTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Risks' }

export default function RisksPage() {
  return (
    <>
      <TopNav title="Risk Register" subtitle="Enterprise · Compliance · Information Security risk reyestrləri" />
      <main className="flex-1 overflow-y-auto p-6">
        <RiskRegisterTabs />
      </main>
    </>
  )
}
