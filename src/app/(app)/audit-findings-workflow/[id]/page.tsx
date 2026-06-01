import { TopNav } from '@/components/layout/TopNav'
import { FindingWorkflowStepper } from '@/components/audit-findings-workflow/FindingWorkflowStepper'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Finding Workflow | RiskShield IRM' }

export default function FindingWorkflowDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <TopNav title="Finding Workflow" subtitle="Step-by-step audit finding resolution" />
      <main className="flex-1 overflow-hidden">
        <FindingWorkflowStepper id={params.id} />
      </main>
    </>
  )
}
