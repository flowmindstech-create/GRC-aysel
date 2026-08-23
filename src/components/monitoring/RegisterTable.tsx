'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

// RAS reyestrindəki cədvəl formatı, ümumiləşdirilmiş halda: tək sütunlar və
// qruplaşdırılmış sütunlar (məsələn hədlər) iki sıralı başlıqla verilir.
// KPI/KRI/KCI pəncərələri bunu paylaşır — RAS-a xas "Appetite" və
// "Appetite Statement" sütunları burada yoxdur.

export interface RegisterColumn<T> {
  key: string
  label: string
  value: (row: T) => ReactNode
  /** Uzun mətn sütunları üçün genişlik məhdudiyyəti */
  wide?: boolean
  align?: 'left' | 'right'
}

export interface RegisterGroup<T> {
  label: string
  columns: RegisterColumn<T>[]
}

interface Props<T> {
  rows: T[]
  rowKey: (row: T) => string
  /** Qrupdan əvvəl gələn sütunlar */
  lead: RegisterColumn<T>[]
  /** Başlığı iki sıraya bölən qruplar (hədlər, rüblər və s.) */
  groups?: RegisterGroup<T>[]
  /** Qruplardan sonra gələn sütunlar */
  trail?: RegisterColumn<T>[]
  empty?: string
}

const TH = 'text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap'

export function RegisterTable<T>({ rows, rowKey, lead, groups = [], trail = [], empty = 'No records' }: Props<T>) {
  const leafCount = lead.length + groups.reduce((n, g) => n + g.columns.length, 0) + trail.length
  const hasGroups = groups.length > 0

  const cell = (col: RegisterColumn<T>, row: T) => (
    <td key={col.key} className={`px-3 py-3.5 ${col.wide ? 'max-w-[260px]' : ''} ${col.align === 'right' ? 'text-right' : ''}`}>
      {col.value(row)}
    </td>
  )

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ background: 'var(--muted)' }}>
            <tr style={{ borderBottom: hasGroups ? 'none' : '1px solid var(--border)' }}>
              {lead.map(c => (
                <th key={c.key} rowSpan={hasGroups ? 2 : 1} className={TH} style={{ color: 'var(--muted-fg)' }}>{c.label}</th>
              ))}
              {groups.map(g => (
                <th key={g.label} colSpan={g.columns.length} className={`${TH} text-center`} style={{ color: 'var(--muted-fg)' }}>{g.label}</th>
              ))}
              {trail.map(c => (
                <th key={c.key} rowSpan={hasGroups ? 2 : 1} className={TH} style={{ color: 'var(--muted-fg)' }}>{c.label}</th>
              ))}
            </tr>
            {hasGroups && (
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {groups.flatMap(g => g.columns.map(c => (
                  <th key={`${g.label}-${c.key}`} className={TH} style={{ color: 'var(--muted-fg)' }}>{c.label}</th>
                )))}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={leafCount} className="py-14 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>{empty}</td></tr>
            ) : rows.map((row, i) => (
              <motion.tr key={rowKey(row)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] align-top"
                style={{ borderBottom: '1px solid var(--border)' }}>
                {lead.map(c => cell(c, row))}
                {groups.flatMap(g => g.columns.map(c => cell(c, row)))}
                {trail.map(c => cell(c, row))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Sətir daxilində təkrarlanan kiçik göstəricilər ──────────────────────────

export function Mono({ children, color }: { children: ReactNode; color?: string }) {
  return <span className="text-xs font-mono tabular-nums whitespace-nowrap" style={{ color: color ?? 'var(--foreground)' }}>{children}</span>
}

export function Muted({ children, clamp }: { children: ReactNode; clamp?: number }) {
  // Sətir məhdudiyyəti inline style ilə verilir: `line-clamp-${clamp}` kimi
  // dinamik sinif adını Tailwind generasiya etmir və heç bir təsir göstərmirdi.
  const clampStyle = clamp
    ? { display: '-webkit-box', WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: clamp, overflow: 'hidden' }
    : undefined
  return <span className="text-[11px]" style={{ color: 'var(--muted-fg)', ...clampStyle }}>{children}</span>
}

export function Name({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-[160px]">
      <span className="text-sm font-medium block" style={{ color: 'var(--foreground)' }}>{title}</span>
      {sub ? <span className="text-[10px] font-mono" style={{ color: 'var(--brand-500)' }}>{sub}</span> : null}
    </div>
  )
}

export function StatusPill({ label, rgb }: { label: string; rgb: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: `rgba(${rgb},0.15)`, color: `rgb(${rgb})` }}>{label}</span>
  )
}
