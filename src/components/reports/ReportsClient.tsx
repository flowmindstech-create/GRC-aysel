'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { REPORT_DEFINITIONS, reportToCsv } from '@/lib/reports'
import type { GeneratedReport, ReportDefinition, ReportSection, Tone } from '@/lib/reports'
import { FileText, Loader2, RefreshCw, Download, Printer, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

const TONE_COLOR: Record<Tone, string> = {
  ok:      '#059669',
  warn:    '#d97706',
  crit:    '#e11d48',
  neutral: 'var(--foreground)',
}
const TONE_BG: Record<Tone, string> = {
  ok:      'rgba(5,150,105,0.08)',
  warn:    'rgba(217,119,6,0.08)',
  crit:    'rgba(225,29,72,0.08)',
  neutral: 'transparent',
}

function Metrics({ metrics }: { metrics: NonNullable<ReportSection['metrics']> }) {
  return (
    <div className="grid gap-px" style={{
      background: 'var(--border)',
      gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`,
      border: '1px solid var(--border)',
    }}>
      {metrics.map(m => (
        <div key={m.label} className="px-4 py-3 flex flex-col gap-1" style={{ background: 'var(--card)' }}>
          <span className="text-2xl font-black tabular-nums leading-none" style={{ color: TONE_COLOR[m.tone ?? 'neutral'] }}>
            {m.value}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{m.label}</span>
          {m.hint && <span className="text-[10px]" style={{ color: 'var(--muted-fg)', opacity: 0.75 }}>{m.hint}</span>}
        </div>
      ))}
    </div>
  )
}

function Section({ section }: { section: ReportSection }) {
  const hasTable = !!section.columns?.length
  const rows = section.rows ?? []
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{section.title}</h3>

      {section.metrics?.length ? <Metrics metrics={section.metrics} /> : null}

      {hasTable && (
        rows.length === 0 ? (
          <p className="text-xs px-4 py-6 text-center" style={{ color: 'var(--muted-fg)', border: '1px solid var(--border)' }}>
            {section.empty ?? 'Məlumat yoxdur'}
          </p>
        ) : (
          <div className="overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full">
              <thead style={{ background: 'var(--muted)' }}>
                <tr>
                  {section.columns!.map(c => (
                    <th key={c} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--muted-fg)' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{
                    borderTop: '1px solid var(--border)',
                    background: TONE_BG[section.rowTones?.[i] ?? 'neutral'],
                  }}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2.5 text-xs align-top"
                        style={{ color: j === 0 ? 'var(--foreground)' : 'var(--muted-fg)', fontWeight: j === 0 ? 600 : 400 }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {section.note && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted-fg)' }}>{section.note}</p>
      )}
    </section>
  )
}

export function ReportsClient() {
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(def: ReportDefinition) {
    setBusy(def.id)
    try {
      setReport(await def.build())
    } catch (err) {
      console.error('Report build failed:', err)
      toast.error('Hesabat qurulmadı')
    } finally {
      setBusy(null)
    }
  }

  function download() {
    if (!report) return
    // BOM olmadan Excel Azərbaycan hərflərini pozuq göstərir
    const blob = new Blob(['\uFEFF' + reportToCsv(report)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.definitionId}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (report) {
    const def = REPORT_DEFINITIONS.find(d => d.id === report.definitionId)
    return (
      <div className="space-y-5 max-w-5xl print-document">
        <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
          <button onClick={() => setReport(null)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-black/[0.04]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> All reports
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => def && run(def)} disabled={!!busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-black/[0.04] disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
            </button>
            <button onClick={download}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-black/[0.04]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'var(--brand-500)' }}>
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        <div className="card p-6 space-y-6 print-document">
          <header className="pb-4" style={{ borderBottom: '2px solid var(--foreground)' }}>
            <h2 className="text-xl font-black" style={{ color: 'var(--foreground)' }}>{report.title}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>{report.subtitle}</p>
            <p className="text-[11px] mt-2 font-mono" style={{ color: 'var(--muted-fg)' }}>
              Hazırlandı: {new Date(report.generatedAt).toLocaleString('az-AZ')}
            </p>
          </header>
          {report.sections.map(s => <Section key={s.title} section={s} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence>
        {REPORT_DEFINITIONS.map((def, i) => (
          <motion.button
            key={def.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            onClick={() => run(def)}
            disabled={!!busy}
            className="card p-5 text-left flex flex-col gap-3 transition-all hover:border-sky-500/50 disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(14,165,233,0.12)' }}>
                {busy === def.id
                  ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--brand-500)' }} />
                  : <FileText className="w-4 h-4" style={{ color: 'var(--brand-500)' }} />}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{def.name}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>{def.description}</p>
            </div>
            <div className="flex flex-wrap gap-1 mt-auto pt-1">
              {def.sources.map(s => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>{s}</span>
              ))}
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
