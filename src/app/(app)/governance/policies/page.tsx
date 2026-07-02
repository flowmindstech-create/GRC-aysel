import { TopNav } from '@/components/layout/TopNav'
import { GovernanceTabs } from '@/components/governance/GovernanceTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Governance — Policies | RiskShield IRM' }

export default function PoliciesPage() {
  return (
    <>
      <TopNav title="Policy Governance" subtitle="Policies lifecycle · Internal Document List (daxili sənəd reyestri)" />
      <main className="flex-1 overflow-y-auto p-6">
        <GovernanceTabs />
      </main>
    </>
  )
}
