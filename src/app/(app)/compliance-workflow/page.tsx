import { TopNav } from '@/components/layout/TopNav'
import { ComplianceWorkflowClient } from '@/components/compliance-workflow/ComplianceWorkflowClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance Obligation Register | RiskShield IRM' }

export default function ComplianceWorkflowPage() {
  return (
    <>
      <TopNav
        title="Compliance Obligation Register"
        subtitle="Manage and track compliance obligations and regulatory requirements"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <ComplianceWorkflowClient />
      </main>
    </>
  )
}
