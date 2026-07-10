'use client'

import { useState } from 'react'
import { KanbanSquare, FileText } from 'lucide-react'
import { PolicyKanbanClient } from './PolicyKanbanClient'
import { InternalDocumentsClient } from './InternalDocumentsClient'

type Tab = 'policies' | 'documents'

export function GovernanceTabs() {
  const [tab, setTab] = useState<Tab>('policies')

  const tabs: { id: Tab; label: string; icon: typeof KanbanSquare }[] = [
    { id: 'policies', label: 'Policies', icon: KanbanSquare },
    { id: 'documents', label: 'Internal Document List', icon: FileText },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
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

      {tab === 'policies' && <PolicyKanbanClient />}
      {tab === 'documents' && <InternalDocumentsClient />}
    </div>
  )
}
