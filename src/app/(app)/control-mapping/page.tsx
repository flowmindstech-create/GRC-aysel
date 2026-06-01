import { TopNav } from '@/components/layout/TopNav'
import { MappingMatrixClient } from '@/components/control-mapping/MappingMatrixClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Control Mapping | RiskShield IRM' }

export default function ControlMappingPage() {
  return (
    <>
      <TopNav title="Control Mapping" subtitle="CTRL ↔ RISK · CTRL ↔ REQ — gap analysis and mapping matrix" />
      <main className="flex-1 overflow-y-auto p-6">
        <MappingMatrixClient />
      </main>
    </>
  )
}
