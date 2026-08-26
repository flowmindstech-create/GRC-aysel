'use client'

import { useState, useEffect } from 'react'
import { db, getCurrentProfile } from '@/lib/db'
import { dbExt } from '@/lib/db-extensions'
import type { FinancialRisk, MonteCarloRun } from '@/types'
import {
  runMonteCarlo, deterministicRisk, DEFAULT_ITERATIONS, DEFAULT_VOLATILITY,
} from '@/lib/monte-carlo'
import type { MonteCarloResult } from '@/lib/monte-carlo'
import { LossDistributionChart } from './LossDistributionChart'
import { Play, Save, Trash2, Loader2, RotateCw, Dice5 } from 'lucide-react'
import { toast } from 'sonner'

const money = (n: number, currency = 'AZN') =>
  `${new Intl.NumberFormat('az-AZ', { maximumFractionDigits: 0 }).format(n)} ${currency}`

const DEFAULT_ORG = '00000000-0000-0000-0000-000000000001'

interface Draft {
  riskId: string          // '' = sərbəst hesablama
  label: string
  assetValue: number
  exposureFactor: number
  aro: number
  volatility: number
  iterations: number
  seed: number
  currency: string
}

const newSeed = () => Math.floor(Math.random() * 2_000_000_000)

const EMPTY: Draft = {
  riskId: '', label: '', assetValue: 500_000, exposureFactor: 0.4, aro: 0.5,
  volatility: DEFAULT_VOLATILITY, iterations: DEFAULT_ITERATIONS, seed: newSeed(), currency: 'AZN',
}

