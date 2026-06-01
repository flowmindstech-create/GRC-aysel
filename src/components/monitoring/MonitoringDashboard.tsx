'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { dbExt } from '@/lib/db-extensions'
import type { KRIItem, KCIItem, KPIItem, MonitoringAlert, MonitoringStatus, Trend } from '@/types'
import { cn } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, Minus, Bell, BellOff,
  AlertTriangle, CheckCircle2, Activity, BarChart3,
  Shield, Gauge, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<MonitoringStatus, { bg: string; border: string; text: string; dot: string }> = {
  green: { bg: 'rgba(5,150,105,0.08)',  border: 'rgba(5,150,105,0.3)',  text: '#059669', dot: '#059669' },
  amber: { bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)',  text: '#d97706', dot: '#d97706' },
  red:   { bg: 'rgba(225,29,72,0.08)',  border: 'rgba(225,29,72,0.3)',  text: '#e11d48', dot: '#e11d48' },
}

const KCI_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  effective:            { bg: 'rgba(5,150,105,0.1)',  text: '#059669' },
  partially_effective:  { bg: 'rgba(217,119,6,0.1)',  text: '#d97706' },
  ineffective:          { bg: 'rgba(225,29,72,0.1)',  text: '#e11d48' },
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up')   return <TrendingUp   className="w-3.5 h-3.5 text-red-400" />
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-green-400" />
  return <Minus className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} />
}

function StatusDot({ status }: { status: MonitoringStatus }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: STATUS_STYLES[status].dot, boxShadow: `0 0 6px ${STATUS_STYLES[status].dot}` }}
    />
  )
}

// ── KRI Card ─────────────────────────────────────────────────────────────────

function KRICard({ item, index }: { item: KRIItem; index: number }) {
  const s = STATUS_STYLES[item.current_status]
  const delta = item.current_value != null && item.previous_value != null
    ? ((item.current_value - item.previous_value) / (item.previous_value || 1) * 100).toFixed(1)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card p-4 overflow-hidden"
      style={{ borderColor: s.border }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${s.dot},transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <StatusDot status={item.current_status} />
            <span className="text-[10px] font-mono" style={{ color: 'var(--muted-fg)' }}>{item.kri_id}</span>
            {item.appetite_breach && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(225,29,72,0.15)', color: '#e11d48' }}>
                BREACH
              </span>
            )}
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{item.name}</p>
        </div>
        <TrendIcon trend={item.trend} />
      </div>

      {/* Value */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-2xl font-bold tracking-tight" style={{ color: s.text }}>
            {item.current_value ?? '—'}
          </p>
          {delta && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>
              {Number(delta) > 0 ? '+' : ''}{delta}% vs prev
            </p>
          )}
        </div>
        <div className="text-right text-[10px]" style={{ color: 'var(--muted-fg)' }}>
          <p>Prev: {item.previous_value ?? '—'}</p>
          <p className="mt-0.5 capitalize">{item.frequency}</p>
        </div>
      </div>

      {/* Thresholds */}
      <div className="flex items-center gap-2 text-[10px]">
        {[
          { label: item.threshold_green, color: '#059669' },
          { label: item.threshold_amber, color: '#d97706' },
          { label: item.threshold_red,   color: '#e11d48' },
        ].map((t, i) => t.label ? (
          <span key={i} className="px-1.5 py-0.5 rounded font-medium"
            style={{ background: `${t.color}18`, color: t.color }}>
            {t.label}
          </span>
        ) : null)}
      </div>
    </motion.div>
  )
}

// ── KCI Card ─────────────────────────────────────────────────────────────────

