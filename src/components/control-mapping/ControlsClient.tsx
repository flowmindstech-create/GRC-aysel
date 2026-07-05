'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import type { Control, ComplianceObligation, Incident } from '@/types'
import { cn } from '@/lib/utils'
import { Search, Plus, Edit, Zap, AlertTriangle, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { ControlFormDialog } from './ControlFormDialog'

const TYPE_COLOR: Record<string, string> = {
  preventive: 'bg-blue-500/12 text-blue-400',
  detective:  'bg-yellow-500/12 text-yellow-400',
  corrective: 'bg-red-500/12 text-red-400',
  directive:  'bg-purple-500/12 text-purple-400',
}
const EFF_DOT = (e?: string) =>
  e === 'effective' ? '#34d399' : e === 'partially_effective' ? '#fbbf24' : e === 'ineffective' ? '#f87171' : 'var(--muted-fg)'

export function ControlsClient() {
  const [controls, setControls]   = useState<Control[]>([])
  const [obligations, setObligations] = useState<ComplianceObligation[]>([])
  const [linkMaps, setLinkMaps]   = useState<Record<string, { controlIds: string[]; policyIds: string[] }>>({})
  const [search, setSearch]       = useState('')
  const [fwFilter, setFwFilter]   = useState<string>('all')
  const [statFilter, setStatFilter] = useState<'all' | 'preventive' | 'detective' | 'failures'>('all')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editControl, setEditControl] = useState<Control | null>(null)
  const [simCtrl, setSimCtrl]     = useState<Control | null>(null)   // simulator target
  const [creatingInc, setCreatingInc] = useState(false)

  async function reload() {
    const [c, o, maps] = await Promise.all([db.getControls(), db.getObligations(), db.getObligationLinkMaps()])
    setControls(c); setObligations(o); setLinkMaps(maps); setLoading(false)
  }
  useEffect(() => { reload().catch(() => { toast.error('Nəzarətlər yüklənmədi'); setLoading(false) }) }, [])

  const handleSaveControl = (saved: Control) => {
    setControls(prev => {
      const idx = prev.findIndex(c => c.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
    setShowForm(false); setEditControl(null)
  }

  const handleApprove = async (ctrl: Control) => {
    const saved = await db.saveControl({ ...ctrl, approval_status: 'approved' })
    setControls(prev => prev.map(c => c.id === saved.id ? saved : c))
    toast.success(`Kontrol təsdiqləndi: ${saved.control_id}`)
  }

  // Obligations reachable from a control (reverse of obligation_control_links)
  const brokenObligations = useMemo(() => {
    if (!simCtrl) return [] as ComplianceObligation[]
    const ids = Object.entries(linkMaps).filter(([, m]) => m.controlIds.includes(simCtrl.id)).map(([oid]) => oid)
    return obligations.filter(o => ids.includes(o.id))
  }, [simCtrl, linkMaps, obligations])

  // Simulate a control failure → optionally raise a real incident
  async function raiseIncidentFromSim() {
    if (!simCtrl || creatingInc) return
    setCreatingInc(true)
    try {
      const now = new Date().toISOString()
      const broken = brokenObligations.map(o => o.obligation_code).join(', ')
      await db.saveIncident({
        id: crypto.randomUUID(), org_id: '',
        title: `Control failure: ${simCtrl.control_id}`,
        description: `${simCtrl.title} nəzarəti sıradan çıxdı.${broken ? ` Pozulan öhdəliklər: ${broken}.` : ''}`,
        severity: 'high', status: 'open', workflow_stage: 'intake',
        incident_category: 'Control failure', control_id: simCtrl.id,
        compliance_obligation_id: brokenObligations[0]?.id,
        created_at: now, updated_at: now,
      } as Incident)
      toast.success('İnsident yaradıldı (Incidents modulunda)')
      setSimCtrl(null)
    } catch { toast.error('İnsident yaradıla bilmədi') } finally { setCreatingInc(false) }
  }

  const frameworks = ['all', ...Array.from(new Set(controls.map(c => c.framework)))]
  const isFailure = (c: Control) => c.status === 'fail' || c.effectiveness_rating === 'ineffective'
  const filtered = controls.filter(c => {
    const matchSearch = !search || (c.title ?? '').toLowerCase().includes(search.toLowerCase()) || (c.control_id ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStat =
      statFilter === 'all' ? true
      : statFilter === 'failures' ? isFailure(c)
      : c.control_type === statFilter
    return (fwFilter === 'all' || c.framework === fwFilter) && matchSearch && matchStat
  })

  const stats = {
    total:      controls.length,
    preventive: controls.filter(c => c.control_type === 'preventive').length,
    detective:  controls.filter(c => c.control_type === 'detective').length,
    failures:   controls.filter(c => c.status === 'fail' || c.effectiveness_rating === 'ineffective').length,
  }

  return (
    <div className="space-y-5">
      {/* Stats — clickable filters (click a card to show only those controls) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { key: 'all',        label: 'Ümumi Nəzarətlər',           value: stats.total,      rgb: '14,165,233' },
          { key: 'preventive', label: 'Preventive (Önləyici)',      value: stats.preventive, rgb: '59,130,246' },
          { key: 'detective',  label: 'Detective (Aşkarlayıcı)',    value: stats.detective,  rgb: '234,179,8' },
          { key: 'failures',   label: 'Sıradan çıxanlar (Failures)', value: stats.failures,  rgb: '225,29,72' },
        ] as const).map((s, i) => {
          const active = statFilter === s.key
          return (
            <motion.button key={s.label} type="button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setStatFilter(s.key)} aria-pressed={active}
              className="card p-4 overflow-hidden relative text-left cursor-pointer transition-all hover:-translate-y-0.5"
              style={active ? { boxShadow: `0 0 0 2px rgba(${s.rgb},0.7)` } : undefined}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,rgba(${s.rgb},0.7),transparent)` }} />
              <p className="text-2xl font-bold tracking-tight" style={{ color: `rgb(${s.rgb})` }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
              {active && s.key !== 'all' && <p className="text-[10px] mt-1 font-semibold" style={{ color: `rgb(${s.rgb})` }}>● Filtr aktiv</p>}
            </motion.button>
          )
        })}
      </div>
      {statFilter !== 'all' && (
        <button type="button" onClick={() => setStatFilter('all')}
          className="text-[11px] font-medium -mt-2 hover:underline" style={{ color: 'var(--brand-500)' }}>
          ✕ Filtri təmizlə (hamısını göstər)
        </button>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-48" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls…" className="bg-transparent text-sm outline-none flex-1" style={{ color: 'var(--foreground)' }} />
        </div>
        <div className="flex gap-1 p-1 rounded-lg flex-wrap" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          {frameworks.map(fw => (
            <button key={fw} onClick={() => setFwFilter(fw)}
              className="px-3 py-1.5 rounded-md text-xs font-medium uppercase transition-all cursor-pointer"
              style={fwFilter === fw ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
              {fw === 'all' ? 'ALL' : fw.toUpperCase().replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditControl(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 cursor-pointer">
          <Plus className="w-4 h-4" /> Yeni Nəzarət Əlavə Et
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Kod', 'Nəzarət Adı', 'Tip', 'Metod / Tezlik', 'Sahib / Şöbə', 'Status', 'Simulyator', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={8} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={8} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>No controls found</td></tr>)
          : filtered.map((c, i) => {
            const pending = c.approval_status === 'pending_review'
            return (
            <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] align-top" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: 'var(--brand-500)' }}>{c.control_id}</span>
                <p className="text-[9px] uppercase mt-0.5" style={{ color: 'var(--muted-fg)' }}>{c.framework}</p>
              </td>
              <td className="px-3 py-3.5 max-w-[240px]">
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{c.title}</span>
                {c.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--muted-fg)' }} title={c.description}>{c.description}</p>}
              </td>
              <td className="px-3 py-3.5">{c.control_type ? <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize', TYPE_COLOR[c.control_type])}>{c.control_type}</span> : <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>}</td>
              <td className="px-3 py-3.5">
                <span className="text-xs capitalize" style={{ color: 'var(--foreground)' }}>{c.classification || '—'}</span>
                <p className="text-[10px] capitalize" style={{ color: 'var(--muted-fg)' }}>{c.execution_frequency || '—'}</p>
              </td>
              <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: c.owner_dept ? 'var(--foreground)' : 'var(--muted-fg)' }}>{c.owner_dept || '—'}</span></td>
              <td className="px-3 py-3.5">
                {pending ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">Gözləmədə</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: EFF_DOT(c.effectiveness_rating) }} /> Aktiv
                  </span>
                )}
              </td>
              <td className="px-3 py-3.5">
                <button onClick={() => setSimCtrl(c)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:bg-red-500/10"
                  style={{ borderColor: 'rgba(225,29,72,0.3)', color: '#f87171' }}>
                  <Zap className="w-3.5 h-3.5" /> İnsident Simulyasiya Et
                </button>
              </td>
              <td className="px-3 py-3.5"><div className="flex items-center gap-1">
                {pending && (
                  <button onClick={() => handleApprove(c)} title="Təsdiqlə" className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700"><Check className="w-3.5 h-3.5" /></button>
                )}
                <button onClick={() => { setEditControl(c); setShowForm(true) }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"><Edit className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} /></button>
              </div></td>
            </motion.tr>
            )
          })}
        </tbody>
      </table></div></div>

      {showForm && (
        <ControlFormDialog key={editControl?.id ?? 'new'} control={editControl} existing={controls}
          onClose={() => { setShowForm(false); setEditControl(null) }} onSave={handleSaveControl} />
      )}

      {/* Incident Simulator modal (dependency scan) */}
      <AnimatePresence>
        {simCtrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSimCtrl(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-2xl border shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-sm font-semibold flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /> Dependency Scan — {simCtrl.control_id}</h2>
                <button onClick={() => setSimCtrl(null)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
              </div>
              <div className="px-6 py-5 space-y-3">
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                  <b style={{ color: 'var(--foreground)' }}>{simCtrl.title}</b> nəzarəti sıradan çıxsa, aşağıdakı compliance öhdəlikləri pozulur:
                </p>
                {brokenObligations.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Bu nəzarət heç bir öhdəliyə bağlı deyil (Control Mapping-də map olunmayıb).</p>
                ) : (
                  <ul className="space-y-1.5">
                    {brokenObligations.map(o => (
                      <li key={o.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="text-[10px] font-mono font-bold text-red-400">{o.obligation_code}</span>
                        <span className="text-xs" style={{ color: 'var(--foreground)' }}>{o.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setSimCtrl(null)} className="px-4 py-2 rounded-lg text-sm hover:bg-black/[0.04]" style={{ color: 'var(--muted-fg)' }}>Bağla</button>
                  <button onClick={raiseIncidentFromSim} disabled={creatingInc}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'rgb(225,29,72)' }}>
                    <Zap className="w-3.5 h-3.5" /> {creatingInc ? 'Yaradılır…' : 'Real İnsident Yarat'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
