'use client'

import { Bell, Search, LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, getCurrentProfile } from '@/lib/db'
import type { Activity, UserProfile } from '@/types'

interface TopNavProps {
  title: string
  subtitle?: string
}

function deleteMockSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = "mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  }
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function TopNav({ title, subtitle }: TopNavProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const router = useRouter()

  useEffect(() => {
    getCurrentProfile().then(setProfile)
    db.getActivities().then((a) => setActivities(a.slice(0, 12))).catch(() => {})
  }, [])

  const handleSignOut = async () => {
    // Always clear the mock cookie (else middleware bounces back to the dashboard)
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
    <header
      className="glass-header h-14 flex items-center gap-3 md:gap-4 px-4 md:px-6 border-b shrink-0"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold tracking-tight truncate" style={{ color: 'var(--foreground)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted-fg)', opacity: 0.75 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Search */}
      <div
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg w-52 transition-colors cursor-pointer group"
        style={{
          background: 'var(--muted)',
          border: '1px solid var(--border)',
          color: 'var(--muted-fg)',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,39,68,0.28)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs flex-1">Search…</span>
        <kbd
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: 'rgba(21,39,68,0.05)', color: 'var(--muted-fg)' }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotif(v => !v); setShowUserMenu(false) }}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          style={{ color: 'var(--muted-fg)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(21,39,68,0.05)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {activities.length > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--risk-critical)', boxShadow: '0 0 6px rgba(225,29,72,0.6)' }}
            />
          )}
        </button>

        {showNotif && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-50 border overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.98)',
                backdropFilter: 'blur(16px)',
                borderColor: 'var(--border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>Notifications</p>
                {activities.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}>{activities.length}</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--muted-fg)', opacity: 0.4 }} />
                    <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>No notifications yet</p>
                  </div>
                ) : (
                  activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 px-4 py-2.5 border-b last:border-b-0 transition-colors hover:bg-black/[0.04]" style={{ borderColor: 'var(--border)' }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--brand-500)' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug" style={{ color: 'var(--foreground)' }}>
                          {a.user_name && <span className="font-semibold">{a.user_name} </span>}
                          {a.action}
                          {a.entity_title && <span className="font-medium"> — {a.entity_title}</span>}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 hidden sm:block" style={{ background: 'var(--border)' }} />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => { setShowUserMenu(v => !v); setShowNotif(false) }}
          className={cn(
            'flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg transition-colors cursor-pointer',
          )}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(21,39,68,0.05)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
              boxShadow: '0 0 10px rgba(21,39,68,0.28)',
            }}
          >
            {initial}
          </div>
          <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--foreground)' }}>
            {displayName}
          </span>
          <ChevronDown className="w-3 h-3" style={{ color: 'var(--muted-fg)' }} />
        </button>

        {showUserMenu && (
          <div
            className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl z-50 border py-1 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(16px)',
              borderColor: 'var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{displayName}</p>
              <p className="text-[11px] mt-0.5 capitalize" style={{ color: 'var(--muted-fg)' }}>{roleLabel}</p>
            </div>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--foreground)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(21,39,68,0.05)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
            >
              <User className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} />
              Profile
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--risk-critical)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.08)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

