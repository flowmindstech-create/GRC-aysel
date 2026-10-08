import Link from 'next/link'
import { Shield, Lock, ArrowRight } from 'lucide-react'

// Açıq qeydiyyat BAĞLANDI (phase67).
//
// Əvvəl bu səhifə `supabase.auth.signUp()` çağırırdı və internetdəki istənilən
// adam qeydiyyatdan keçib birbaşa DEFAULT_ORG-a düşürdü — yəni müştərinin GRC
// datası ilə eyni org-a. Bundan sonra hesabları yalnız Super Admin yaradır
// (Settings → Users → Add user → /api/admin/users).
//
// Route silinmir ki, köhnə linklər və e-poçtlar 404 verməsin; əvəzinə izah
// göstərilir. Müdafiənin ikinci qatı Supabase-dədir: Authentication →
// Sign In / Providers → Email → "Allow new users to sign up" söndürülüb.

export const metadata = {
  title: 'Registration closed — GRCell',
}

export default function RegisterClosedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>GRCell</span>
        </div>

        <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-sky-500" />
          </div>

          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Self sign-up is closed</h1>
            <p className="text-sm leading-relaxed mt-1.5" style={{ color: 'var(--muted-fg)' }}>
              GRCell accounts are issued by your organization&apos;s Super Admin. Public registration is disabled so that
              only authorized personnel can reach your risk and compliance data.
            </p>
          </div>

          <div className="rounded-lg p-3" style={{ background: 'var(--muted)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
              Need access? Ask your Super Admin to create an account for you. You will receive your email address and a
              temporary password, which you should change after your first sign-in.
            </p>
          </div>

          <Link href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-500 hover:text-sky-400">
            Go to sign in <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
