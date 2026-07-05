'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Shield, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // The recovery link establishes a session automatically (detectSessionInUrl).
  // We just listen so a stale view reflects the recovery state if needed.
  useEffect(() => {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isMock) return
    let unsub: (() => void) | undefined
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: sub } = supabase.auth.onAuthStateChange(() => { /* session ready */ })
      unsub = () => sub.subscription.unsubscribe()
    })()
    return () => { if (unsub) unsub() }
  }, [])

  const onSubmit = async (v: FormValues) => {
    setLoading(true)
    setError(null)
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isMock) {
      await new Promise((r) => setTimeout(r, 600))
      setDone(true)
      setLoading(false)
      setTimeout(() => router.push('/login'), 1500)
      return
    }
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: v.password })
      if (error) setError(error.message)
      else {
        setDone(true)
        setTimeout(() => router.push('/login'), 1500)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error')
    }
    setLoading(false)
  }

  const inp = 'w-full pl-10 pr-10 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500'
  const fieldSty = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }

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
            <p className="font-bold text-white text-lg leading-none">GRCell</p>
            <p className="text-xs text-sky-400">IRM Platform</p>
          </div>
        </div>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-4xl font-black text-white leading-tight mb-4">
            Set a new<br />password.
          </motion.h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            Choose a strong password you don&apos;t use anywhere else.
          </p>
        </div>
        <div />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>GRCell</span>
          </div>

          {done ? (
            <div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--foreground)' }}>Password updated</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--muted-fg)' }}>
                Redirecting you to sign in…
              </p>
              <Link href="/login" className="text-sm font-semibold text-sky-500 hover:text-sky-400">Go to sign in</Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--foreground)' }}>New password</h2>
              <p className="text-sm mb-8" style={{ color: 'var(--muted-fg)' }}>
                Enter and confirm your new password below.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                    <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                      className={inp} style={fieldSty} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPass
                        ? <EyeOff className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                        : <Eye className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                    <input {...register('confirm')} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                      className={inp} style={fieldSty} />
                  </div>
                  {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
                </div>

                {error && (
                  <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                    <div className="mt-1">
                      <Link href="/forgot-password" className="underline hover:text-red-400">Request a new reset link</Link>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-60 transition-all shadow-lg shadow-sky-500/25 mt-2">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><span>Update password</span><ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
