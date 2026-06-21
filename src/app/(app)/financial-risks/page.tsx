import { TopNav } from '@/components/layout/TopNav'
import { FinancialRisksClient } from '@/components/modules/FinancialRisksClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Financial Risks | RiskShield IRM' }

export default function FinancialRisksPage() {
  return (
    <>
      <TopNav title="Financial Risks" subtitle="Portfolio & investment risk exposure" />
      <main className="flex-1 overflow-y-auto p-6">
        <FinancialRisksClient />
      </main>
    </>
  )
}
