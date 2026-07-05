'use client'

import { useState } from 'react'
import { ScrollText, RefreshCw, FileText, Users } from 'lucide-react'
import { ComplianceWorkflowClient } from './ComplianceWorkflowClient'
import { RegulatoryChangeClient } from './RegulatoryChangeClient'
import { InterestedPartiesClient } from './InterestedPartiesClient'
import { InternalPoliciesClient } from './InternalPoliciesClient'

type Tab = 'register' | 'rcm' | 'policies' | 'parties'

export function ComplianceTabs() {
  const [tab, setTab] = useState<Tab>('register')

  const tabs: { id: Tab; label: string; icon: typeof ScrollText }[] = [
    { id: 'register', label: 'Obligation Register', icon: ScrollText },
    { id: 'rcm', label: 'Regulatory Change Management', icon: RefreshCw },
    { id: 'policies', label: 'Internal Policies', icon: FileText },
    { id: 'parties', label: 'Interested Parties', icon: Users },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit flex-wrap" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t.id ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'register' && <ComplianceWorkflowClient />}
      {tab === 'rcm' && <RegulatoryChangeClient />}
      {tab === 'policies' && <InternalPoliciesClient />}
      {tab === 'parties' && <InterestedPartiesClient />}
    </div>
  )
}
