'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LayoutDashboard, ShieldAlert, ScrollText, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { db } from '@/lib/db'

const ITEMS = [
  { href: '/dashboard',           label: 'Ana',        icon: LayoutDashboard },
  { href: '/risks',               label: 'Risklər',    icon: ShieldAlert },
  { href: '/compliance-workflow', label: 'Compliance', icon: ScrollText },
  { href: '/incidents',           label: 'İnsident',   icon: AlertTriangle, badge: true },
  { href: '/compliance-monitoring', label: 'Monitor',  icon: ClipboardCheck },
]

// Mobil alt naviqasiya — yalnız md-dən kiçik ekranlarda görünür.
export function MobileNav() {
  const pathname = usePathname()
  const [openIncidents, setOpenIncidents] = useState(0)

  useEffect(() => {
    db.getIncidents()
      .then(list => setOpenIncidents(list.filter(i => i.status !== 'done' && i.status !== 'closed').length))
      .catch(() => { /* say göstərilmir — nav yenə işləyir */ })
  }, [])

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t"
      style={{
        // Solid fon — color-mix/backdrop-filter köhnə mobil brauzerlərdə yoxdur,
        // şəffaf qalanda nav yazıları səhifə mətni ilə üst-üstə düşürdü
        background: 'var(--card)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 16px rgba(16,24,40,0.06)',
      }}
      aria-label="Mobil naviqasiya"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map(it => {
          const active = pathname.startsWith(it.href)
          const Icon = it.icon
          return (
            <Link key={it.href} href={it.href}
              className="relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors"
              style={{ color: active ? 'var(--brand-500)' : 'var(--muted-fg)' }}>
              <span className="relative">
                <Icon className="w-5 h-5" />
                {it.badge && openIncidents > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {openIncidents > 99 ? '99+' : openIncidents}
                  </span>
                )}
              </span>
              {it.label}
              {active && <span className="absolute top-0 w-8 h-0.5 rounded-full" style={{ background: 'var(--brand-500)' }} />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
