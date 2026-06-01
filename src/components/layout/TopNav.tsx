'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Bell, Search, LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TopNavProps {
  title: string
  subtitle?: string
}

function deleteMockSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = "mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  }
}

export function TopNav({ title, subtitle }: TopNavProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  const handleSignOut = async () => {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isMock) {
      deleteMockSessionCookie()
      router.push('/login')
    } else {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    }
  }


  return (
    <header
      className="h-14 flex items-center gap-4 px-6 border-b shrink-0"
      style={{
        background: 'rgba(8,14,26,0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold tracking-tight truncate" style={{ color: 'var(--foreground)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-fg)', opacity: 0.75 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Search */}
      <div
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg w-52 transition-colors cursor-pointer group"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          color: 'var(--muted-fg)',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,165,233,0.3)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs flex-1">Search…</span>
        <kbd
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-fg)' }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Notifications */}
      <button
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: 'var(--muted-fg)' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
      >
        <Bell className="w-4 h-4" />
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--risk-critical)', boxShadow: '0 0 6px rgba(225,29,72,0.6)' }}
        />
      </button>

      {/* Theme toggle */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--muted-fg)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 text-yellow-400" />
            : <Moon className="w-4 h-4" />}
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-5 hidden sm:block" style={{ background: 'var(--border)' }} />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={cn(
            'flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg transition-colors',
          )}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
              boxShadow: '0 0 10px rgba(14,165,233,0.3)',
            }}
          >
            A
          </div>
          <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--foreground)' }}>
            Ali Hasanov
          </span>
          <ChevronDown className="w-3 h-3" style={{ color: 'var(--muted-fg)' }} />
        </button>

        {showUserMenu && (
          <div
            className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl z-50 border py-1 overflow-hidden"
            style={{
              background: 'rgba(12,20,38,0.95)',
              backdropFilter: 'blur(16px)',
              borderColor: 'var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Ali Hasanov</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>Administrator</p>
            </div>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--foreground)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
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

