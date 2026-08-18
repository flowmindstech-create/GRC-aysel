'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import { SEED_RAS_KRIS } from '@/lib/seed-ras'
import type { AppetiteEntry, AppetiteEntryStatus, AppetiteLevel, AppetiteRiskCategory, KRIItem } from '@/types'
import { RISK_CATEGORY_VALUES, CATEGORY_LABELS } from '@/lib/risk-categories'
import { cn } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Target, X, Save, Gauge } from 'lucide-react'
import { toast } from 'sonner'

// Dəyərlər bazadakı CHECK məhdudiyyətləri ilə eynidir (phase1-foundation).
const STATUS: Record<AppetiteEntryStatus, { label: string; cls: string }> = {
  draft:            { label: 'Draft',            cls: 'bg-slate-500/15 text-slate-400' },
  pending_approval: { label: 'Pending Approval', cls: 'bg-amber-500/15 text-amber-400' },
  approved:         { label: 'Approved',         cls: 'bg-sky-500/15 text-sky-400' },
  active:           { label: 'Active',           cls: 'bg-emerald-500/15 text-emerald-400' },
  superseded:       { label: 'Superseded',       cls: 'bg-neutral-500/15 text-neutral-400' },
}
const LEVELS: AppetiteLevel[] = ['zero', 'low', 'moderate', 'elevated', 'high']
// Kateqoriyalar tək mənbədən gəlir (lib/risk-categories.ts) — burada təkrar siyahı saxlamırıq.
const CATEGORIES: AppetiteRiskCategory[] = [...RISK_CATEGORY_VALUES, 'overall']
const MONTHS = ['M1', 'M2', 'M3'] as const
const thCls = 'text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap'

function categoryLabel(c: string | undefined): string {
  if (!c) return '—'
  return CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c.replace(/_/g, ' ')
}

// Faiz göstəriciləri mənbədə iki cür saxlanılır: bəziləri 1-in hissəsi kimi
// (0.0078 = 0.78%), likvidlik əmsalı kimi olanlar isə birbaşa faiz ədədi (494.9).
// Boş ay (null) hesabat sayılmır və "—" göstərilir — bildirilmiş 0-dan fərqlidir.
function formatReading(v: number | null | undefined, unit?: string): string {
  if (v === null || v === undefined) return '—'
  if (unit === 'Percent') {
    const pct = Math.abs(v) <= 1 ? v * 100 : v
    return `${Number(pct.toFixed(2))}%`
  }
  return String(Number(v.toFixed(2)))
}

const LEVEL_CLS: Record<AppetiteLevel, string> = {
  zero:     'bg-red-500/15 text-red-400',
  low:      'bg-emerald-500/15 text-emerald-400',
  moderate: 'bg-sky-500/15 text-sky-400',
  elevated: 'bg-amber-500/15 text-amber-400',
  high:     'bg-orange-500/15 text-orange-400',
}

