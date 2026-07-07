import { TopNav } from '@/components/layout/TopNav'
import { ControlMappingTabs } from '@/components/control-mapping/ControlMappingTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Control Mapping | GRCell IRM' }

export default function ControlMappingPage() {
  return (
    <>
      <TopNav title="Control Mapping" subtitle="Risk Control Mapping · Process Control Mapping — xəritələmə mərkəzi" />
      <main className="flex-1 overflow-y-auto p-6">
        <ControlMappingTabs />
      </main>
    </>
  )
}
