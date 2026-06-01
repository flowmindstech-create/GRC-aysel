import { TopNav } from '@/components/layout/TopNav'
import { VendorTable } from '@/components/vendors/VendorTable'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Vendors' }
export default function VendorsPage() {
  return (
    <>
      <TopNav title="Vendor Risk Management" subtitle="Monitor, score and manage third-party vendor risk" />
      <main className="flex-1 overflow-y-auto p-6"><VendorTable /></main>
    </>
  )
}

