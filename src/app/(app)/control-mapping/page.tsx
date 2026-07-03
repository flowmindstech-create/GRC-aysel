import { TopNav } from '@/components/layout/TopNav'
import { ControlMappingTabs } from '@/components/control-mapping/ControlMappingTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Control Mapping | RiskShield IRM' }

export default function ControlMappingPage() {
  return (
    <>
      <TopNav title="Control Mapping" subtitle="Controls ↔ Risks matrisi · Business Process List" />
      <main className="flex-1 overflow-y-auto p-6">
        <ControlMappingTabs />
      </main>
    </>
  )
}
