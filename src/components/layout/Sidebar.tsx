'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ShieldAlert, AlertTriangle, ClipboardCheck,
  Search, Users, Settings, ChevronLeft, ChevronRight,
  Shield, GitBranch, FileSearch, Activity,
  BookOpen, Network, ScrollText, LogOut,
  Target, Landmark, FlaskConical, Megaphone,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getCurrentProfile, db } from '@/lib/db'
import type { UserProfile } from '@/types'

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
      { href: '/compliance-workflow',       label: 'Compliance Register',  icon: ScrollText },
      { href: '/audit-findings-workflow',   label: 'Findings Workflow',    icon: FileSearch },
      { href: '/monitoring',                label: 'Monitoring',           icon: Activity },
      { href: '/incidents',                 label: 'Incidents',            icon: AlertTriangle },
      { href: '/compliance-monitoring', label: 'Compliance Monitoring', icon: ClipboardCheck },
      { href: '/audits',               label: 'Audits',              icon: Search },
    ],
  },
  {
    label: 'Risk Modules',
    items: [
      { href: '/risk-appetite',   label: 'Risk Appetite',   icon: Target },
      { href: '/financial-risks', label: 'Financial Risks', icon: Landmark },
      { href: '/stress-tests',    label: 'Stress Tests',    icon: FlaskConical },
      { href: '/whistleblowing',  label: 'Whistleblowing',  icon: Megaphone },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/controls',              label: 'Control Library', icon: BookOpen  },
      { href: '/control-mapping',       label: 'Ctrl Mapping',    icon: Network   },
      { href: '/governance/policies',   label: 'Policies',        icon: ScrollText},
      { href: '/vendors',               label: 'Vendors',         icon: Users     },
      { href: '/settings',              label: 'Settings',        icon: Settings  },
    ],
  },
]

// Routes a plain employee may see — everything else is risk-team only.
// Employees get a focused "my work" view (their own risks/incidents).
const EMPLOYEE_ALLOWED = new Set(['/dashboard', '/risks', '/incidents'])

interface SidebarProps {
  onMobileClose?: () => void
}

function deleteMockSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [openIncidents, setOpenIncidents] = useState(0)

  useEffect(() => {
    getCurrentProfile().then(setProfile)
    db.getIncidents().then(list => setOpenIncidents(list.filter(i => i.status !== 'done' && i.status !== 'closed').length))
  }, [])

  // Risk team (admin / risk_manager / auditor) sees the full platform;
  // a plain employee only sees their own work surfaces.
  const isRiskTeam = profile?.role === 'admin' || profile?.role === 'risk_manager' || profile?.role === 'auditor'
  const visibleGroups = navGroups
    .map(g => ({ ...g, items: g.items.filter(it => isRiskTeam || EMPLOYEE_ALLOWED.has(it.href)) }))
    .filter(g => g.items.length > 0)

  const handleSignOut = async () => {
    deleteMockSessionCookie()
    try {
      const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!isMock) {
        const { createClient } = await import('@/lib/supabase/client')
        await createClient().auth.signOut()
      }
    } catch { /* ignore */ }
    router.push('/login')
  }

  const displayName = profile?.full_name ?? 'User'
  const roleLabel = profile?.role ? profile.role.replace('_', ' ') : ''
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <aside
      style={{
        background: 'var(--sidebar-bg)',
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
            boxShadow: '0 4px 10px rgba(21,39,68,0.20)',
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
              style={{ color: 'var(--muted-fg)' }}
            >
              Global Governance
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-4">
        {visibleGroups.map((group, gi) => (
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
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                    )}
                    style={active ? {
                      boxShadow: 'inset 3px 0 0 var(--brand-500)',
                      background: 'var(--brand-50)',
                      color: 'var(--brand-500)',
                      fontWeight: 600,
                    } : {
                      color: 'var(--sidebar-fg)',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(21,39,68,0.05)'
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
                    {!collapsed && <span className="flex-1">{label}</span>}
                    {href === '/incidents' && openIncidents > 0 && (
                      <span className={cn('shrink-0 inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500', collapsed ? 'absolute top-1 right-1 w-4 h-4' : 'min-w-[18px] h-[18px] px-1')}>
                        {openIncidents}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Org panel */}
      {!collapsed && (
        <div
          className="mx-3 mb-3 p-3 rounded-xl border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <p
            className="text-[10px] uppercase tracking-widest mb-1"
            style={{ color: 'var(--muted-fg)', opacity: 0.7 }}
          >
            Organization
          </p>
          <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Acme Corp</p>
          <span
            className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: 'var(--brand-50)',
              color: 'var(--brand-500)',
              border: '1px solid var(--brand-100)',
            }}
          >
            Professional
          </span>
        </div>
      )}

      {/* User + Sign out (always visible) */}
      <div className="mx-3 mb-4">
        {!collapsed ? (
          <div
            className="flex items-center gap-2 p-2 rounded-xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))' }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>{displayName}</p>
              <p className="text-[10px] capitalize truncate" style={{ color: 'var(--muted-fg)' }}>{roleLabel}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              style={{ color: 'var(--risk-critical)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.1)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-full h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: 'var(--risk-critical)', border: '1px solid var(--border)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

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
