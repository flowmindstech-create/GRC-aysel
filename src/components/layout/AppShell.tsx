'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Menu, X } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - responsive container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar onMobileClose={() => setMobileOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Mobile floating menu toggle button */}
        <div
          className="md:hidden flex items-center h-14 px-4 border-b shrink-0 gap-3"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-white shadow-lg cursor-pointer"
            style={{ background: 'var(--brand-500)' }}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
          <span className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>RiskShield</span>
        </div>

        {children}
      </div>
    </div>
  )
}

