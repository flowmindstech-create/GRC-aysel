import { TopNav } from '@/components/layout/TopNav'
import { ControlChecklist } from '@/components/compliance/ControlChecklist'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Compliance' }
export default function CompliancePage() {
  return (
    <>
      <TopNav title="Compliance" subtitle="ISO 27001 · SOC 2 · GDPR control tracking" />
      <main className="flex-1 overflow-y-auto p-6"><ControlChecklist /></main>
    </>
  )
}

