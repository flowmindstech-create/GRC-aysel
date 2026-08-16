'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { db } from '@/lib/db'
import type { Activity, UserProfile } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { ExportMenu } from '@/components/shared/ExportMenu'
import type { ExportColumn } from '@/lib/export'
import { Search, ScrollText, Filter } from 'lucide-react'

// Əməliyyat növünü status nişanına çevirir (AÇILDI/BAĞLANDI/YARADILDI/REDAKTƏ/SİLİNDİ)
function actionKind(action: string): { label: string; rgb: string } {
  const a = (action || '').toLowerCase()
  if (a.includes('delet') || a.includes('sil') || a.includes('remov')) return { label: 'DELETED', rgb: '225,29,72' }
  if (a.includes('creat') || a.includes('add') || a.includes('report') || a.includes('yarad')) return { label: 'CREATED', rgb: '5,150,105' }
  if (a.includes('updat') || a.includes('review') || a.includes('edit') || a.includes('redakt') || a.includes('approv') || a.includes('təsdiq')) return { label: 'UPDATED', rgb: '217,119,6' }
  if (a.includes('open') || a.includes('view') || a.includes('açıl') || a.includes('bax')) return { label: 'OPENED', rgb: '59,130,246' }
  if (a.includes('clos') || a.includes('solv') || a.includes('resolv') || a.includes('bağlan') || a.includes('done')) return { label: 'CLOSED', rgb: '100,116,139' }
  return { label: (action || '—').toUpperCase(), rgb: '100,116,139' }
}

const ENTITY_LABELS: Record<string, string> = {
  risk: 'Risk', incident: 'Incident', control: 'Control', audit: 'Audit',
  finding: 'Finding', vendor: 'Vendor', obligation: 'Obligation', process: 'Process',
  policy: 'Policy', document: 'Document', regulatory_change: 'Regulation', profile: 'User',
}
const entityLabel = (t: string) => ENTITY_LABELS[t] ?? (t || '—')

// İngiliscə action-ları Azərbaycanca tərcümə edir (cədvəl + axtarış üçün)
function actionLabel(action: string): string {
  const a = (action || '').toLowerCase()
  const map: [string, string][] = [
    ['updated risk', 'Risk Updated'], ['created risk', 'Risk Created'], ['deleted risk', 'Risk Deleted'],
    ['reported incident', 'Incident Reported'], ['updated incident', 'Incident Updated'], ['deleted incident', 'Incident Deleted'],
    ['created control', 'Control Created'], ['updated control', 'Control Updated'], ['deleted control', 'Control Deleted'],
    ['created audit', 'Audit Created'], ['updated audit', 'Audit Updated'], ['deleted audit', 'Audit Deleted'],
    ['created finding', 'Finding Created'], ['updated finding', 'Finding Updated'], ['deleted finding', 'Finding Deleted'],
    ['added vendor', 'Vendor Added'], ['updated vendor profile', 'Vendor Updated'], ['deleted vendor', 'Vendor Deleted'],
    ['created obligation', 'Obligation Created'], ['updated obligation', 'Obligation Updated'], ['deleted obligation', 'Obligation Deleted'],
    ['created process', 'Process Created'], ['updated process', 'Process Updated'], ['deleted process', 'Process Deleted'],
    ['created policy', 'Policy Created'], ['updated policy', 'Policy Updated'], ['deleted policy', 'Policy Deleted'],
    ['created document', 'Document Created'], ['updated document', 'Document Updated'], ['deleted document', 'Document Deleted'],
    ['grant_access', 'Access Granted'], ['revoke_access', 'Access Revoked'],
    ['transfer', 'Position Transferred'], ['role changed', 'Role Changed'],
  ]
  for (const [en, az] of map) {
    if (a.includes(en)) return az
  }
  if (a.includes('open') || a.includes('view') || a.includes('bax')) return 'Opened'
  if (a.includes('clos') || a.includes('solv') || a.includes('resolv')) return 'Closed'
  if (a.includes('creat') || a.includes('add') || a.includes('report')) return 'Created'
  if (a.includes('updat') || a.includes('edit') || a.includes('review')) return 'Updated'
  if (a.includes('delet') || a.includes('remov') || a.includes('sil')) return 'Deleted'
  return action || '—'
}

const KIND_FILTERS = ['all', 'CREATED', 'UPDATED', 'DELETED', 'OPENED', 'CLOSED'] as const

