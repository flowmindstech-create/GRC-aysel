import { TopNav } from '@/components/layout/TopNav'
import { PolicyKanbanClient } from '@/components/governance/PolicyKanbanClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Governance — Policies | RiskShield IRM' }

export default function PoliciesPage() {
  return (
    <>
      <TopNav title="Policy Governance" subtitle="Draft · Review · Approval · Publication lifecycle management" />
      <main className="flex-1 overflow-y-auto p-6">
        <PolicyKanbanClient />
      </main>
    </>
  )
}
