import { TopNav } from '@/components/layout/TopNav'
import { RiskAppetiteClient } from '@/components/modules/RiskAppetiteClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Risk Appetite | GRCell IRM' }

export default function RiskAppetitePage() {
  return (
    <>
      <TopNav title="Risk Appetite" subtitle="Risk appetite statements, tolerances and KRIs" />
      <main className="flex-1 overflow-y-auto p-6">
        <RiskAppetiteClient />
      </main>
    </>
  )
}
