'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Shield, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({ email: z.string().email('Invalid email') })
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (v: FormValues) => {
    setLoading(true)
    setError(null)
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isMock) {
      await new Promise((r) => setTimeout(r, 600))
      setSentTo(v.email)
      setSent(true)
    } else {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) setError(error.message)
        else { setSentTo(v.email); setSent(true) }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unexpected error')
      }
    }
    setLoading(false)
  }

  const inp = 'w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500'

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
            Forgot your<br />password?
          </motion.h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            Enter your account email and we&apos;ll send you a secure link to reset your password.
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
            <span className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>RiskShield</span>
          </div>

          {sent ? (
            <div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--foreground)' }}>Check your email</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--muted-fg)' }}>
                If an account exists for <strong style={{ color: 'var(--foreground)' }}>{sentTo}</strong>, a password reset link is on its way. Check spam if you don&apos;t see it.
              </p>
              <Link href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-sky-500 hover:text-sky-400">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--foreground)' }}>Reset password</h2>
              <p className="text-sm mb-8" style={{ color: 'var(--muted-fg)' }}>
                We&apos;ll email you a link to set a new password.
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

                {error && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-60 transition-all shadow-lg shadow-sky-500/25 mt-2">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><span>Send reset link</span><ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <p className="text-sm text-center mt-6" style={{ color: 'var(--muted-fg)' }}>
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sky-500 hover:text-sky-400 font-medium">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
