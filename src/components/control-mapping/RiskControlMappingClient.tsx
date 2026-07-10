'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import { buildMapping } from '@/lib/control-mapping'
import { MappingMatrixClient } from './MappingMatrixClient'
import type { Control, Risk, ControlMapping, MappingType } from '@/types'
import { cn } from '@/lib/utils'
import { List, Grid3x3, Search, Edit, X, Plus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

// Mapping type config — chip colours match the matrix legend
const TYPE_CFG: Record<MappingType, { label: string; cls: string }> = {
  risk_mitigation_only: { label: 'Mitigation',  cls: 'bg-blue-500/12 text-blue-600 border-blue-500/25' },
  compliance_only:      { label: 'Compliance',  cls: 'bg-purple-500/12 text-purple-600 border-purple-500/25' },
  dual_purpose:         { label: 'Dual Purpose', cls: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/25' },
}
const ALL_TYPES = Object.keys(TYPE_CFG) as MappingType[]

// Control effectiveness dot (fed by the Control Checklist)
const effDot = (c: Control) => {
  const e = c.effectiveness_rating
  if (e === 'effective' || c.status === 'pass') return { color: '#10b981', label: 'Effective' }
  if (e === 'partially_effective' || c.status === 'partial') return { color: '#f59e0b', label: 'Partially effective' }
  if (e === 'ineffective' || c.status === 'fail') return { color: '#ef4444', label: 'Ineffective' }
  return { color: 'var(--muted-fg)', label: 'Not tested' }
}

export function RiskControlMappingClient() {
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list')
  const [controls, setControls] = useState<Control[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [mappings, setMappings] = useState<ControlMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [drawerControl, setDrawerControl] = useState<Control | null>(null)
  const [savingRisk, setSavingRisk] = useState(false)

  useEffect(() => {
    Promise.all([db.getControls(), db.getRisks(), dbExt.getControlMappings()])
      .then(([c, r, m]) => { setControls(c); setRisks(r); setMappings(m); setLoading(false) })
  }, [])

  const riskById = useMemo(() => Object.fromEntries(risks.map(r => [r.id, r])), [risks])

  // Group mappings by control — one row per control in the list view
  const mappingsByControl = useMemo(() => {
    const by: Record<string, ControlMapping[]> = {}
    mappings.forEach(m => { (by[m.control_id] ??= []).push(m) })
    return by
  }, [mappings])

  const filtered = controls.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    const linkedRiskNames = (mappingsByControl[c.id] ?? []).map(m => riskById[m.entity_id]?.title ?? '').join(' ')
    return (c.title ?? '').toLowerCase().includes(s) || (c.control_id ?? '').toLowerCase().includes(s) || linkedRiskNames.toLowerCase().includes(s)
  })

  const lastUpdated = (controlId: string) => {
    const list = mappingsByControl[controlId] ?? []
    if (!list.length) return null
    return list.map(m => m.created_at).sort().at(-1) ?? null
  }

  // Drawer actions — link / retype / unlink risks for one control
  async function addRiskLink(control: Control, riskId: string, type: MappingType) {
    setSavingRisk(true)
    try {
      const newMap: ControlMapping = {
        ...buildMapping('00000000-0000-0000-0000-000000000001', control.id, 'risk', riskId, type),
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      }
      const saved = await dbExt.saveControlMapping(newMap)
      setMappings(prev => [...prev, saved])
      toast.success('Risk bağlandı')
    } catch { toast.error('Bağlana bilmədi') } finally { setSavingRisk(false) }
  }

  async function changeType(mapping: ControlMapping, type: MappingType) {
    const saved = await dbExt.saveControlMapping({ ...mapping, mapping_type: type })
    setMappings(prev => prev.map(m => m.id === saved.id ? saved : m))
    toast.success('Əlaqə tipi dəyişdi')
  }

  async function removeLink(mappingId: string) {
    await dbExt.deleteControlMapping(mappingId)
    setMappings(prev => prev.filter(m => m.id !== mappingId))
    toast.success('Əlaqə silindi')
  }

  const drawerMappings = drawerControl ? (mappingsByControl[drawerControl.id] ?? []) : []
  const drawerAvailableRisks = drawerControl
    ? risks.filter(r => !drawerMappings.some(m => m.entity_id === r.id))
    : []

  return (
    <div className="space-y-5">
      {/* View toggle: List (default) | Matrix */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {([
            { key: 'list', label: 'Siyahı', icon: List },
            { key: 'matrix', label: 'Matris', icon: Grid3x3 },
          ] as const).map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={viewMode === v.key ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
              <v.icon className="w-3.5 h-3.5" /> {v.label}
            </button>
          ))}
        </div>
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kontrol və ya risk axtar…"
              className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
          </div>
        )}
      </div>

      {viewMode === 'matrix' ? (
        <MappingMatrixClient />
      ) : (
        /* ── LIST VIEW — controls as rows, linked risks as chips (from Risk Register) ── */
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
            {['Nəzarət Mexanizmi (Control)', 'Əlaqəli Risklər (Risk Register-dən)', 'Son yenilənmə', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={4} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
            : filtered.length === 0 ? (<tr><td colSpan={4} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}>
                <div className="flex flex-col items-center gap-2"><ShieldCheck className="w-8 h-8 opacity-30" /><p className="text-sm">Kontrol tapılmadı</p></div>
              </td></tr>)
            : filtered.map((c, i) => {
              const links = mappingsByControl[c.id] ?? []
              const upd = lastUpdated(c.id)
              const dot = effDot(c)
              return (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="group hover:bg-black/[0.02] align-top" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-4 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" title={dot.label} style={{ background: dot.color }} />
                    <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{c.control_id}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{c.title}</span>
                  </div>
                  <p className="text-[10px] mt-0.5 ml-4 uppercase" style={{ color: 'var(--muted-fg)' }}>{c.framework}{c.owner_dept ? ` · ${c.owner_dept}` : ''}</p>
                </td>
                <td className="px-4 py-4">
                  {links.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                      <AlertTriangle className="w-3 h-3" /> GAP — risk bağlanmayıb
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-w-[460px]">
                      {links.map(m => {
                        const r = riskById[m.entity_id]
                        const cfg = TYPE_CFG[m.mapping_type]
                        return (
                          <span key={m.id} title={`${r?.title ?? '—'} · ${cfg.label}`}
                            className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap', cfg.cls)}>
                            <span className="font-mono">{r?.risk_code ?? 'RSK-?'}</span>
                            <span className="max-w-[120px] truncate font-normal">{r?.title ?? '—'}</span>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-xs" style={{ color: upd ? 'var(--foreground)' : 'var(--muted-fg)' }}>
                    {upd ? new Date(upd).toLocaleDateString('az-AZ') : '—'}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <button onClick={() => setDrawerControl(c)} title="Riskləri idarə et"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:bg-black/[0.04]"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    <Edit className="w-3.5 h-3.5" /> Redaktə
                  </button>
                </td>
              </motion.tr>
              )
            })}
          </tbody>
        </table></div></div>
      )}

      {/* ── Side Drawer — manage one control's risk links ── */}
      <AnimatePresence>
        {drawerControl && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerControl(null)} />
            <motion.div initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-full max-w-md h-full overflow-y-auto border-l shadow-2xl"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                <div className="min-w-0">
                  <p className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{drawerControl.control_id}</p>
                  <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{drawerControl.title}</h2>
                </div>
                <button onClick={() => setDrawerControl(null)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04] shrink-0">
                  <X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Existing links */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-500)' }}>
                    Bağlı Risklər ({drawerMappings.length})
                  </p>
                  {drawerMappings.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Hələ risk bağlanmayıb — aşağıdan əlavə et.</p>
                  ) : (
                    <div className="space-y-2">
                      {drawerMappings.map(m => {
                        const r = riskById[m.entity_id]
                        return (
                          <div key={m.id} className="rounded-lg border p-2.5 space-y-1.5" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--brand-500)' }}>{r?.risk_code ?? '—'}</span>
                                <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{r?.title ?? 'Risk tapılmadı'}</p>
                              </div>
                              <button onClick={() => removeLink(m.id)} title="Əlaqəni sil"
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 shrink-0">
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                            <div className="flex gap-1">
                              {ALL_TYPES.map(t => (
                                <button key={t} onClick={() => changeType(m, t)}
                                  className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all',
                                    m.mapping_type === t ? TYPE_CFG[t].cls : 'opacity-40 hover:opacity-70 border-transparent')}
                                  style={m.mapping_type !== t ? { color: 'var(--muted-fg)' } : undefined}>
                                  {TYPE_CFG[t].label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Add new link — risks come ONLY from the Risk Register */}
                <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--brand-500)' }}>
                    <Plus className="w-3.5 h-3.5" /> Risk bağla (Risk Register-dən)
                  </p>
                  <select id="rcm-add-risk" defaultValue="" disabled={savingRisk || drawerAvailableRisks.length === 0}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    onChange={e => {
                      const riskId = e.target.value
                      if (riskId && drawerControl) { addRiskLink(drawerControl, riskId, 'risk_mitigation_only'); e.target.value = '' }
                    }}>
                    <option value="">{drawerAvailableRisks.length === 0 ? 'Bütün risklər artıq bağlıdır' : '— Risk seç —'}</option>
                    {drawerAvailableRisks.map(r => <option key={r.id} value={r.id}>{(r.risk_code ?? '—') + ' · ' + r.title}</option>)}
                  </select>
                  <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
                    Yeni əlaqə &quot;Mitigation&quot; tipi ilə yaranır — yuxarıda tipini dəyişə bilərsən.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
