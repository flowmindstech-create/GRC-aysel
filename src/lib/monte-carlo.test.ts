import { describe, it, expect } from 'vitest'
import {
  runMonteCarlo, deterministicRisk, createRng, poisson, percentile,
} from './monte-carlo'

const INPUT = { assetValue: 500_000, exposureFactor: 0.4, aro: 0.5 }

describe('monte-carlo', () => {
  it('SLE aktivin dəyəri ilə zərər faizinin hasilidir', () => {
    const { sle, ale } = deterministicRisk(INPUT)
    expect(sle).toBe(200_000)      // 500000 × 0.40
    expect(ale).toBe(100_000)      // 200000 × 0.50
  })

  it('eyni toxum eyni nəticəni verir', () => {
    const a = runMonteCarlo({ ...INPUT, seed: 42, iterations: 2000 })
    const b = runMonteCarlo({ ...INPUT, seed: 42, iterations: 2000 })
    expect(b.simulatedMeanAle).toBe(a.simulatedMeanAle)
    expect(b.var95).toBe(a.var95)
    expect(b.var99).toBe(a.var99)
  })

  it('fərqli toxum fərqli nəticə verir', () => {
    const a = runMonteCarlo({ ...INPUT, seed: 1, iterations: 2000 })
    const b = runMonteCarlo({ ...INPUT, seed: 2, iterations: 2000 })
    expect(b.simulatedMeanAle).not.toBe(a.simulatedMeanAle)
  })

  it('simulyasiyanın ortalaması deterministik ALE-yə yaxınlaşır', () => {
    const r = runMonteCarlo({ ...INPUT, seed: 7, iterations: 50_000 })
    // E[Σ X_i] = E[N]·E[X] = ARO × SLE = 100 000
    expect(r.simulatedMeanAle).toBeGreaterThan(90_000)
    expect(r.simulatedMeanAle).toBeLessThan(110_000)
  })

  it('persentillər sıralıdır və maksimum hamısından böyükdür', () => {
    const r = runMonteCarlo({ ...INPUT, seed: 3, iterations: 10_000 })
    expect(r.median).toBeLessThanOrEqual(r.var95)
    expect(r.var95).toBeLessThanOrEqual(r.var99)
    expect(r.var99).toBeLessThanOrEqual(r.maxSimulatedLoss)
    // Gözlənilən defisit tərifinə görə VaR-dan kiçik ola bilməz
    expect(r.tvar95).toBeGreaterThanOrEqual(r.var95)
  })

  it('ARO=0.5 olanda illərin təxminən 60%-i zərərsiz keçir', () => {
    const r = runMonteCarlo({ ...INPUT, seed: 11, iterations: 20_000 })
    // P(N=0) = e^-0.5 ≈ 0.6065
    expect(r.zeroLossProbability).toBeGreaterThan(57)
    expect(r.zeroLossProbability).toBeLessThan(64)
  })

  it('ARO=0 olanda heç bir zərər baş vermir', () => {
    const r = runMonteCarlo({ ...INPUT, aro: 0, seed: 5, iterations: 1000 })
    expect(r.simulatedMeanAle).toBe(0)
    expect(r.maxSimulatedLoss).toBe(0)
    expect(r.zeroLossProbability).toBe(100)
  })

  it('Poisson generatoru gözlənilən ortalamanı verir', () => {
    const rng = createRng(99)
    let total = 0
    const n = 20_000
    for (let i = 0; i < n; i++) total += poisson(rng, 2.5)
    expect(total / n).toBeGreaterThan(2.3)
    expect(total / n).toBeLessThan(2.7)
  })

  it('Poisson mənfi və ya sıfır λ üçün 0 qaytarır', () => {
    const rng = createRng(1)
    expect(poisson(rng, 0)).toBe(0)
    expect(poisson(rng, -1)).toBe(0)
  })

  it('persentil xətti interpolyasiya edir', () => {
    const s = [0, 10, 20, 30, 40]
    expect(percentile(s, 0)).toBe(0)
    expect(percentile(s, 100)).toBe(40)
    expect(percentile(s, 50)).toBe(20)
    expect(percentile(s, 25)).toBe(10)
  })

  it('histoqram yalnız zərərli illəri sayır, sıfırlar ayrıca verilir', () => {
    const r = runMonteCarlo({ ...INPUT, seed: 13, iterations: 5000 })
    const counted = r.buckets.reduce((acc, b) => acc + b.count, 0)
    const zeroYears = Math.round((r.zeroLossProbability / 100) * 5000)
    // Sıfırlar histoqramda deyil, amma heç bir müşahidə itmir
    expect(counted).toBe(5000 - zeroYears)
    expect(counted).toBeGreaterThan(0)
  })

  it('zərər ümumiyyətlə yoxdursa histoqram boş qalır', () => {
    const r = runMonteCarlo({ ...INPUT, aro: 0, seed: 5, iterations: 500 })
    expect(r.buckets).toHaveLength(0)
  })

  it('iterasiya sayı yuxarı hədlə məhdudlaşdırılır', () => {
    const r = runMonteCarlo({ ...INPUT, seed: 1, iterations: 10_000_000 })
    expect(r.iterations).toBe(200_000)
  })

  it('dəyişkənlik artdıqca quyruq uzanır, ortalama sabit qalır', () => {
    const low  = runMonteCarlo({ ...INPUT, seed: 21, iterations: 30_000, volatility: 0.1 })
    const high = runMonteCarlo({ ...INPUT, seed: 21, iterations: 30_000, volatility: 1.0 })
    expect(high.var99).toBeGreaterThan(low.var99)
    // Lognormal μ = ln(mean) − σ²/2 seçildiyi üçün ortalama σ-dan asılı deyil
    expect(Math.abs(high.simulatedMeanAle - low.simulatedMeanAle)).toBeLessThan(30_000)
  })
})
