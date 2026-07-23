'use client'

import { useState, useEffect } from 'react'
import { getMyOrgAccess } from '@/lib/db'
import type { Organization } from '@/types'
import { ShieldAlert, Mail, LogOut } from 'lucide-react'

// Abunə qıfılı (phase51): org-un abunəsi bitib/dayandırılıbsa app-ı bloklayır.
// FAIL-OPEN: yüklənərkən və ya status naməlum olanda məzmun göstərilir —
// blok yalnız açıq şəkildə deaktiv abunədə baş verir.
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; active: boolean; org: Organization | null }>({
    loading: true, active: true, org: null,
  })

  useEffect(() => {
    let alive = true
    getMyOrgAccess()
      .then(r => { if (alive) setState({ loading: false, active: r.active, org: r.org }) })
      .catch(() => { if (alive) setState({ loading: false, active: true, org: null }) }) // fail-open
    return () => { alive = false }
  }, [])

  // Yüklənərkən məzmunu bloklamırıq (flash olmasın) — yalnız aşkar deaktivdə blok
  if (state.loading || state.active) return <>{children}</>

  const org = state.org
  const status = org?.subscription_status
  const heading = status === 'suspended' ? 'Abunəlik dayandırılıb'
    : status === 'cancelled' ? 'Abunəlik ləğv olunub'
    : 'Abunəlik müddəti bitib'

  async function signOut() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      await createClient().auth.signOut()
    } catch { /* ignore */ }
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md text-center rounded-2xl border p-8 shadow-xl"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(225,29,72,0.10)' }}>
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>{heading}</h1>
        <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--muted-fg)' }}>
          {org?.name ? <><strong style={{ color: 'var(--foreground)' }}>{org.name}</strong> təşkilatının</> : 'Təşkilatınızın'}{' '}
          GRCell abunəliyi hazırda aktiv deyil. Sistemə giriş müvəqqəti dayandırılıb.
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-fg)' }}>
          Girişi bərpa etmək üçün abunəliyi yeniləyin.
        </p>

        <a href={`mailto:${org?.contact_email || 'support@grcell.com'}`}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors">
          <Mail className="w-4 h-4" /> Abunəliyi yenilə
        </a>
        <button onClick={signOut}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 mt-3 rounded-xl text-sm font-semibold border transition-colors hover:bg-black/[0.04]"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          <LogOut className="w-4 h-4" /> Çıxış
        </button>
      </div>
    </div>
  )
}
