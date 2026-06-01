import { TopNav } from '@/components/layout/TopNav'
import { AuditList } from '@/components/audits/AuditList'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Audits' }
export default function AuditsPage() {
  return (
    <>
      <TopNav title="Audit Management" subtitle="Plan, execute and track internal & external audits" />
      <main className="flex-1 overflow-y-auto p-6"><AuditList /></main>
    </>
  )
}

