import { TopNav } from '@/components/layout/TopNav'
import { ComplianceTabs } from '@/components/compliance-workflow/ComplianceTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance Obligation Register | GRCell IRM' }

export default function ComplianceWorkflowPage() {
  return (
    <>
      <TopNav
        title="Compliance Obligation Register"
        subtitle="Obligation register and regulatory change management (ISO 37301)"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <ComplianceTabs />
      </main>
    </>
  )
}
