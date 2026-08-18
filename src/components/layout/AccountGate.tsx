'use client'

import { useState, useEffect } from 'react'
import { getCurrentProfile } from '@/lib/db'
import { UserX, LogOut } from 'lucide-react'

// Hesab qıfılı (phase56): profil deaktiv edilibsə (is_active=false) app-ı bloklayır.
//
// Əvvəl `is_active` YALNIZ yazılırdı, heç yerdə yoxlanmırdı — yəni vəzifə
// transferindən sonra "deaktiv edilmiş" şəxs normal daxil olub işləyə bilirdi.
//
// FAIL-OPEN: yüklənərkən və ya profil naməlum olanda məzmun göstərilir;
// blok yalnız açıq şəkildə is_active === false olduqda baş verir
// (SubscriptionGate ilə eyni prinsip — heç kim təsadüfən kilidlənməsin).
export function AccountGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; blocked: boolean; name?: string }>({
    loading: true, blocked: false,
  })

  useEffect(() => {
    let alive = true
    getCurrentProfile()
      .then(p => { if (alive) setState({ loading: false, blocked: p?.is_active === false, name: p?.full_name }) })
      .catch(() => { if (alive) setState({ loading: false, blocked: false }) }) // fail-open
    return () => { alive = false }
  }, [])

  if (state.loading || !state.blocked) return <>{children}</>

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
          <UserX className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Account deactivated</h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted-fg)' }}>
          {state.name ? <><strong style={{ color: 'var(--foreground)' }}>{state.name}</strong>, your</> : 'Your'}{' '}
          account has been deactivated — your responsibilities were transferred to another person.
          Contact your organization’s Super Admin to restore access.
        </p>
        <button onClick={signOut}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors">
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </div>
    </div>
  )
}