function fmtDate(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

export default function LogsPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    Promise.all([db.getActivities(), db.getProfiles()])
      .then(([acts, profs]) => { setActivities(acts); setProfiles(profs) })
      .catch(() => { /* fallback onsuz da işləyir */ })
      .finally(() => setLoading(false))
  }, [])

  const profileMap = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p.full_name])), [profiles])
  const userName = (a: Activity) => a.user_name || (a.user_id ? profileMap[a.user_id] : '') || '—'

  // Filter dropdown-ları üçün mövcud dəyərlər
  const entityTypes = useMemo(() => Array.from(new Set(activities.map(a => a.entity_type).filter(Boolean))), [activities])
  const userNames = useMemo(() => Array.from(new Set(activities.map(userName).filter(n => n && n !== '—'))), [activities, profileMap])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate).getTime() : null
    const to = toDate ? new Date(toDate).getTime() + 86_400_000 : null // günün sonuna qədər
    return activities.filter(a => {
      if (entityFilter !== 'all' && a.entity_type !== entityFilter) return false
      if (kindFilter !== 'all' && actionKind(a.action).label !== kindFilter) return false
      if (userFilter !== 'all' && userName(a) !== userFilter) return false
      const t = new Date(a.created_at).getTime()
      if (from && t < from) return false
      if (to && t > to) return false
      if (q) {
        const hay = `${a.entity_title ?? ''} ${userName(a)} ${a.action}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [activities, search, entityFilter, kindFilter, userFilter, fromDate, toDate, profileMap])

  const exportColumns: ExportColumn<Activity>[] = [
    { key: 'created_at', label: 'Date', value: a => fmtDate(a.created_at) },
    { key: 'user', label: 'User', value: a => userName(a) },
    { key: 'kind', label: 'Status', value: a => actionKind(a.action).label },
    { key: 'action', label: 'Action', value: a => actionLabel(a.action) },
    { key: 'entity_type', label: 'Entity type', value: a => entityLabel(a.entity_type) },
    { key: 'entity_title', label: 'Object', value: a => a.entity_title ?? '' },
  ]

  const selectSty = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <PageHeader
        title="Logs"
        subtitle={`Audit trail · ${filtered.length} / ${activities.length} records`}
        actions={<ExportMenu columns={exportColumns} rows={filtered} filename="audit-logs" title="Audit Logs" />}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entity / user / action…"
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty}>
          <option value="all">All entities</option>
          {entityTypes.map(t => <option key={t} value={t}>{entityLabel(t)}</option>)}
        </select>
        <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty}>
          {KIND_FILTERS.map(k => <option key={k} value={k}>{k === 'all' ? 'All Actions' : k}</option>)}
        </select>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty}>
          <option value="all">All users</option>
          {userNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="Start Date"
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="Due Date"
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty} />
        {(entityFilter !== 'all' || kindFilter !== 'all' || userFilter !== 'all' || fromDate || toDate || search) && (
          <button onClick={() => { setSearch(''); setEntityFilter('all'); setKindFilter('all'); setUserFilter('all'); setFromDate(''); setToDate('') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border" style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
            <Filter className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Date', 'User', 'Status', 'Action', 'Entity type', 'Object'].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={6} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
              <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No matching log entries found</p>
            </td></tr>
          ) : filtered.slice(0, 500).map((a, i) => {
            const k = actionKind(a.action)
            return (
              <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.01 }}
                style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-3 py-3 text-xs whitespace-nowrap font-mono" style={{ color: 'var(--muted-fg)' }}>{fmtDate(a.created_at)}</td>
                <td className="px-3 py-3 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{userName(a)}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                    style={{ background: `rgba(${k.rgb},0.14)`, color: `rgb(${k.rgb})` }}>{k.label}</span>
                </td>
                <td className="px-3 py-3 text-xs" style={{ color: 'var(--muted-fg)' }}>{actionLabel(a.action)}</td>
                <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{entityLabel(a.entity_type)}</td>
                <td className="px-3 py-3 text-sm max-w-[280px] truncate" style={{ color: 'var(--foreground)' }} title={a.entity_title ?? ''}>{a.entity_title ?? '—'}</td>
              </motion.tr>
            )
          })}
        </tbody>
      </table></div></div>
      {filtered.length > 500 && (
        <p className="text-xs mt-3 text-center" style={{ color: 'var(--muted-fg)' }}>Showing first 500 records — narrow your filters.</p>
      )}
    </main>
  )
}
