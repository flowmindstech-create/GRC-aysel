'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { db } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import { buildMapping } from '@/lib/control-mapping'
import type { Control, Risk, ControlMapping, MappingType } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, X, GitBranch, Shield, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

const MAPPING_TYPE_CONFIG: Record<MappingType, { label: string; short: string; color: string; bg: string }> = {
  dual_purpose:         { label: 'Dual Purpose',      short: 'D', color: 'var(--brand-500)',  bg: 'rgba(14,165,233,0.15)' },
  compliance_only:      { label: 'Compliance Only',   short: 'C', color: '#a855f7',           bg: 'rgba(168,85,247,0.15)' },
  risk_mitigation_only: { label: 'Risk Mitigation',   short: 'R', color: '#ea580c',           bg: 'rgba(234,88,12,0.15)'  },
}

function MappingCell({
  controlId, entityId, entityType, mapping, onAdd, onRemove,
}: {
  controlId: string
  entityId: string
  entityType: 'risk' | 'requirement'
  mapping?: ControlMapping
  onAdd: (controlId: string, entityId: string, type: MappingType) => void
  onRemove: (mappingId: string) => void
}) {
  const [hover, setHover] = useState(false)
  const [picker, setPicker] = useState(false)

  if (mapping) {
    const cfg = MAPPING_TYPE_CONFIG[mapping.mapping_type]
    return (
      <td className="p-1">
        <div
          className="relative w-8 h-8 rounded-lg flex items-center justify-center mx-auto cursor-pointer transition-all group"
          style={{ background: cfg.bg, border: `1px solid ${cfg.color}40` }}
          title={cfg.label}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => onRemove(mapping.id)}
        >
          <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{cfg.short}</span>
          {hover && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/20">
              <X className="w-3 h-3 text-red-400" />
            </div>
          )}
        </div>
      </td>
    )
  }

  return (
    <td className="p-1">
      <div className="relative">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all hover:bg-white/5"
          style={{ border: '1px dashed var(--border)' }}
          onClick={() => setPicker(true)}
        >
          <Plus className="w-3 h-3" style={{ color: 'var(--muted-fg)', opacity: 0.4 }} />
        </button>
        {picker && (
          <div
            className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 rounded-xl border shadow-xl py-1 min-w-40"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            {Object.entries(MAPPING_TYPE_CONFIG).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => { onAdd(controlId, entityId, type as MappingType); setPicker(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors"
              >
                <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.short}</span>
                <span style={{ color: 'var(--foreground)' }}>{cfg.label}</span>
              </button>
            ))}
            <button onClick={() => setPicker(false)} className="w-full text-xs px-3 py-1.5 hover:bg-white/5" style={{ color: 'var(--muted-fg)' }}>Cancel</button>
          </div>
        )}
      </div>
    </td>
  )
}

export function MappingMatrixClient() {
  const [controls, setControls]   = useState<Control[]>([])
  const [risks, setRisks]         = useState<Risk[]>([])
  const [mappings, setMappings]   = useState<ControlMapping[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<'risk' | 'requirement'>('risk')
  const [page, setPage]           = useState(0)
  const PAGE = 8

  useEffect(() => {
    Promise.all([db.getControls(), db.getRisks(), dbExt.getControlMappings()])
      .then(([c, r, m]) => { setControls(c); setRisks(r); setMappings(m); setLoading(false) })
  }, [])

  const entities = view === 'risk' ? risks.slice(page * PAGE, page * PAGE + PAGE) : []
  const totalPages = Math.ceil((view === 'risk' ? risks.length : 0) / PAGE)

  function getMapping(controlId: string, entityId: string) {
    return mappings.find(m => m.control_id === controlId && m.entity_id === entityId)
  }

  async function handleAdd(controlId: string, entityId: string, type: MappingType) {
    const newMap: ControlMapping = {
      ...buildMapping('00000000-0000-0000-0000-000000000001', controlId, view, entityId, type),
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    const saved = await dbExt.saveControlMapping(newMap)
    setMappings(prev => [...prev, saved])
    toast.success('Mapping added')
  }

  async function handleRemove(mappingId: string) {
    setMappings(prev => prev.filter(m => m.id !== mappingId))
    toast.success('Mapping removed')
  }

  const stats = {
    total:    mappings.length,
    dual:     mappings.filter(m => m.mapping_type === 'dual_purpose').length,
    compliance: mappings.filter(m => m.mapping_type === 'compliance_only').length,
    risk:     mappings.filter(m => m.mapping_type === 'risk_mitigation_only').length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Mappings',    value: stats.total,      rgb: '14,165,233' },
          { label: 'Dual Purpose',      value: stats.dual,       rgb: '14,165,233' },
          { label: 'Compliance Only',   value: stats.compliance, rgb: '168,85,247' },
          { label: 'Risk Mitigation',   value: stats.risk,       rgb: '234,88,12'  },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card p-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,rgba(${s.rgb},0.7),transparent)` }} />
            <p className="text-2xl font-bold" style={{ color: `rgb(${s.rgb})` }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>Legend:</span>
        {Object.entries(MAPPING_TYPE_CONFIG).map(([, cfg]) => (
          <div key={cfg.label} className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.short}</span>
            <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>{cfg.label}</span>
          </div>
        ))}
        <span className="text-xs ml-2" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>Click a cell to add · Click a badge to remove</span>
      </div>

      {/* Matrix */}
      {loading ? (
        <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-fg)' }}>Loading…</div>
      ) : (
        <div className="card overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {/* Controls label column */}
                <th className="sticky left-0 z-10 p-3 text-left border-b border-r font-semibold"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', minWidth: 200 }}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" style={{ color: 'var(--brand-500)' }} />
                    Controls \ Risks
                  </div>
                </th>
                {entities.map(e => (
                  <th key={e.id} className="p-2 border-b text-center font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)', minWidth: 40 }}>
                    <div className="writing-vertical text-[10px] truncate max-w-[36px] mx-auto" title={(e as Risk).title}>
                      {(e as Risk).title?.slice(0, 16)}…
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {controls.map((ctrl, ci) => (
                <tr key={ctrl.id} className={ci % 2 === 0 ? '' : ''}>
                  <td className="sticky left-0 z-10 p-3 border-b border-r"
                    style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px]" style={{ color: 'var(--brand-500)' }}>{ctrl.control_id}</span>
                      <span className="truncate max-w-32 text-[11px]" style={{ color: 'var(--foreground)' }}>{ctrl.title}</span>
                    </div>
                  </td>
                  {entities.map(e => (
                    <MappingCell
                      key={e.id}
                      controlId={ctrl.id}
                      entityId={e.id}
                      entityType={view}
                      mapping={getMapping(ctrl.id, e.id)}
                      onAdd={handleAdd}
                      onRemove={handleRemove}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 transition-colors hover:bg-white/5"
            style={{ border: '1px solid var(--border)', color: 'var(--muted-fg)' }}>← Prev</button>
          <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>Page {page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 transition-colors hover:bg-white/5"
            style={{ border: '1px solid var(--border)', color: 'var(--muted-fg)' }}>Next →</button>
        </div>
      )}
    </div>
  )
}
