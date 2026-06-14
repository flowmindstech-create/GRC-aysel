'use client'

import { useState } from 'react'
import { ScrollText, RefreshCw } from 'lucide-react'
import { ComplianceWorkflowClient } from './ComplianceWorkflowClient'
import { RegulatoryChangeClient } from './RegulatoryChangeClient'

type Tab = 'register' | 'rcm'

export function ComplianceTabs() {
  const [tab, setTab] = useState<Tab>('register')

  const tabs: { id: Tab; label: string; icon: typeof ScrollText }[] = [
    { id: 'register', label: 'Register', icon: ScrollText },
    { id: 'rcm', label: 'Regulatory Change Management', icon: RefreshCw },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
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

      {tab === 'register' ? <ComplianceWorkflowClient /> : <RegulatoryChangeClient />}
    </div>
  )
}
