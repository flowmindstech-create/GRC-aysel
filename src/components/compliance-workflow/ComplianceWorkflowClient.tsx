'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { db } from '@/lib/db'
import type { GRCIntakeItem, GRCIntakeType, GRCIntakeStep } from '@/types'
import { cn } from '@/lib/utils'
import { IntakeFormDialog } from './IntakeFormDialog'
import {
  Plus, AlertTriangle, CheckCircle2, Clock, Filter,
  FileText, ShieldAlert, Search, Layers, Activity,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_ICON = {
  requirement: FileText,
  risk:        ShieldAlert,
  finding:     Search,
  incident:    AlertTriangle,
}

const TYPE_COLOR: Record<GRCIntakeType, string> = {
  requirement: 'text-blue-400 bg-blue-400/10',
  risk:        'text-orange-400 bg-orange-400/10',
  finding:     'text-yellow-400 bg-yellow-400/10',
  incident:    'text-red-400 bg-red-400/10',
}

const KANBAN_COLUMNS: { key: string; label: string; steps: GRCIntakeStep[]; color: string }[] = [
  {
    key: 'intake',
    label: 'Intake',
    steps: ['registration', 'classification'],
    color: 'rgba(59,130,246,0.3)',
  },
  {
    key: 'mapping',
    label: 'Mapping & Evidence',
    steps: ['control_mapping', 'evidence_collection', 'compliance_assessment'],
    color: 'rgba(168,85,247,0.3)',
  },
  {
    key: 'assessment',
    label: 'Risk Assessment',
    steps: ['inherent_assessment', 'control_effectiveness_review', 'residual_assessment'],
    color: 'rgba(234,179,8,0.3)',
  },
  {
    key: 'review',
    label: 'Review & Decision',
    steps: ['owner_review', 'mgt_review', 'appetite_gate'],
    color: 'rgba(234,88,12,0.3)',
  },
  {
    key: 'treatment',
    label: 'Treatment',
    steps: ['action_plan', 'assignment', 'implementation', 'evidence_upload', 'validation', 'reassessment', 'escalation', 'committee_review', 'non_compliance', 'risk_routing', 'monitoring'],
    color: 'rgba(14,165,233,0.3)',
  },
  {
    key: 'closed',
    label: 'Closed',
    steps: ['compliant_closed', 'closed'],
    color: 'rgba(5,150,105,0.3)',
  },
]

const STEP_LABEL: Partial<Record<GRCIntakeStep, string>> = {
  registration:               'Registration',
  classification:             'Classification',
  control_mapping:            'Control Mapping',
  evidence_collection:        'Evidence Collection',
  compliance_assessment:      'Compliance Assessment',
  inherent_assessment:        'Inherent Assessment',
  control_effectiveness_review: 'Control Effectiveness',
  residual_assessment:        'Residual Assessment',
  owner_review:               'Owner Review',
  mgt_review:                 'Mgmt Review',
  appetite_gate:              'Appetite Gate',
  action_plan:                'Action Plan',
  assignment:                 'Assignment',
  implementation:             'Implementation',
  evidence_upload:            'Evidence Upload',
  validation:                 'Validation',
  reassessment:               'Reassessment',
  escalation:                 'Escalation',
  committee_review:           'Committee Review',
  monitoring:                 'Monitoring',
  compliant_closed:           'Compliant',
  non_compliance:             'Non-Compliant',
  risk_routing:               'Risk Routing',
  closed:                     'Closed',
}

// ── Components ───────────────────────────────────────────────────────────────

function ItemCard({ item, onClick }: { item: GRCIntakeItem; onClick: () => void }) {
  const Icon = TYPE_ICON[item.type]
  const elapsed = formatDistanceToNow(new Date(item.created_at), { addSuffix: false })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="card p-3.5 cursor-pointer group hover:shadow-md transition-all"
      style={{ borderColor: 'var(--card-border)' }}
    >
      <div className="flex items-start gap-2 mb-2.5">
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5', TYPE_COLOR[item.type])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs font-medium leading-snug group-hover:text-sky-400 transition-colors line-clamp-2"
          style={{ color: 'var(--foreground)' }}>
          {item.title}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ background: 'rgba(14,165,233,0.1)', color: 'var(--brand-500)' }}
        >
          {STEP_LABEL[item.step] ?? item.step}
        </span>
        <div className="flex items-center gap-1.5">
          {item.gap_identified && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-400">
              <AlertTriangle className="w-3 h-3" /> Gap
            </span>
          )}
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--muted-fg)' }}>
            <Clock className="w-2.5 h-2.5" />{elapsed}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function ComplianceWorkflowClient() {
  const router = useRouter()
  const [items, setItems]         = useState<GRCIntakeItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [typeFilter, setTypeFilter] = useState<GRCIntakeType | 'all'>('all')
  const [search, setSearch]       = useState('')

  useEffect(() => {
    db.getGRCIntakeItems().then(data => { setItems(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => items.filter(i => {
    const matchType   = typeFilter === 'all' || i.type === typeFilter
    const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  }), [items, typeFilter, search])

  const stats = useMemo(() => ({
    total:   items.length,
    active:  items.filter(i => !['compliant_closed','closed'].includes(i.step)).length,
    gap:     items.filter(i => i.gap_identified).length,
    closed:  items.filter(i => ['compliant_closed','closed'].includes(i.step)).length,
  }), [items])

  async function handleCreate(data: Omit<GRCIntakeItem, 'id' | 'created_at'>) {
    const newItem: GRCIntakeItem = {
      ...data,
      id:         crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    const saved = await db.saveGRCIntakeItem(newItem)
    setItems(prev => [saved, ...prev])
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Items',    value: stats.total,  icon: Layers,        color: '14,165,233' },
          { label: 'Active',         value: stats.active, icon: Activity,      color: '234,88,12'  },
          { label: 'Gap Identified', value: stats.gap,    icon: AlertTriangle, color: '225,29,72'  },
          { label: 'Closed',         value: stats.closed, icon: CheckCircle2,  color: '5,150,105'  },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4 overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, rgba(${s.color},0.7), transparent)` }}
            />
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `rgba(${s.color},0.12)`, boxShadow: `0 0 12px rgba(${s.color},0.15)` }}
              >
                <s.icon className="w-4 h-4" style={{ color: `rgb(${s.color})` }} />
              </div>
            </div>
            <p className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-48"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted-fg)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="bg-transparent text-sm outline-none flex-1"
            style={{ color: 'var(--foreground)' }}
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          {(['all', 'requirement', 'risk', 'finding', 'incident'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all')}
              style={typeFilter === t ? {
                background: 'var(--brand-500)',
                color: '#fff',
              } : { color: 'var(--muted-fg)' }}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ background: 'var(--brand-500)' }}
        >
          <Plus className="w-4 h-4" /> New Item
        </button>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex items-center justify-center h-48" style={{ color: 'var(--muted-fg)' }}>
          Loading…
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(col => {
            const colItems = filtered.filter(i => (col.steps as string[]).includes(i.step))
            return (
              <div key={col.key} className="flex-shrink-0 w-64">
                {/* Column header */}
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-t-xl mb-2 border-b"
                  style={{ borderColor: col.color, borderBottomWidth: 2 }}
                >
                  <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{col.label}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: col.color.replace('0.3', '0.15'), color: 'var(--foreground)' }}
                  >
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-16">
                  {colItems.length === 0 ? (
                    <div
                      className="text-center py-6 rounded-xl border border-dashed text-xs"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}
                    >
                      Empty
                    </div>
                  ) : (
                    colItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onClick={() => router.push(`/compliance-workflow/${item.id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <IntakeFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
