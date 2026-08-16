import { TopNav } from '@/components/layout/TopNav'
import { GovernanceTabs } from '@/components/governance/GovernanceTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Governance — Policies | GRCell IRM' }

export default function PoliciesPage() {
  return (
    <>
      <TopNav title="Policy Governance" subtitle="Policies lifecycle · Internal Document List (internal document register)" />
      <main className="flex-1 overflow-y-auto p-6">
        <GovernanceTabs />
      </main>
    </>
  )
}
