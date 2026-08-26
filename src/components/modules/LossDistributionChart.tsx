'use client'

import { useState } from 'react'
import type { HistogramBucket } from '@/lib/monte-carlo'

// İllik zərərin paylanması — tək seriyalı histoqram.
// Sütunlar bir ölçünü (tezlik) göstərdiyi üçün tək rəng işlədilir; VaR xətləri
// seriya deyil, hədddir və status rəngi daşıyır (sarı = xəbərdarlıq zonası,
// qırmızı = quyruq). Rənglər hər iki temada eyni oxunur.
const BAR = 'var(--brand-500)'
const VAR95 = '#d97706'
const VAR99 = '#e11d48'

const W = 720
const H = 240
const PAD = { top: 16, right: 16, bottom: 34, left: 44 }

interface Props {
  buckets: HistogramBucket[]
  var95: number
  var99: number
  currency: string
  /** Sıfır zərərli illərin payı — histoqramdan kənardadır, altda izah olunur */
  zeroLossProbability: number
}

const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : Math.abs(n) >= 1_000 ? `${Math.round(n / 1_000)}K`
  : String(Math.round(n))

const full = (n: number) => new Intl.NumberFormat('az-AZ', { maximumFractionDigits: 0 }).format(n)

export function LossDistributionChart({ buckets, var95, var99, currency, zeroLossProbability }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  if (buckets.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--muted-fg)' }}>
        Simulyasiyada zərərli il baş vermədi — paylanma qrafiki yoxdur.
      </div>
    )
  }

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const maxCount = Math.max(...buckets.map(b => b.count), 1)
  const xMax = buckets[buckets.length - 1].to || 1
  const totalCount = buckets.reduce((a, b) => a + b.count, 0)

  const barW = plotW / buckets.length
  const xOf = (value: number) => PAD.left + Math.min(plotW, (value / xMax) * plotW)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxCount * f))

  const marker = (value: number, color: string, label: string) => {
    if (value <= 0 || value > xMax) return null   // kadrdan kənarda qalırsa çəkmirik
    const x = xOf(value)
    return (
      <g key={label}>
        <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + plotH} stroke={color} strokeWidth={2} strokeDasharray="4 3" />
        <text x={x + 4} y={PAD.top + 11} fontSize={10} fontWeight={700} fill={color}>{label}</text>
        <text x={x + 4} y={PAD.top + 23} fontSize={9} fill={color} opacity={0.85}>{compact(value)}</text>
      </g>
    )
  }

  const hovered = hover === null ? null : buckets[hover]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img"
        aria-label="İllik zərərin paylanması">
        {/* Şəbəkə — geridə qalan, oxumağa mane olmayan */}
        {yTicks.map((t, i) => {
          const y = PAD.top + plotH - (t / maxCount) * plotH
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 3} fontSize={9} textAnchor="end" fill="var(--muted-fg)">{t}</text>
            </g>
          )
        })}

        {/* Sütunlar — 2px ara, yuxarısı yumru */}
        {buckets.map((b, i) => {
          const h = (b.count / maxCount) * plotH
          const x = PAD.left + i * barW
          const y = PAD.top + plotH - h
          return (
            <rect key={i} x={x + 1} y={y} width={Math.max(1, barW - 2)} height={Math.max(h, b.count ? 1 : 0)}
              rx={Math.min(4, barW / 3)} fill={BAR}
              opacity={hover === null || hover === i ? 1 : 0.45} />
          )
        })}

        {marker(var95, VAR95, 'VaR 95%')}
        {marker(var99, VAR99, 'VaR 99%')}

        {/* X oxu etiketləri */}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH}
          stroke="var(--border)" strokeWidth={1} />
        {[0, 0.5, 1].map(f => (
          <text key={f} x={PAD.left + f * plotW} y={H - 16} fontSize={10}
            textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} fill="var(--muted-fg)">
            {compact(xMax * f)}
          </text>
        ))}
        <text x={PAD.left} y={H - 3} fontSize={9} fill="var(--muted-fg)" opacity={0.8}>
          İllik zərər ({currency}) · şaquli ox: simulyasiya sayı
        </text>

        {/* Hover sahələri — sütundan geniş toxunma zonası */}
        {buckets.map((_, i) => (
          <rect key={`h${i}`} x={PAD.left + i * barW} y={PAD.top} width={barW} height={plotH}
            fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>

      {hovered && (
        <div className="absolute top-2 right-2 px-3 py-2 rounded-lg text-xs pointer-events-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
          <p className="font-mono font-bold" style={{ color: 'var(--foreground)' }}>
            {full(hovered.from)} – {full(hovered.to)} {currency}
          </p>
          <p style={{ color: 'var(--muted-fg)' }}>
            {full(hovered.count)} simulyasiya · {((hovered.count / totalCount) * 100).toFixed(1)}%
          </p>
        </div>
      )}

      <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
        Qrafik yalnız <strong>zərərli illəri</strong> göstərir. Simulyasiyada illərin{' '}
        <strong style={{ color: 'var(--foreground)' }}>{zeroLossProbability}%</strong>-ində heç bir hadisə
        baş vermir və zərər sıfır olur — həmin illər histoqrama daxil edilməyib ki, birinci sütun
        paylanmanı əzməsin.
      </p>
    </div>
  )
}
