'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormValues = z.infer<typeof schema>

function setMockSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = "mock-session=true; path=/; max-age=86400; SameSite=Lax"
  }
}

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (v: FormValues) => {
    setLoading(true)
    setAuthError(null)
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isMock) {
      await new Promise(r => setTimeout(r, 800))
      setMockSessionCookie()
      router.push('/dashboard')
    } else {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      })
      if (error) {
        // Real Supabase auth — show the error (no silent mock fallback)
        setAuthError(error.message)
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }


  const inp = "w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
  const sty = { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-none">RiskShield</p>
            <p className="text-xs text-sky-400">IRM Platform</p>
          </div>
        </div>

        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-4xl font-black text-white leading-tight mb-4">
            Enterprise Risk<br />Management.<br />
            <span className="text-sky-400">Built for SMEs.</span>
          </motion.h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            Protect your business with structured risk identification, incident management, and compliance tracking — all in one platform.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { value: '10K+', label: 'Risks Managed' },
            { value: '98%', label: 'Uptime SLA' },
            { value: 'ISO 27001', label: 'Certified' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>RiskShield</span>
          </div>

          <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--foreground)' }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--muted-fg)' }}>
            Sign in to your RiskShield account.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                <input {...register('email')} type="email" placeholder="you@company.com"
                  className={inp} style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Password</label>
                <Link href="/forgot-password" className="text-xs text-sky-500 hover:text-sky-400">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                <input {...register('password')} type={showPass ? 'text' : 'password'}
                  placeholder="••••••••" className={inp}
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPass
                    ? <EyeOff className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                    : <Eye className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {authError && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{authError}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-60 transition-all shadow-lg shadow-sky-500/25 mt-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: 'var(--muted-fg)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-sky-500 hover:text-sky-400 font-medium">Create account</Link>
          </p>

          {/* Demo hint */}
          <button
            type="button"
            onClick={() => {
              setMockSessionCookie()
              router.push('/dashboard')
            }}
            className="w-full mt-6 p-3 rounded-xl text-center cursor-pointer hover:bg-white/5 transition-colors border"
            style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-bold text-sky-400">
              🚀 Access Demo Directly Without Registration →
            </p>
          </button>
        </motion.div>
      </div>
    </div>
  )
}

