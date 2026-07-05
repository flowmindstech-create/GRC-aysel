import { TopNav } from '@/components/layout/TopNav'
import { ControlsClient } from '@/components/control-mapping/ControlsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Control Library | GRCell IRM' }

export default function ControlsPage() {
  return (
    <>
      <TopNav title="Control Library" subtitle="Full expanded control card — design, testing, effectiveness and mapping" />
      <main className="flex-1 overflow-y-auto p-6">
        <ControlsClient />
      </main>
    </>
  )
}
