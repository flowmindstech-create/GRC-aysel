import { TopNav } from '@/components/layout/TopNav'
import { FindingWorkflowClient } from '@/components/audit-findings-workflow/FindingWorkflowClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit Findings Workflow | RiskShield IRM' }

export default function AuditFindingsWorkflowPage() {
  return (
    <>
      <TopNav
        title="Audit Findings Workflow"
        subtitle="Manage audit findings through investigation, corrective action and closure"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <FindingWorkflowClient />
      </main>
    </>
  )
}
