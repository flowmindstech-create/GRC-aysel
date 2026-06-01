'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ShieldAlert, AlertTriangle, ClipboardCheck,
  Search, Users, Settings, ChevronLeft, ChevronRight,
  Shield, Zap
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/risks',       label: 'Risks',        icon: ShieldAlert },
  { href: '/incidents',   label: 'Incidents',    icon: AlertTriangle },
  { href: '/compliance',  label: 'Compliance',   icon: ClipboardCheck },
  { href: '/audits',      label: 'Audits',       icon: Search },
  { href: '/vendors',     label: 'Vendors',      icon: Users },
  { href: '/settings',    label: 'Settings',     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      style={{ background: 'var(--sidebar-bg)' }}
      className={cn(
        'relative flex flex-col h-full transition-all duration-300 border-r border-white/5',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white leading-none">RiskShield</p>
            <p className="text-[10px] text-indigo-400 mt-0.5">IRM Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* AI Badge */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-gradient-to-br from-indigo-900/60 to-purple-900/30 border border-indigo-700/30">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">AI-Powered</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Risk summaries & mitigation suggestions powered by OpenAI.
          </p>
        </div>
      )}

      {/* Plan */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Organization</p>
          <p className="text-xs font-semibold text-white">Acme Corp</p>
          <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-900/50 text-indigo-400">
            Professional
          </span>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
