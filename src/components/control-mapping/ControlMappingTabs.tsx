'use client'

import { useState } from 'react'
import { Grid3x3, Workflow } from 'lucide-react'
import { MappingMatrixClient } from './MappingMatrixClient'
import { ProcessesClient } from './ProcessesClient'

type Tab = 'matrix' | 'processes'

export function ControlMappingTabs() {
  const [tab, setTab] = useState<Tab>('matrix')

  const tabs: { id: Tab; label: string; icon: typeof Grid3x3 }[] = [
    { id: 'matrix', label: 'Mapping Matrix', icon: Grid3x3 },
    { id: 'processes', label: 'Business Processes', icon: Workflow },
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

      {tab === 'matrix' && <MappingMatrixClient />}
      {tab === 'processes' && <ProcessesClient />}
    </div>
  )
}
