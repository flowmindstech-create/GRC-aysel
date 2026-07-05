import { TopNav } from '@/components/layout/TopNav'
import { WorkflowStepperClient } from '@/components/compliance-workflow/WorkflowStepperClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Workflow Detail | GRCell IRM' }

export default function WorkflowDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <TopNav title="Workflow Detail" subtitle="Step-by-step GRC compliance pipeline" />
      <main className="flex-1 overflow-hidden">
        <WorkflowStepperClient id={params.id} />
      </main>
    </>
  )
}
