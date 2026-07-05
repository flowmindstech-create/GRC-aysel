'use client'

import { useState } from 'react'
import { ShieldAlert, ScrollText, Lock } from 'lucide-react'
import { RiskTable } from './RiskTable'
import { ComplianceRiskClient } from './ComplianceRiskClient'
import { InfoSecRiskClient } from './InfoSecRiskClient'

type Tab = 'enterprise' | 'compliance' | 'infosec'

export function RiskRegisterTabs() {
  const [tab, setTab] = useState<Tab>('enterprise')

  const tabs: { id: Tab; label: string; icon: typeof ShieldAlert }[] = [
    { id: 'enterprise', label: 'Enterprise Risk Register', icon: ShieldAlert },
    { id: 'compliance', label: 'Compliance Risk Register', icon: ScrollText },
    { id: 'infosec', label: 'Information Security Risk Register', icon: Lock },
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

      {tab === 'enterprise' && <RiskTable />}
      {tab === 'compliance' && <ComplianceRiskClient />}
      {tab === 'infosec' && <InfoSecRiskClient />}
    </div>
  )
}