function FormDialog({ item, onClose, onSave }: { item: AppetiteEntry | null; onClose: () => void; onSave: (i: AppetiteEntry) => Promise<void> }) {
  const isEdit = !!item
  const [category, setCategory] = useState<AppetiteRiskCategory>(item?.risk_category ?? 'operational')
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [appetite, setAppetite] = useState<AppetiteLevel>(item?.appetite_level ?? 'low')
  const [tolerance, setTolerance] = useState<AppetiteLevel>(item?.tolerance_level ?? 'low')
  const [green, setGreen] = useState(item?.threshold_green ?? '')
  const [amber, setAmber] = useState(item?.threshold_amber ?? '')
  const [red, setRed] = useState(item?.threshold_red ?? '')
  const [status, setStatus] = useState<AppetiteEntryStatus>(item?.status ?? 'draft')
  const [unit, setUnit] = useState(item?.business_unit ?? '')
  const [loading, setLoading] = useState(false)
  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const labelCls = 'block text-xs font-medium mb-1.5'

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!title.trim()) return; setLoading(true)
    const now = new Date().toISOString()
    await onSave({ id: item?.id ?? crypto.randomUUID(), org_id: item?.org_id ?? '',
      title: title.trim(), risk_category: category, description: description.trim() || undefined,
      appetite_level: appetite, tolerance_level: tolerance,
      threshold_green: green.trim() || undefined, threshold_amber: amber.trim() || undefined,
      threshold_red: red.trim() || undefined, status, business_unit: unit.trim() || undefined,
      created_at: item?.created_at ?? now, updated_at: now })
    setLoading(false)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEdit ? 'Edit Statement' : 'New Risk Appetite Statement'}</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04]"><X className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /></button>
          </div>
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Title <span className="text-red-400">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Operational Risk Appetite" className={fieldCls} style={inputStyle} required /></div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Risk Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as AppetiteRiskCategory)} className={`${fieldCls} cursor-pointer capitalize`} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c === 'overall' ? 'Overall' : CATEGORY_LABELS[c]}</option>)}
              </select></div>
            <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="The organisation accepts…" className={`${fieldCls} resize-none`} style={inputStyle} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Appetite Level</label>
                <select value={appetite} onChange={e => setAppetite(e.target.value as AppetiteLevel)} className={`${fieldCls} cursor-pointer capitalize`} style={inputStyle}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select></div>
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Tolerance Level</label>
                <select value={tolerance} onChange={e => setTolerance(e.target.value as AppetiteLevel)} className={`${fieldCls} cursor-pointer capitalize`} style={inputStyle}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls} style={{ color: '#059669' }}>Green</label>
                <input value={green} onChange={e => setGreen(e.target.value)} placeholder="&lt;4%" className={fieldCls} style={inputStyle} /></div>
              <div><label className={labelCls} style={{ color: '#d97706' }}>Amber</label>
                <input value={amber} onChange={e => setAmber(e.target.value)} placeholder="4%-5%" className={fieldCls} style={inputStyle} /></div>
              <div><label className={labelCls} style={{ color: '#e11d48' }}>Red</label>
                <input value={red} onChange={e => setRed(e.target.value)} placeholder="&gt;5%" className={fieldCls} style={inputStyle} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as AppetiteEntryStatus)} className={`${fieldCls} cursor-pointer`} style={inputStyle}>
                  {(Object.keys(STATUS) as AppetiteEntryStatus[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                </select></div>
              <div><label className={labelCls} style={{ color: 'var(--muted-fg)' }}>Business Unit</label>
                <input value={unit} onChange={e => setUnit(e.target.value)} className={fieldCls} style={inputStyle} /></div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-black/[0.04]" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
              <button type="submit" disabled={!title.trim() || loading} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-500)' }}>
                {loading ? 'Saving…' : (<>{isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{isEdit ? 'Update' : 'Create'}</>)}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function RiskAppetiteClient() {
  const [tab, setTab] = useState<'statements' | 'ras'>('statements')
  const [items, setItems] = useState<AppetiteEntry[]>([])
  const [kris, setKris] = useState<KRIItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<AppetiteEntry | null>(null)
  const [search, setSearch] = useState('')

  async function reload() {
    let k = await dbExt.getKRIItems()
    // RAS seed: KRI-lar boşdursa Excel RAS (04.08.2026) göstəricilərini yüklə
    if (k.length === 0 && SEED_RAS_KRIS.length > 0) {
      for (const item of SEED_RAS_KRIS) {
        await dbExt.saveKRIItem(item)
      }
      k = await dbExt.getKRIItems()
    }
    const [a] = await Promise.all([db.getRiskAppetite()])
    setItems(a)
    setKris(k)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const filtered = items.filter(i => !search || (i.title ?? '').toLowerCase().includes(search.toLowerCase()) || (i.risk_category ?? '').toLowerCase().includes(search.toLowerCase()))
  const filteredKris = kris.filter(k => !search || (k.name ?? '').toLowerCase().includes(search.toLowerCase()) || (k.risk_category ?? '').toLowerCase().includes(search.toLowerCase()))
  // Rüb başlıqları datadan gəlir — Q3/Q4 əlavə olunanda kod dəyişmir.
  const periods = Array.from(new Set(kris.flatMap(k => Object.keys(k.period_values ?? {})))).sort()
  const leafCols = 7 + 3 + periods.length * 3 + 3

  async function handleSave(i: AppetiteEntry) {
    await db.saveRiskAppetite(i); setShowForm(false); setEditItem(null); reload(); toast.success(editItem ? 'Updated' : 'Created')
  }
  async function handleDelete(id: string) { await db.deleteRiskAppetite(id); reload(); toast.success('Deleted') }

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {([
          { key: 'statements', label: 'Statements', icon: Target },
          { key: 'ras', label: 'RAS Indicators', icon: Gauge },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={tab === t.key ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'statements' && (<>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search statements…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--brand-500)' }}>
          <Plus className="w-4 h-4" /> New Statement
        </button>
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
        <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {['Category', 'Statement', 'Appetite', 'Tolerance', 'Green', 'Amber', 'Red', 'Status', 'Business Unit', ''].map(h => (
            <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={10} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
          : filtered.length === 0 ? (<tr><td colSpan={10} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}><div className="flex flex-col items-center gap-2"><Target className="w-8 h-8 opacity-30" /><p className="text-sm">No statements yet</p></div></td></tr>)
          : filtered.map((it, i) => (
            <motion.tr key={it.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-3.5"><span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                {it.risk_category === 'overall' ? 'Overall' : (CATEGORY_LABELS[it.risk_category] ?? it.risk_category ?? '—')}</span></td>
              <td className="px-3 py-3.5 max-w-xs">
                <span className="text-sm font-medium truncate block" style={{ color: 'var(--foreground)' }}>{it.title}</span>
                {it.description && <span className="text-[11px] line-clamp-1" style={{ color: 'var(--muted-fg)' }}>{it.description}</span>}
              </td>
              <td className="px-3 py-3.5">{it.appetite_level
                ? <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize', LEVEL_CLS[it.appetite_level])}>{it.appetite_level}</span>
                : <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>}</td>
              <td className="px-3 py-3.5">{it.tolerance_level
                ? <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize', LEVEL_CLS[it.tolerance_level])}>{it.tolerance_level}</span>
                : <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>—</span>}</td>
              <td className="px-3 py-3.5"><span className="text-[11px] whitespace-nowrap" style={{ color: '#059669' }}>{it.threshold_green ?? '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-[11px] whitespace-nowrap" style={{ color: '#d97706' }}>{it.threshold_amber ?? '—'}</span></td>
              <td className="px-3 py-3.5"><span className="text-[11px] whitespace-nowrap" style={{ color: '#e11d48' }}>{it.threshold_red ?? '—'}</span></td>
              <td className="px-3 py-3.5">{(() => { const s = STATUS[it.status] ?? { label: String(it.status ?? '—'), cls: 'bg-zinc-500/15 text-zinc-400' }; return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', s.cls)}>{s.label}</span> })()}</td>
              <td className="px-3 py-3.5"><span className="text-xs" style={{ color: it.business_unit ? 'var(--foreground)' : 'var(--muted-fg)' }}>{it.business_unit || '—'}</span></td>
              <td className="px-3 py-3.5"><div className="flex items-center gap-1">
                <button onClick={() => { setEditItem(it); setShowForm(true) }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"><Edit className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} /></button>
                <button onClick={() => handleDelete(it.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div></td>
            </motion.tr>
          ))}
        </tbody>
      </table></div></div>
      {showForm && <FormDialog key={editItem?.id ?? 'new'} item={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} onSave={handleSave} />}
      </>)}

      {tab === 'ras' && (<>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-52" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-fg)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search indicators…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: 'var(--foreground)' }} />
          </div>
        </div>
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
          {/* Sütunlar RAS(RİB) sənədindəki ardıcıllıqla: hədlər (RİB) və rübləri
              ayrı-ayrı aylıq xanalarla göstərən iki sıralı başlıq. */}
          <thead style={{ background: 'var(--muted)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Risk Area', 'Indicator', 'Formula', 'Appetite', 'Appetite Statement', 'Frequency', 'Unit'].map(h => (
                <th key={h} rowSpan={2} className={thCls} style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
              <th colSpan={3} className={`${thCls} text-center`} style={{ color: 'var(--muted-fg)' }}>RİB</th>
              {periods.map(p => (
                <th key={p} colSpan={3} className={`${thCls} text-center`} style={{ color: 'var(--muted-fg)' }}>{p}</th>))}
              {['Risk Owner', 'Data Source', 'Note'].map(h => (
                <th key={h} rowSpan={2} className={thCls} style={{ color: 'var(--muted-fg)' }}>{h}</th>))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className={thCls} style={{ color: '#059669' }}>Green</th>
              <th className={thCls} style={{ color: '#d97706' }}>Amber</th>
              <th className={thCls} style={{ color: '#e11d48' }}>Red</th>
              {periods.flatMap(p => MONTHS.map(mo => (
                <th key={`${p}-${mo}`} className={thCls} style={{ color: 'var(--muted-fg)' }}>{mo}</th>)))}
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={leafCols} className="py-16 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>Loading…</td></tr>)
            : filteredKris.length === 0 ? (<tr><td colSpan={leafCols} className="py-16 text-center" style={{ color: 'var(--muted-fg)' }}><div className="flex flex-col items-center gap-2"><Gauge className="w-8 h-8 opacity-30" /><p className="text-sm">No RAS indicators yet</p></div></td></tr>)
            : filteredKris.map((k, i) => (
              <motion.tr key={k.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] align-top" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-3 py-3.5"><span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{categoryLabel(k.risk_category)}</span></td>
                <td className="px-3 py-3.5 min-w-[170px] max-w-[230px]"><span className="text-sm font-medium block" style={{ color: 'var(--foreground)' }}>{k.name}</span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--brand-500)' }}>{k.kri_id}</span></td>
                <td className="px-3 py-3.5 max-w-[240px]"><span className="text-[11px] line-clamp-3" style={{ color: 'var(--muted-fg)' }}>{k.formula ?? '—'}</span></td>
                <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{k.appetite_limit ?? '—'}</span></td>
                <td className="px-3 py-3.5 max-w-[300px]"><span className="text-[11px] line-clamp-4" style={{ color: 'var(--muted-fg)' }}>{k.description ?? '—'}</span></td>
                <td className="px-3 py-3.5"><span className="text-[11px] capitalize whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{k.frequency ?? '—'}</span></td>
                <td className="px-3 py-3.5"><span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted-fg)' }}>{k.unit ?? '—'}</span></td>
                <td className="px-3 py-3.5"><span className="text-[11px] whitespace-nowrap" style={{ color: '#059669' }}>{k.threshold_green ?? '—'}</span></td>
                <td className="px-3 py-3.5"><span className="text-[11px] whitespace-nowrap" style={{ color: '#d97706' }}>{k.threshold_amber ?? '—'}</span></td>
                <td className="px-3 py-3.5"><span className="text-[11px] whitespace-nowrap" style={{ color: '#e11d48' }}>{k.threshold_red ?? '—'}</span></td>
                {periods.flatMap(p => {
                  const vals = k.period_values?.[p] ?? [null, null, null]
                  return [0, 1, 2].map(idx => (
                    <td key={`${p}-${idx}`} className="px-3 py-3.5">
                      <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{formatReading(vals[idx], k.unit)}</span>
                    </td>))
                })}
                <td className="px-3 py-3.5 max-w-[170px]"><span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{k.risk_owner ?? '—'}</span></td>
                <td className="px-3 py-3.5 max-w-[150px]"><span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{k.data_source ?? '—'}</span></td>
                <td className="px-3 py-3.5 max-w-[240px]"><span className="text-[11px] line-clamp-4" style={{ color: 'var(--muted-fg)' }}>{k.note ?? '—'}</span></td>
              </motion.tr>
            ))}
          </tbody>
        </table></div></div>
      </>)}
    </div>
  )
}
