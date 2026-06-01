import Link from 'next/link'
import { Shield, Zap, ShieldAlert, AlertTriangle, ClipboardCheck, Search, Users, ArrowRight, CheckCircle2, Star } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RiskShield — AI-Powered Risk Management for SMEs',
}

const FEATURES = [
  { icon: ShieldAlert, title: 'Risk Register', desc: 'Identify, assess and track risks with a 5×5 likelihood/impact matrix and automated scoring.', color: 'text-sky-500 bg-sky-500/10' },
  { icon: AlertTriangle, title: 'Incident Management', desc: 'Report incidents, assign investigators, track resolution timelines and severity escalations.', color: 'text-orange-500 bg-orange-500/10' },
  { icon: ClipboardCheck, title: 'Compliance Tracking', desc: 'Map controls to ISO 27001, SOC2 and GDPR frameworks. Track pass/fail with evidence upload.', color: 'text-green-500 bg-green-500/10' },
  { icon: Search, title: 'Audit Management', desc: 'Plan and execute internal audits, track findings and generate exportable audit reports.', color: 'text-blue-500 bg-blue-500/10' },
  { icon: Users, title: 'Vendor Risk', desc: 'Score your vendors, track contract renewals, run security questionnaires and get AI summaries.', color: 'text-sky-400 bg-sky-500/10' },
  { icon: Zap, title: 'AI Insights', desc: 'GPT-4o powered risk summaries, mitigation suggestions, incident analysis, and compliance recommendations.', color: 'text-yellow-500 bg-yellow-500/10' },
]

const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'CISO, TechCorp', text: 'RiskShield cut our risk review time by 60%. The AI summaries are incredibly accurate.', stars: 5 },
  { name: 'Marcus López', role: 'Risk Manager, FinGroup', text: 'Finally a tool that doesn\'t require a 6-month implementation. We were live in a week.', stars: 5 },
  { name: 'Ayse Kilic', role: 'Compliance Lead, MedTech', text: 'The ISO 27001 control tracking is exactly what we needed for our certification audit.', stars: 5 },
]

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b sticky top-0 z-50 backdrop-blur-md"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-lg" style={{ color: 'var(--foreground)' }}>RiskShield</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: 'var(--muted-fg)' }}>
          <a href="#features" className="hover:text-sky-500 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-sky-500 transition-colors">Pricing</a>
          <a href="#testimonials" className="hover:text-sky-500 transition-colors">Reviews</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium hover:text-sky-500 transition-colors"
            style={{ color: 'var(--muted-fg)' }}>
            Sign in
          </Link>
          <Link href="/register"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/25">
            Start Free Trial <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-8 py-24 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--muted-fg)' }}>
          <Zap className="w-3 h-3 text-sky-500" />
          AI-Powered · GPT-4o · ISO 27001 · SOC2
        </div>
        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6" style={{ color: 'var(--foreground)' }}>
          Enterprise Risk
          <br />
          <span className="text-sky-500">Management.</span>
          <br />
          <span className="text-3xl md:text-5xl" style={{ color: 'var(--muted-fg)' }}>Built for SMEs.</span>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
          The lightweight, AI-powered alternative to Archer IRM. Manage risks, incidents, compliance, audits and vendor risk in one platform — without enterprise complexity or price tags.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white bg-sky-500 hover:bg-sky-600 transition-all shadow-2xl shadow-sky-500/30 hover:scale-105">
            Start 14-Day Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/dashboard"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all border hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            View Live Demo
          </Link>
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--muted-fg)' }}>No credit card required · SOC2 compliant · GDPR ready</p>

        {/* Mock dashboard preview */}
        <div className="mt-16 rounded-2xl overflow-hidden shadow-2xl border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" /></div>
            <div className="flex-1 h-5 rounded-md mx-auto max-w-xs text-xs flex items-center justify-center" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
              app.riskshield.io/dashboard
            </div>
          </div>
          <div className="p-6 grid grid-cols-4 gap-4">
            {[
              { label: 'Total Risks', value: '7', color: '#0ea5e9' },
              { label: 'Open Incidents', value: '2', color: '#f97316' },
              { label: 'Compliance', value: '68%', color: '#22c55e' },
              { label: 'Vendors', value: '4', color: '#0ea5e9' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl text-left" style={{ background: 'var(--muted)' }}>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6 grid grid-cols-2 gap-4">
            <div className="h-32 rounded-xl" style={{ background: 'var(--muted)' }}>
              <div className="p-3 text-xs font-semibold" style={{ color: 'var(--muted-fg)' }}>Risk Heatmap</div>
              <div className="grid grid-cols-5 gap-1 px-3">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="aspect-square rounded"
                    style={{ background: i % 7 === 0 ? '#ef4444' : i % 4 === 0 ? '#f97316' : i % 3 === 0 ? '#eab308' : 'var(--border)', opacity: 0.7 }} />
                ))}
              </div>
            </div>
            <div className="h-32 rounded-xl p-3" style={{ background: 'var(--muted)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-fg)' }}>AI Insights</p>
              <div className="space-y-2">
                {['Critical: SQL Injection found', 'Warning: Phishing spike detected'].map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${i === 0 ? 'bg-red-500' : 'bg-orange-500'}`} />
                    <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-8 py-20 max-w-6xl mx-auto">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-sky-500 mb-3">Everything you need</p>
        <h2 className="text-3xl font-black text-center mb-4" style={{ color: 'var(--foreground)' }}>
          Full IRM suite. No bloat.
        </h2>
        <p className="text-center mb-12" style={{ color: 'var(--muted-fg)' }}>
          Purpose-built for security teams at growing companies.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="p-6 rounded-2xl border hover:shadow-lg transition-all group"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: 'var(--foreground)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="px-8 py-20" style={{ background: 'var(--muted)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12" style={{ color: 'var(--foreground)' }}>
            Trusted by security teams
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="p-6 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.stars)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--foreground)' }}>&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-black mb-4" style={{ color: 'var(--foreground)' }}>
          Ready to manage risk smarter?
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--muted-fg)' }}>
          Join hundreds of security teams who trust RiskShield.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white bg-sky-500 hover:bg-sky-600 shadow-xl shadow-sky-500/25 transition-all">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/dashboard"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold border transition-all hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            Live Demo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-8 py-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold" style={{ color: 'var(--foreground)' }}>RiskShield</span>
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {['Privacy Policy', 'Terms of Service', 'Security', 'Status', 'Contact'].map(l => (
            <a key={l} href="#" className="hover:text-sky-500 transition-colors">{l}</a>
          ))}
        </div>
        <p className="mt-4">© 2025 RiskShield. All rights reserved.</p>
      </footer>
    </div>
  )
}

