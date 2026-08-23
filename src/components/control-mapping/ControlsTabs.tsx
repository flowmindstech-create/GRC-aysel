'use client'

import { useState, useEffect } from 'react'
import { BookOpen, ClipboardCheck } from 'lucide-react'
import { ControlsClient } from './ControlsClient'
import { ControlChecklist } from '@/components/compliance/ControlChecklist'

// Nəzarətlə bağlı iş iki yerə bölünmüşdü: reyestr /controls-da, test və
// effektivlik qiymətləndirməsi isə /compliance-da idi — sonuncu heç bir
// menyuda görünmürdü, yəni effektivlik balı verməyin yolu yox idi.
// Hər ikisi burada birləşir.

type Tab = 'library' | 'testing'

export function ControlsTabs() {
  const [tab, setTab] = useState<Tab>('library')

  // /controls?ctrl=… ilə gələn dərin keçid reyestrə aiddir
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('ctrl')) setTab('library')
  }, [])

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: 'library', label: 'Control Library', icon: BookOpen },
    { id: 'testing', label: 'Testing & Effectiveness', icon: ClipboardCheck },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit flex-wrap"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t.id ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'library' && <ControlsClient />}
      {tab === 'testing' && <ControlChecklist embedded />}
    </div>
  )
}
