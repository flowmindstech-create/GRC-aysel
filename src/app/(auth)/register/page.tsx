'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, User, Building, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const schema = z.object({
  full_name: z.string().min(2),
  company: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin','risk_manager','auditor','employee']),
})
type FormValues = z.infer<typeof schema>

function setMockSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = "mock-session=true; path=/; max-age=86400; SameSite=Lax"
  }
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'admin' },
  })

  const onSubmit = async (v: FormValues) => {
    setLoading(true)
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isMock) {
      await new Promise(r => setTimeout(r, 800))
      setMockSessionCookie()
      router.push('/dashboard')
    } else {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: v.email,
        password: v.password,
        options: {
          data: {
            full_name: v.full_name,
            company: v.company,
            role: v.role,
          }
        }
      })
      if (error) {
        alert(error.message)
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }


  const inp = "w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--background)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>RiskShield</span>
        </div>

        <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--foreground)' }}>Create your account</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--muted-fg)' }}>Start managing risks with AI — free 14-day trial.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'full_name', label: 'Full Name', icon: User, type: 'text', placeholder: 'Ali Hasanov' },
            { name: 'company', label: 'Company', icon: Building, type: 'text', placeholder: 'Acme Corp' },
            { name: 'email', label: 'Work Email', icon: Mail, type: 'email', placeholder: 'you@company.com' },
            { name: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>{f.label}</label>
              <div className="relative">
                <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                <input {...register(f.name as keyof FormValues)} type={f.type} placeholder={f.placeholder}
                  className={inp} style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Your Role</label>
            <select {...register('role')} className="w-full px-3 py-3 rounded-xl text-sm border outline-none"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <option value="admin">Administrator</option>
              <option value="risk_manager">Risk Manager</option>
              <option value="auditor">Auditor</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-60 transition-all shadow-lg shadow-sky-500/25 mt-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--muted-fg)' }}>
          Already have an account?{' '}
          <Link href="/login" className="text-sky-500 hover:text-sky-400 font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}

