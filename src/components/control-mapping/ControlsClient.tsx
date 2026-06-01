'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import type { Control, ControlMapping, EffectivenessRating, ControlType } from '@/types'
import { cn } from '@/lib/utils'
import { Search, Shield, CheckCircle2, AlertCircle, Clock, Plus, ChevronDown, ChevronUp } from 'lucide-react'

const TYPE_COLOR: Record<string, string> = {
  preventive: 'text-blue-400 bg-blue-400/10',
  detective:  'text-yellow-400 bg-yellow-400/10',
  corrective: 'text-red-400 bg-red-400/10',
  directive:  'text-purple-400 bg-purple-400/10',
}

const EFF_COLOR: Record<EffectivenessRating, { text: string; bg: string }> = {
  effective:           { text: '#059669', bg: 'rgba(5,150,105,0.1)' },
  partially_effective: { text: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  ineffective:         { text: '#e11d48', bg: 'rgba(225,29,72,0.1)' },
  na:                  { text: 'var(--muted-fg)', bg: 'var(--muted)' },
}

function EffBadge({ rating }: { rating?: EffectivenessRating }) {
  if (!rating) return null
  const c = EFF_COLOR[rating]
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
      style={{ background: c.bg, color: c.text }}>
      {rating.replace('_', ' ')}
    </span>
  )
}

function ControlCard({ ctrl, mappings, index }: { ctrl: Control; mappings: ControlMapping[]; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const myMappings = mappings.filter(m => m.control_id === ctrl.id)
  const eff = ctrl.effectiveness_rating as EffectivenessRating | undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="card overflow-hidden"
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: eff && EFF_COLOR[eff] ? `linear-gradient(90deg,transparent,${EFF_COLOR[eff].text},transparent)` : 'linear-gradient(90deg,transparent,rgba(14,165,233,0.4),transparent)' }} />

      {/* Header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(14,165,233,0.1)' }}>
          <Shield className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--brand-500)' }}>
              {ctrl.control_id}
            </span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold"
              style={{ background: 'rgba(14,165,233,0.1)', color: 'var(--brand-500)' }}>
              {ctrl.framework}
            </span>
            {ctrl.control_type && (
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize', TYPE_COLOR[ctrl.control_type])}>
                {ctrl.control_type}
              </span>
            )}
            <EffBadge rating={eff} />
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{ctrl.title}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {myMappings.length > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(14,165,233,0.1)', color: 'var(--brand-500)' }}>
              {myMappings.length} mapped
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted-fg)' }} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--border)' }}>
          {ctrl.description && (
            <p className="text-xs pt-3" style={{ color: 'var(--muted-fg)' }}>{ctrl.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {[
              { label: 'Classification',    value: ctrl.classification },
              { label: 'Frequency',         value: ctrl.execution_frequency },
              { label: 'Approval Status',   value: ctrl.approval_status },
              { label: 'Design Effect.',    value: ctrl.design_effectiveness },
              { label: 'Operating Effect.', value: ctrl.operating_effectiveness },
              { label: 'Last Tested',       value: ctrl.last_tested_at ? ctrl.last_tested_at.slice(0, 10) : undefined },
              { label: 'Next Test',         value: ctrl.next_test_date },
              { label: 'Version',           value: ctrl.version ? `v${ctrl.version}` : undefined },
              { label: 'Live',              value: ctrl.is_live ? 'Yes' : 'No' },
            ].filter(f => f.value).map(f => (
              <div key={f.label}>
                <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>{f.label}</p>
                <p className="text-xs font-medium capitalize" style={{ color: 'var(--foreground)' }}>{f.value}</p>
              </div>
            ))}
          </div>

          {ctrl.objective && (
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>Objective</p>
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{ctrl.objective}</p>
            </div>
          )}

          {ctrl.kci_definition && (
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>KCI Definition</p>
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{ctrl.kci_definition}</p>
            </div>
          )}

          {/* Mappings */}
          {myMappings.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>Mappings</p>
              <div className="flex flex-wrap gap-1.5">
                {myMappings.map(m => (
                  <span key={m.id} className="px-2 py-0.5 rounded text-[10px] font-medium capitalize"
                    style={{
                      background: m.mapping_type === 'dual_purpose' ? 'rgba(14,165,233,0.1)' : m.mapping_type === 'compliance_only' ? 'rgba(168,85,247,0.1)' : 'rgba(234,88,12,0.1)',
                      color: m.mapping_type === 'dual_purpose' ? 'var(--brand-500)' : m.mapping_type === 'compliance_only' ? '#a855f7' : '#ea580c',
                    }}>
                    {m.mapping_type.replace(/_/g, ' ')} · {m.entity_type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export function ControlsClient() {
  const [controls, setControls]   = useState<Control[]>([])
  const [mappings, setMappings]   = useState<ControlMapping[]>([])
  const [search, setSearch]       = useState('')
  const [fwFilter, setFwFilter]   = useState<string>('all')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([db.getControls(), dbExt.getControlMappings()])
      .then(([c, m]) => { setControls(c); setMappings(m); setLoading(false) })
  }, [])

  const frameworks = ['all', ...Array.from(new Set(controls.map(c => c.framework)))]

  const filtered = controls.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.control_id.toLowerCase().includes(search.toLowerCase())
    const matchFw     = fwFilter === 'all' || c.framework === fwFilter
    return matchSearch && matchFw
  })

  const stats = {
    total:     controls.length,
    effective: controls.filter(c => c.effectiveness_rating === 'effective').length,
    partial:   controls.filter(c => c.effectiveness_rating === 'partially_effective').length,
    ineffect:  controls.filter(c => c.effectiveness_rating === 'ineffective').length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Controls',        value: stats.total,     rgb: '14,165,233' },
          { label: 'Effective',             value: stats.effective, rgb: '5,150,105' },
          { label: 'Partially Effective',   value: stats.partial,   rgb: '217,119,6' },
          { label: 'Ineffective',           value: stats.ineffect,  rgb: '225,29,72' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card p-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,rgba(${s.rgb},0.7),transparent)` }} />
            <p className="text-2xl font-bold tracking-tight" style={{ color: `rgb(${s.rgb})` }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-48"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search controls…" className="bg-transparent text-sm outline-none flex-1"
            style={{ color: 'var(--foreground)' }} />
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          {frameworks.map(fw => (
            <button key={fw} onClick={() => setFwFilter(fw)}
              className="px-3 py-1.5 rounded-md text-xs font-medium uppercase transition-all"
              style={fwFilter === fw ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
              {fw}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-fg)' }}>Loading…</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, i) => <ControlCard key={c.id} ctrl={c} mappings={mappings} index={i} />)}
        </div>
      )}
    </div>
  )
}