function KCICard({ item, index }: { item: KCIItem; index: number }) {
  const s = KCI_STATUS_STYLES[item.current_status]
  const rating = item.effectiveness_rating ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{item.name}</p>
          <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--muted-fg)' }}>
            {item.control_type} · {item.test_method} · {item.frequency}
          </p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ml-2"
          style={{ background: s.bg, color: s.text }}>
          {item.current_status.replace('_', ' ')}
        </span>
      </div>

      {/* Effectiveness rating gauge */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Effectiveness</span>
          <span className="text-xs font-bold" style={{ color: s.text }}>{rating}/5</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="flex-1 h-1.5 rounded-full"
              style={{ background: n <= rating ? s.text : 'var(--border)' }} />
          ))}
        </div>
      </div>

      {/* Success/Failure rates */}
      {item.success_rate != null && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="py-1.5 rounded-lg" style={{ background: 'rgba(5,150,105,0.08)' }}>
            <p className="text-sm font-bold text-green-500">{item.success_rate}%</p>
            <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Success</p>
          </div>
          <div className="py-1.5 rounded-lg" style={{ background: 'rgba(225,29,72,0.08)' }}>
            <p className="text-sm font-bold text-red-400">{item.failure_rate}%</p>
            <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>Failure</p>
          </div>
        </div>
      )}

      {item.next_test_date && (
        <p className="text-[10px] mt-2" style={{ color: 'var(--muted-fg)' }}>
          Next test: {item.next_test_date}
        </p>
      )}
    </motion.div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ item, index }: { item: KPIItem; index: number }) {
  const s   = STATUS_STYLES[item.performance_status]
  const pct = item.target_value && item.current_value != null
    ? Math.min(100, Math.round((item.current_value / item.target_value) * 100))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card p-4 overflow-hidden"
      style={{ borderColor: s.border }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${s.dot},transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{item.name}</p>
          {item.related_process && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>{item.related_process}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon trend={item.trend} />
          <StatusDot status={item.performance_status} />
        </div>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <div>
          <p className="text-2xl font-bold tracking-tight" style={{ color: s.text }}>
            {item.current_value ?? '—'}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
            Target: {item.target_value ?? '—'}
          </p>
        </div>
        {pct != null && (
          <div className="flex-1">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--muted-fg)' }}>
              <span>Progress</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: s.dot }} />
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
        {item.frequency} · Prev: {item.previous_value ?? '—'}
        {item.sla_target && ` · SLA: ${item.sla_target}`}
      </p>
    </motion.div>
  )
}

// ── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({ alert, onAck }: { alert: MonitoringAlert; onAck: (id: string) => void }) {
  return (
    <div
      className={cn('flex items-start gap-3 p-3 rounded-xl border transition-all', alert.acknowledged ? 'opacity-40' : '')}
      style={{
        background: alert.alert_level === 'red' ? 'rgba(225,29,72,0.06)' : 'rgba(217,119,6,0.06)',
        borderColor: alert.alert_level === 'red' ? 'rgba(225,29,72,0.25)' : 'rgba(217,119,6,0.25)',
      }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: alert.alert_level === 'red' ? '#e11d48' : '#d97706' }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{alert.message}</p>
        <p className="text-[10px] mt-0.5 uppercase font-semibold" style={{ color: 'var(--muted-fg)' }}>
          {alert.source_type} · {alert.source_name}
        </p>
      </div>
      {!alert.acknowledged && (
        <button
          onClick={() => onAck(alert.id)}
          className="shrink-0 text-[10px] px-2 py-1 rounded font-medium transition-colors hover:bg-white/5"
          style={{ color: 'var(--muted-fg)', border: '1px solid var(--border)' }}
        >
          Ack
        </button>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count, rgb }: { icon: React.ElementType; title: string; count: number; rgb: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `rgba(${rgb},0.12)` }}>
        <Icon className="w-4 h-4" style={{ color: `rgb(${rgb})` }} />
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h2>
        <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{count} items</p>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function MonitoringDashboard() {
  const [kris, setKRIs]     = useState<KRIItem[]>([])
  const [kcis, setKCIs]     = useState<KCIItem[]>([])
  const [kpis, setKPIs]     = useState<KPIItem[]>([])
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'kri' | 'kci' | 'kpi'>('kri')

  async function load() {
    const [k, c, p, a] = await Promise.all([
      dbExt.getKRIItems(),
      dbExt.getKCIItems(),
      dbExt.getKPIItems(),
      dbExt.getMonitoringAlerts(),
    ])
    setKRIs(k); setKCIs(c); setKPIs(p); setAlerts(a)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAck(id: string) {
    await dbExt.acknowledgeAlert(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
    toast.success('Alert acknowledged')
  }

  const summary = useMemo(() => ({
    red:   kris.filter(k => k.current_status === 'red').length   + kpis.filter(p => p.performance_status === 'red').length,
    amber: kris.filter(k => k.current_status === 'amber').length + kpis.filter(p => p.performance_status === 'amber').length,
    breach: kris.filter(k => k.appetite_breach).length,
    openAlerts: alerts.filter(a => !a.acknowledged).length,
  }), [kris, kpis, alerts])

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Red Indicators', value: summary.red,        rgb: '225,29,72',  icon: AlertTriangle },
          { label: 'Amber Warnings', value: summary.amber,      rgb: '217,119,6',  icon: Activity },
          { label: 'Appetite Breach', value: summary.breach,    rgb: '225,29,72',  icon: Shield },
          { label: 'Open Alerts',    value: summary.openAlerts, rgb: '14,165,233', icon: Bell },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-4 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,rgba(${s.rgb},0.7),transparent)` }} />
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `rgba(${s.rgb},0.12)` }}>
              <s.icon className="w-4 h-4" style={{ color: `rgb(${s.rgb})` }} />
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: s.value > 0 ? `rgb(${s.rgb})` : 'var(--foreground)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — tabs KRI/KCI/KPI */}
        <div className="xl:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
            {([
              { key: 'kri', label: 'KRI', icon: Shield },
              { key: 'kci', label: 'KCI', icon: Gauge },
              { key: 'kpi', label: 'KPI', icon: BarChart3 },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={tab === t.key ? { background: 'var(--brand-500)', color: '#fff' } : { color: 'var(--muted-fg)' }}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-fg)' }}>Loading…</div>
          ) : (
            <>
              {tab === 'kri' && (
                <>
                  <SectionHeader icon={Shield} title="Key Risk Indicators" count={kris.length} rgb="225,29,72" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kris.length === 0
                      ? <p className="text-sm col-span-2 text-center py-8" style={{ color: 'var(--muted-fg)' }}>No KRI items. Run the Phase 3 SQL to seed data.</p>
                      : kris.map((k, i) => <KRICard key={k.id} item={k} index={i} />)}
                  </div>
                </>
              )}
              {tab === 'kci' && (
                <>
                  <SectionHeader icon={Gauge} title="Key Control Indicators" count={kcis.length} rgb="14,165,233" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kcis.length === 0
                      ? <p className="text-sm col-span-2 text-center py-8" style={{ color: 'var(--muted-fg)' }}>No KCI items. Run the Phase 3 SQL to seed data.</p>
                      : kcis.map((k, i) => <KCICard key={k.id} item={k} index={i} />)}
                  </div>
                </>
              )}
              {tab === 'kpi' && (
                <>
                  <SectionHeader icon={BarChart3} title="Key Performance Indicators" count={kpis.length} rgb="59,130,246" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kpis.length === 0
                      ? <p className="text-sm col-span-2 text-center py-8" style={{ color: 'var(--muted-fg)' }}>No KPI items. Run the Phase 3 SQL to seed data.</p>
                      : kpis.map((k, i) => <KPICard key={k.id} item={k} index={i} />)}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Right — Alerts panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Alerts</h2>
              {summary.openAlerts > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(225,29,72,0.15)', color: '#e11d48' }}>
                  {summary.openAlerts}
                </span>
              )}
            </div>
            <button onClick={load}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'var(--muted-fg)' }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <BellOff className="w-8 h-8" style={{ color: 'var(--muted-fg)', opacity: 0.4 }} />
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>No alerts</p>
              </div>
            ) : (
              alerts.map(a => <AlertRow key={a.id} alert={a} onAck={handleAck} />)
            )}
          </div>

          {/* Flow reminder */}
          <div className="card p-4 mt-2">
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--muted-fg)', opacity: 0.5 }}>
              Monitoring Flow
            </p>
            {[
              'KRI Setup', 'Data Feed', 'Threshold Evaluation',
              'Alert Engine', 'Risk Update', 'Action Plan', 'Monitoring Loop',
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--brand-500)' }} />
                <span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{step}</span>
                {i < arr.length - 1 && (
                  <div className="w-px h-3 ml-0.5 shrink-0" style={{ background: 'var(--border)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
