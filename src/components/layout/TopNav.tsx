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
      className="h-14 flex items-center gap-4 px-6 border-b shrink-0 backdrop-blur-sm"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-52"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--muted-fg)' }}>
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs">Search…</span>
        <kbd className="ml-auto text-[10px] px-1 rounded"
          style={{ background: 'var(--border)' }}>⌘K</kbd>
      </div>

      {/* Notifications */}
      <button className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5">
        <Bell className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2"
          style={{ borderColor: 'var(--card)' }} />
      </button>

      {/* Theme toggle */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 text-yellow-400" />
            : <Moon className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />}
        </button>
      )}

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={cn(
            'flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg transition-colors',
            'hover:bg-black/5 dark:hover:bg-white/5'
          )}
        >
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--foreground)' }}>
            Ali Hasanov
          </span>
          <ChevronDown className="w-3 h-3" style={{ color: 'var(--muted-fg)' }} />
        </button>

        {showUserMenu && (
          <div
            className="absolute right-0 top-full mt-1.5 w-48 rounded-xl shadow-xl z-50 border py-1"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Ali Hasanov</p>
              <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>Admin</p>
            </div>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--foreground)' }}>
              <User className="w-3.5 h-3.5" /> Profile
            </button>
            <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>

          </div>
        )}
      </div>
    </header>
  )
}
