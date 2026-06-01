'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ShieldAlert, AlertTriangle, ClipboardCheck,
  Search, Users, Settings, ChevronLeft, ChevronRight,
  Shield, Zap, GitBranch
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/risks',       label: 'Risks',        icon: ShieldAlert },
  { href: '/workflows',   label: 'Workflows',    icon: GitBranch },
  { href: '/incidents',   label: 'Incidents',    icon: AlertTriangle },
  { href: '/compliance',  label: 'Compliance',   icon: ClipboardCheck },
  { href: '/audits',      label: 'Audits',       icon: Search },
  { href: '/vendors',     label: 'Vendors',      icon: Users },
  { href: '/settings',    label: 'Settings',     icon: Settings },
]

interface SidebarProps {
  onMobileClose?: () => void
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
      className={cn(
        'relative flex flex-col h-full transition-all duration-300 border-r',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: 'var(--brand-500)' }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-none" style={{ color: 'var(--foreground)' }}>RiskShield</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--brand-500)' }}>IRM Platform</p>
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
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
              )}
              style={active ? {
                background: 'var(--brand-500)',
                color: '#ffffff',
              } : {
                color: 'var(--sidebar-fg)',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.10)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--foreground)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = ''
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--sidebar-fg)'
                }
              }}
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
        <div
          className="mx-3 mb-3 p-3 rounded-lg border"
          style={{
            background: 'rgba(14,165,233,0.07)',
            borderColor: 'rgba(14,165,233,0.20)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--brand-500)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--brand-500)' }}>AI-Powered</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
            Risk summaries & mitigation suggestions powered by OpenAI.
          </p>
        </div>
      )}

      {/* Plan */}
      {!collapsed && (
        <div
          className="mx-3 mb-3 p-3 rounded-lg border"
          style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--muted-fg)' }}>Organization</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Acme Corp</p>
          <span
            className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: 'rgba(14,165,233,0.15)', color: 'var(--brand-500)' }}
          >
            Professional
          </span>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex absolute -right-3 top-20 z-10 w-6 h-6 rounded-full items-center justify-center transition-colors"
        style={{
          border: '1px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--muted-fg)',
        }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}

