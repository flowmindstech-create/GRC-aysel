'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ShieldAlert, AlertTriangle, ClipboardCheck,
  Search, Users, Settings, ChevronLeft, ChevronRight,
  Shield, Zap, GitBranch, Workflow, FileSearch, Activity,
} from 'lucide-react'
import { useState } from 'react'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'GRC Suite',
    items: [
      { href: '/risks',                label: 'Risk Register',       icon: ShieldAlert },
      { href: '/workflows',            label: 'Workflows',           icon: GitBranch },
      { href: '/compliance-workflow',       label: 'Compliance Pipeline',  icon: Workflow },
      { href: '/audit-findings-workflow',   label: 'Findings Workflow',    icon: FileSearch },
      { href: '/monitoring',                label: 'Monitoring',           icon: Activity },
      { href: '/incidents',                 label: 'Incidents',            icon: AlertTriangle },
      { href: '/compliance',           label: 'Compliance',          icon: ClipboardCheck },
      { href: '/audits',               label: 'Audits',              icon: Search },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/vendors',  label: 'Vendors',  icon: Users },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  onMobileClose?: () => void
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      style={{
        background: 'linear-gradient(180deg, #05090f 0%, var(--sidebar-bg) 40%, #060910 100%)',
        borderColor: 'var(--border)',
      }}
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
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
            boxShadow: '0 0 18px rgba(14,165,233,0.38), 0 2px 6px rgba(0,0,0,0.35)',
          }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-none tracking-tight" style={{ color: 'var(--foreground)' }}>
              RiskShield
            </p>
            <p
              className="text-[10px] mt-0.5 font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--brand-500)', opacity: 0.85 }}
            >
              IRM Platform
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-4">
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {!collapsed && (
              <p
                className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em]"
                style={{ color: 'var(--muted-fg)', opacity: 0.5 }}
              >
                {group.label}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div className="mx-3 my-1 h-px" style={{ background: 'var(--border)', opacity: 0.5 }} />
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
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
                      boxShadow: 'inset 2px 0 0 var(--brand-500)',
                      background: 'rgba(14,165,233,0.09)',
                      color: 'var(--foreground)',
                    } : {
                      color: 'var(--sidebar-fg)',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
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
                    <Icon
                      className={cn('shrink-0 transition-colors', collapsed ? 'w-5 h-5' : 'w-4 h-4')}
                      style={{ color: active ? 'var(--brand-500)' : 'inherit' }}
                    />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* AI Badge */}
      {!collapsed && (
        <div
          className="mx-3 mb-3 p-3 rounded-xl border"
          style={{
            background: 'rgba(14,165,233,0.06)',
            borderColor: 'rgba(14,165,233,0.15)',
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

      {/* Org panel */}
      {!collapsed && (
        <div
          className="mx-3 mb-3 p-3 rounded-xl border"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}
        >
          <p
            className="text-[10px] uppercase tracking-widest mb-1"
            style={{ color: 'var(--muted-fg)', opacity: 0.5 }}
          >
            Organization
          </p>
          <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Acme Corp</p>
          <span
            className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: 'linear-gradient(90deg, rgba(14,165,233,0.18), rgba(3,105,161,0.18))',
              color: 'var(--brand-500)',
              border: '1px solid rgba(14,165,233,0.2)',
            }}
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
