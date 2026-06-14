'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MOCK_VENDORS } from '@/lib/seed-data'
import { db } from '@/lib/db'
import type { Vendor, VendorStatus, VendorCategory } from '@/types'
import { VendorStatusBadge } from '@/components/shared/Badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import {
  Plus, Search, FileText, AlertTriangle, CheckCircle, Calendar,
  Mail, ExternalLink, MoreHorizontal, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VendorFormDialog } from './VendorFormDialog'

function RiskScore({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f97316' : '#22c55e'
  const bg    = score >= 70 ? '#ef444415' : score >= 40 ? '#f9731615' : '#22c55e15'
  const width = `${score}%`
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color, background: bg, padding: '2px 6px', borderRadius: '99px' }}>
        {score}
      </span>
    </div>
  )
}

function getRandomAiSummary(vendorName: string) {
  const summaries = [
    `${vendorName} risk profile has been recalculated. General security compliance matches targets. Highly responsive security team.`,
    `${vendorName} has recently updated their privacy policy. No severe exposure found, but compliance certification is pending.`,
    `${vendorName} is fully aligned with industry best practices. Minor recommendations logged for key rotation policies.`,
  ]
  return summaries[Math.floor(Math.random() * summaries.length)]
}

export function VendorTable() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | null>(null)
  const [loadingAi, setLoadingAi] = useState<string | null>(null) // contains vendorId

  useEffect(() => {
    async function load() {
      const data = await db.getVendors()
      setVendors(data)
    }
    load()
  }, [])

  const filtered = vendors.filter(v => {
    const ms = v.name.toLowerCase().includes(search.toLowerCase())
    const mst = statusFilter === 'all' || v.status === statusFilter
    return ms && mst
  })

  const handleSave = async (vendor: Vendor) => {
    const saved = await db.saveVendor(vendor)
    setVendors(prev => {
      const idx = prev.findIndex(v => v.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next
      }
      return [saved, ...prev]
    })
    setShowForm(false)
    setEditVendor(null)
  }

  const handleRegenerateAi = async (vendor: Vendor) => {
    setLoadingAi(vendor.id)
    await new Promise(r => setTimeout(r, 1200))
    const updated = {
      ...vendor,
      ai_summary: getRandomAiSummary(vendor.name)
    }
    const saved = await db.saveVendor(updated)
    setVendors(prev => prev.map(v => v.id === saved.id ? saved : v))
    setLoadingAi(null)
  }

  return (
    <div>
      <PageHeader
        title="Vendor Risk Management"
        subtitle={`${vendors.length} vendors · ${vendors.filter(v => v.risk_score >= 70).length} high risk`}
        actions={
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/20">
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Vendors', value: vendors.length, color: 'text-sky-400' },
          { label: 'High Risk (≥70)', value: vendors.filter(v => v.risk_score >= 70).length, color: 'text-red-500' },
          { label: 'Avg Risk Score', value: vendors.length ? Math.round(vendors.reduce((s, v) => s + v.risk_score, 0) / vendors.length) : 0, color: 'text-orange-500' },
          { label: 'Renewals < 90d', value: vendors.filter(v => v.contract_renewal && !isPast(new Date(v.contract_renewal))).length, color: 'text-yellow-500' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-80"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors…" className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--foreground)' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as VendorStatus | 'all')}
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          {['all','active','inactive','under_review','terminated'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Vendor cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((vendor, i) => (
            <motion.div key={vendor.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card overflow-hidden">
              {/* Card header */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(expanded === vendor.id ? null : vendor.id)}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                  style={{ background: `hsl(${vendor.name.charCodeAt(0) * 6 % 360}, 70%, 45%)` }}>
                  {vendor.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{vendor.name}</p>
                    <VendorStatusBadge status={vendor.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                    <span className="capitalize">{vendor.category.replace('_',' ')}</span>
                    {vendor.contract_renewal && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Renews {format(new Date(vendor.contract_renewal), 'dd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Risk score */}
                <div className="w-40 shrink-0">
                  <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--muted-fg)' }}>RISK SCORE</p>
                  <RiskScore score={vendor.risk_score} />
                </div>

                <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', { 'rotate-180': expanded === vendor.id })}
                  style={{ color: 'var(--muted-fg)' }} />
              </button>

              {/* Expanded details */}
              {expanded === vendor.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }}
                  className="border-t overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <div className="p-5 space-y-4">
                    {/* Contact */}
                    <div className="flex items-center gap-6 text-sm">
                      {vendor.contact_name && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-[10px] font-bold">
                            {vendor.contact_name[0]}
                          </div>
                          <span style={{ color: 'var(--foreground)' }}>{vendor.contact_name}</span>
                        </div>
                      )}
                      {vendor.contact_email && (
                        <a href={`mailto:${vendor.contact_email}`}
                          className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-400">
                          <Mail className="w-3.5 h-3.5" />{vendor.contact_email}
                        </a>
                      )}
                    </div>

                    {/* Security assessment note */}
                    {vendor.ai_summary && (
                      <div className="p-4 rounded-xl border"
                        style={{ background: 'linear-gradient(135deg, #0c2d4e10, #0a192910)', borderColor: '#0ea5e930' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <p className="text-xs font-semibold text-sky-400">Security Assessment</p>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>{vendor.ai_summary}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-500 text-white hover:bg-sky-600">
                        Security Questionnaire
                      </button>
                      <button onClick={() => handleRegenerateAi(vendor)} disabled={loadingAi === vendor.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1 disabled:opacity-60"
                        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                        <FileText className="w-3.5 h-3.5 text-sky-500" />
                        {loadingAi === vendor.id ? 'Updating...' : 'Regenerate Summary'}
                      </button>
                      <button onClick={() => { setEditVendor(vendor); setShowForm(true) }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                        Edit Vendor
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showForm && (
        <VendorFormDialog
          vendor={editVendor}
          onClose={() => { setShowForm(false); setEditVendor(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

