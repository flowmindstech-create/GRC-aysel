import { TopNav } from '@/components/layout/TopNav'
import { ProcessesClient } from '@/components/control-mapping/ProcessesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mapping Matrix | RiskShield IRM' }

export default function ControlMappingPage() {
  return (
    <>
      <TopNav title="Mapping Matrix" subtitle="Biznes prosesləri ↔ kontrol / risk / siyasət / öhdəlik xəritəsi" />
      <main className="flex-1 overflow-y-auto p-6">
        <ProcessesClient />
      </main>
    </>
  )
}
