import { TopNav } from '@/components/layout/TopNav'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard | GRCell IRM' }

// Real data client tərəfdə yüklənir (Supabase + RLS) — server mock data göndərmir,
// əks halda dashboard açılanda əvvəlcə köhnə mock maddələr görünüb sonra itir.
export default function DashboardPage() {
  return (
    <>
      <TopNav title="Dashboard" subtitle="Here is your risk overview" />
      <DashboardClient
        stats={undefined}
        activities={undefined}
        openRisks={undefined}
        openIncidents={undefined}
      />
    </>
  )
}

