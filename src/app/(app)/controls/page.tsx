import { TopNav } from '@/components/layout/TopNav'
import { ControlsTabs } from '@/components/control-mapping/ControlsTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Control Library | GRCell IRM' }

export default function ControlsPage() {
  return (
    <>
      <TopNav title="Control Library" subtitle="Control register, periodic testing and effectiveness scoring" />
      <main className="flex-1 overflow-y-auto p-6">
        <ControlsTabs />
      </main>
    </>
  )
}