export function StochasticModelsClient() {
  const [risks, setRisks] = useState<FinancialRisk[]>([])
  const [runs, setRuns] = useState<MonteCarloRun[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [result, setResult] = useState<MonteCarloResult | null>(null)
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [me, setMe] = useState('')

  useEffect(() => {
    db.getFinancialRisks().then(setRisks).catch(() => toast.error('Maliyyə riskləri yüklənmədi'))
    dbExt.getMonteCarloRuns().then(setRuns).catch(() => {})
    getCurrentProfile().then(p => setMe(p?.full_name ?? ''))
  }, [])

  // Reyestrdən risk seçiləndə onun öz göstəriciləri gətirilir; boş olanlar
  // cari qiymətini saxlayır ki, istifadəçi sıfırdan doldurmasın.
  function pickRisk(id: string) {
    const r = risks.find(x => x.id === id)
    setResult(null)
    if (!r) { setDraft(d => ({ ...d, riskId: '', label: '' })); return }
    setDraft(d => ({
      ...d,
      riskId: id,
      label: `${r.code} — ${r.title}`,
      assetValue: r.asset_value ?? r.exposure_amount ?? d.assetValue,
      exposureFactor: r.exposure_factor ?? d.exposureFactor,
      aro: r.aro ?? d.aro,
      currency: r.currency ?? d.currency,
    }))
  }

  const invalid =
    draft.assetValue <= 0 ||
    draft.exposureFactor < 0 || draft.exposureFactor > 1 ||
    draft.aro < 0 || draft.iterations < 1

  async function run() {
    if (invalid) { toast.error('Giriş dəyərləri düzgün deyil'); return }
    setRunning(true)
    // Böyük iterasiyada hesablama əsas ipi tutur — spinner görünsün deyə
    // növbəti kadra buraxırıq.
    await new Promise(r => setTimeout(r, 0))
    try {
      setResult(runMonteCarlo({
        assetValue: draft.assetValue,
        exposureFactor: draft.exposureFactor,
        aro: draft.aro,
        volatility: draft.volatility,
        iterations: draft.iterations,
        seed: draft.seed,
      }))
    } catch (err) {
      console.error('Monte Carlo failed:', err)
      toast.error('Simulyasiya alınmadı')
    } finally {
      setRunning(false)
    }
  }

  async function save() {
    if (!result) return
    setSaving(true)
    try {
      const saved = await dbExt.saveMonteCarloRun({
        id: crypto.randomUUID(),
        org_id: DEFAULT_ORG,
        financial_risk_id: draft.riskId || undefined,
        label: draft.label.trim() || 'Sərbəst hesablama',
        asset_value: draft.assetValue,
        exposure_factor: draft.exposureFactor,
        aro: draft.aro,
        volatility: result.volatility,
        iterations: result.iterations,
        seed: result.seed,
        sle: result.sle,
        ale: result.ale,
        simulated_mean_ale: result.simulatedMeanAle,
        median_loss: result.median,
        var_95: result.var95,
        var_99: result.var99,
        tvar_95: result.tvar95,
        max_simulated_loss: result.maxSimulatedLoss,
        zero_loss_probability: result.zeroLossProbability,
        distribution_buckets: result.buckets,
        currency: draft.currency,
        executed_by: me,
        executed_at: new Date().toISOString(),
      })
      setRuns(prev => [saved, ...prev])
      toast.success('Simulyasiya yadda saxlanıldı')
    } catch {
      toast.error('Yadda saxlanmadı — phase65 SQL işlədilibmi?')
    } finally {
      setSaving(false)
    }
  }

  // Saxlanılmış qeydi eyni toxumla yenidən işə salır — nəticə eyni olmalıdır
  function replay(r: MonteCarloRun) {
    setDraft({
      riskId: r.financial_risk_id ?? '', label: r.label,
      assetValue: Number(r.asset_value), exposureFactor: Number(r.exposure_factor),
      aro: Number(r.aro), volatility: Number(r.volatility),
      iterations: r.iterations, seed: Number(r.seed), currency: r.currency ?? 'AZN',
    })
    setResult(runMonteCarlo({
      assetValue: Number(r.asset_value), exposureFactor: Number(r.exposure_factor),
      aro: Number(r.aro), volatility: Number(r.volatility),
      iterations: r.iterations, seed: Number(r.seed),
    }))
    toast.success(`${r.label} — eyni toxumla yenidən hesablandı`)
  }

  async function remove(id: string) {
    await dbExt.deleteMonteCarloRun(id)
    setRuns(prev => prev.filter(r => r.id !== id))
  }

  const preview = deterministicRisk(draft)
  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const inputStyle = { background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  const labelCls = 'block text-[11px] font-semibold mb-1'

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
      <label className={labelCls} style={{ color: 'var(--foreground)' }}>{label}</label>
      {children}
      {hint && <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-fg)' }}>{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* ── Giriş ───────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Monte Carlo</h3>
            <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>
              Mürəkkəb Poisson modeli: hadisə sayı Poisson, hər hadisənin zərəri lognormal paylanır
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
            SLE {money(preview.sle, draft.currency)} · ALE {money(preview.ale, draft.currency)}
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <Field label="Maliyyə riski" hint="Boş buraxsan sərbəst hesablama olur, reyestrə bağlanmır">
              <select value={draft.riskId} onChange={e => pickRisk(e.target.value)}
                className={`${inputCls} cursor-pointer`} style={inputStyle}>
                <option value="">— Sərbəst hesablama —</option>
                {risks.map(r => <option key={r.id} value={r.id}>{r.code} — {r.title}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Aktivin dəyəri (AV)">
            <input type="number" min={0} value={draft.assetValue}
              onChange={e => { setDraft(d => ({ ...d, assetValue: Number(e.target.value) })); setResult(null) }}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Zərər faizi (EF)" hint="0 – 1 aralığında">
            <input type="number" min={0} max={1} step={0.05} value={draft.exposureFactor}
              onChange={e => { setDraft(d => ({ ...d, exposureFactor: Number(e.target.value) })); setResult(null) }}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="ARO" hint="İldə orta hadisə sayı (Poisson λ)">
            <input type="number" min={0} step={0.1} value={draft.aro}
              onChange={e => { setDraft(d => ({ ...d, aro: Number(e.target.value) })); setResult(null) }}
              className={inputCls} style={inputStyle} />
          </Field>

          <Field label="Dəyişkənlik (σ)" hint="Zərərin yayılması; standart fərziyyə 0.3">
            <input type="number" min={0.01} max={2} step={0.05} value={draft.volatility}
              onChange={e => { setDraft(d => ({ ...d, volatility: Number(e.target.value) })); setResult(null) }}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="İterasiya" hint="Maksimum 200 000">
            <input type="number" min={100} max={200000} step={1000} value={draft.iterations}
              onChange={e => { setDraft(d => ({ ...d, iterations: Number(e.target.value) })); setResult(null) }}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Toxum (seed)" hint="Eyni toxum eyni nəticəni verir">
            <div className="flex gap-2">
              <input type="number" value={draft.seed}
                onChange={e => { setDraft(d => ({ ...d, seed: Number(e.target.value) })); setResult(null) }}
                className={inputCls} style={inputStyle} />
              <button type="button" onClick={() => { setDraft(d => ({ ...d, seed: newSeed() })); setResult(null) }}
                title="Yeni toxum"
                className="px-3 rounded-lg border shrink-0" style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}>
                <Dice5 className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={run} disabled={running || invalid}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--brand-500)' }}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Simulyasiyanı işə sal
          </button>
          {result && (
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Yadda saxla
            </button>
          )}
          {invalid && <span className="text-[11px]" style={{ color: '#e11d48' }}>Giriş dəyərlərini yoxla</span>}
        </div>
      </div>

      {/* ── Nəticə ──────────────────────────────────────────────────────── */}
      {result && (
        <div className="card p-5 space-y-5">
          <div className="grid gap-px" style={{
            background: 'var(--border)', border: '1px solid var(--border)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          }}>
            {([
              ['Deterministik ALE', money(result.ale, draft.currency), 'var(--foreground)', 'AV × EF × ARO'],
              ['Simulyasiya ortalaması', money(result.simulatedMeanAle, draft.currency), 'var(--foreground)', `${result.iterations.toLocaleString('az-AZ')} təkrar`],
              ['Median', money(result.median, draft.currency), 'var(--muted-fg)', 'illərin yarısı bundan az'],
              ['VaR 95%', money(result.var95, draft.currency), '#d97706', '20 ildən 1-i bundan pis'],
              ['VaR 99%', money(result.var99, draft.currency), '#e11d48', '100 ildən 1-i bundan pis'],
              ['TVaR 95%', money(result.tvar95, draft.currency), '#e11d48', 'quyruğun ortalaması'],
              ['Maksimum', money(result.maxSimulatedLoss, draft.currency), 'var(--muted-fg)', 'ən pis ssenari'],
              ['Zərərsiz illər', `${result.zeroLossProbability}%`, '#059669', 'heç bir hadisə yoxdur'],
            ] as const).map(([label, value, color, hint]) => (
              <div key={label} className="px-3 py-3 flex flex-col gap-0.5" style={{ background: 'var(--card)' }}>
                <span className="text-base font-black tabular-nums leading-tight" style={{ color }}>{value}</span>
                <span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>{label}</span>
                <span className="text-[10px]" style={{ color: 'var(--muted-fg)', opacity: 0.75 }}>{hint}</span>
              </div>
            ))}
          </div>

          <LossDistributionChart
            buckets={result.buckets} var95={result.var95} var99={result.var99}
            currency={draft.currency} zeroLossProbability={result.zeroLossProbability}
          />

          <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>
            Toxum <strong style={{ color: 'var(--foreground)' }}>{result.seed}</strong> · σ {result.volatility} ·
            eyni girişlə eyni toxum həmişə eyni nəticəni verir, ona görə hesabatdakı rəqəm yenidən yoxlana bilər.
          </p>
        </div>
      )}

      {/* ── Saxlanılmış işəsalmalar ─────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
            Saxlanılmış simulyasiyalar ({runs.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'var(--muted)' }}>
              <tr>
                {['Model', 'AV / EF / ARO', 'İterasiya', 'Toxum', 'ALE', 'VaR 95%', 'VaR 99%', 'İşə salıb', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>
                  Hələ simulyasiya saxlanılmayıb
                </td></tr>
              ) : runs.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--foreground)' }}>{r.label}</td>
                  <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums" style={{ color: 'var(--muted-fg)' }}>
                    {money(Number(r.asset_value), r.currency ?? 'AZN')} / {Number(r.exposure_factor)} / {Number(r.aro)}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums" style={{ color: 'var(--muted-fg)' }}>{r.iterations.toLocaleString('az-AZ')}</td>
                  <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums" style={{ color: 'var(--muted-fg)' }}>{r.seed}</td>
                  <td className="px-3 py-2.5 text-xs font-mono tabular-nums" style={{ color: 'var(--foreground)' }}>{money(Number(r.simulated_mean_ale), r.currency ?? 'AZN')}</td>
                  <td className="px-3 py-2.5 text-xs font-mono tabular-nums" style={{ color: '#d97706' }}>{money(Number(r.var_95), r.currency ?? 'AZN')}</td>
                  <td className="px-3 py-2.5 text-xs font-mono tabular-nums" style={{ color: '#e11d48' }}>{money(Number(r.var_99), r.currency ?? 'AZN')}</td>
                  <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                    {r.executed_by || '—'}<br />
                    <span className="opacity-75">{new Date(r.executed_at).toLocaleDateString('az-AZ')}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => replay(r)} title="Eyni toxumla yenidən hesabla"
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.06]">
                        <RotateCw className="w-3.5 h-3.5" style={{ color: 'var(--muted-fg)' }} />
                      </button>
                      <button onClick={() => remove(r.id)} title="Sil"
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#e11d48' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
