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
  if (a.includes('delet') || a.includes('sil') || a.includes('remov')) return { label: 'SİLİNDİ', rgb: '225,29,72' }
  if (a.includes('creat') || a.includes('add') || a.includes('report') || a.includes('yarad')) return { label: 'YARADILDI', rgb: '5,150,105' }
  if (a.includes('updat') || a.includes('review') || a.includes('edit') || a.includes('redakt') || a.includes('approv') || a.includes('təsdiq')) return { label: 'REDAKTƏ', rgb: '217,119,6' }
  if (a.includes('open') || a.includes('view') || a.includes('açıl') || a.includes('bax')) return { label: 'AÇILDI', rgb: '59,130,246' }
  if (a.includes('clos') || a.includes('solv') || a.includes('resolv') || a.includes('bağlan') || a.includes('done')) return { label: 'BAĞLANDI', rgb: '100,116,139' }
  return { label: (action || '—').toUpperCase(), rgb: '100,116,139' }
}

const ENTITY_LABELS: Record<string, string> = {
  risk: 'Risk', incident: 'İnsident', control: 'Nəzarət', audit: 'Audit',
  finding: 'Tapıntı', vendor: 'Vendor', obligation: 'Öhdəlik', process: 'Proses',
  policy: 'Siyasət', document: 'Sənəd', regulatory_change: 'Tənzimləmə', profile: 'İstifadəçi',
}
const entityLabel = (t: string) => ENTITY_LABELS[t] ?? (t || '—')

// İngiliscə action-ları Azərbaycanca tərcümə edir (cədvəl + axtarış üçün)
function actionLabel(action: string): string {
  const a = (action || '').toLowerCase()
  const map: [string, string][] = [
    ['updated risk', 'Risk redaktə edildi'], ['created risk', 'Risk yaradıldı'], ['deleted risk', 'Risk silindi'],
    ['reported incident', 'İnsident bildirildi'], ['updated incident', 'İnsident redaktə edildi'], ['deleted incident', 'İnsident silindi'],
    ['created control', 'Nəzarət yaradıldı'], ['updated control', 'Nəzarət redaktə edildi'], ['deleted control', 'Nəzarət silindi'],
    ['created audit', 'Audit yaradıldı'], ['updated audit', 'Audit redaktə edildi'], ['deleted audit', 'Audit silindi'],
    ['created finding', 'Tapıntı yaradıldı'], ['updated finding', 'Tapıntı redaktə edildi'], ['deleted finding', 'Tapıntı silindi'],
    ['added vendor', 'Vendor əlavə edildi'], ['updated vendor profile', 'Vendor redaktə edildi'], ['deleted vendor', 'Vendor silindi'],
    ['created obligation', 'Öhdəlik yaradıldı'], ['updated obligation', 'Öhdəlik redaktə edildi'], ['deleted obligation', 'Öhdəlik silindi'],
    ['created process', 'Proses yaradıldı'], ['updated process', 'Proses redaktə edildi'], ['deleted process', 'Proses silindi'],
    ['created policy', 'Siyasət yaradıldı'], ['updated policy', 'Siyasət redaktə edildi'], ['deleted policy', 'Siyasət silindi'],
    ['created document', 'Sənəd yaradıldı'], ['updated document', 'Sənəd redaktə edildi'], ['deleted document', 'Sənəd silindi'],
    ['grant_access', 'Xüsusi icazə verildi'], ['revoke_access', 'Xüsusi icazə ləğv edildi'],
    ['transfer', 'Vəzifə təhvil verildi'], ['role changed', 'Rol dəyişdirildi'],
  ]
  for (const [en, az] of map) {
    if (a.includes(en)) return az
  }
  if (a.includes('open') || a.includes('view') || a.includes('bax')) return 'Açıldı'
  if (a.includes('clos') || a.includes('solv') || a.includes('resolv')) return 'Bağlandı'
  if (a.includes('creat') || a.includes('add') || a.includes('report')) return 'Yaradıldı'
  if (a.includes('updat') || a.includes('edit') || a.includes('review')) return 'Redaktə edildi'
  if (a.includes('delet') || a.includes('remov') || a.includes('sil')) return 'Silindi'
  return action || '—'
}

const KIND_FILTERS = ['all', 'YARADILDI', 'REDAKTƏ', 'SİLİNDİ', 'AÇILDI', 'BAĞLANDI'] as const

function fmtDate(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' })
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
    { key: 'created_at', label: 'Tarix', value: a => fmtDate(a.created_at) },
    { key: 'user', label: 'İstifadəçi', value: a => userName(a) },
    { key: 'kind', label: 'Status', value: a => actionKind(a.action).label },
    { key: 'action', label: 'Əməliyyat', value: a => actionLabel(a.action) },
    { key: 'entity_type', label: 'Obyekt növü', value: a => entityLabel(a.entity_type) },
    { key: 'entity_title', label: 'Obyekt', value: a => a.entity_title ?? '' },
  ]

  const selectSty = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <PageHeader
        title="Loglar"
        subtitle={`Audit izi · ${filtered.length} / ${activities.length} qeyd`}
        actions={<ExportMenu columns={exportColumns} rows={filtered} filename="audit-loglar" title="Audit Loglar" />}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Obyekt / istifadəçi / əməliyyat axtar…"
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty}>
          <option value="all">Bütün obyektlər</option>
          {entityTypes.map(t => <option key={t} value={t}>{entityLabel(t)}</option>)}
        </select>
        <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty}>
          {KIND_FILTERS.map(k => <option key={k} value={k}>{k === 'all' ? 'Bütün əməliyyatlar' : k}</option>)}
        </select>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty}>
          <option value="all">Bütün istifadəçilər</option>
          {userNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="Başlanğıc tarix"
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="Son tarix"
          className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer" style={selectSty} />
        {(entityFilter !== 'all' || kindFilter !== 'all' || userFilter !== 'all' || fromDate || toDate || search) && (
          <button onClick={() => { setSearch(''); setEntityFilter('all'); setKindFilter('all'); setUserFilter('all'); setFromDate(''); setToDate('') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border" style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
            <Filter className="w-3.5 h-3.5" /> Sıfırla
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Tarix', 'İstifadəçi', 'Status', 'Əməliyyat', 'Obyekt növü', 'Obyekt'].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Yüklənir…</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={6} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
              <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Uyğun log qeydi tapılmadı</p>
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
        <p className="text-xs mt-3 text-center" style={{ color: 'var(--muted-fg)' }}>İlk 500 qeyd göstərilir — filtrləri daraldın.</p>
      )}
    </main>
  )
}
