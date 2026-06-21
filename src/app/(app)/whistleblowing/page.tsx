import { TopNav } from '@/components/layout/TopNav'
import { WhistleblowingClient } from '@/components/whistleblowing/WhistleblowingClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Whistleblowing | RiskShield IRM' }

export default function WhistleblowingPage() {
  return (
    <>
      <TopNav title="Whistleblowing" subtitle="Confidential reporting channel (ISO 37301)" />
      <main className="flex-1 overflow-y-auto p-6">
        <WhistleblowingClient />
      </main>
    </>
  )
}
