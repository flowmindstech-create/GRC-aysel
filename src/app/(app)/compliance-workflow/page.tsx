import { TopNav } from '@/components/layout/TopNav'
import { ComplianceWorkflowClient } from '@/components/compliance-workflow/ComplianceWorkflowClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance Workflow | RiskShield IRM' }

export default function ComplianceWorkflowPage() {
  return (
    <>
      <TopNav
        title="Compliance Workflow"
        subtitle="Track requirements, findings and incidents through the full GRC pipeline"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <ComplianceWorkflowClient />
      </main>
    </>
  )
}
