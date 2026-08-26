// Monte Carlo — illik zərərin (ALE) stoxastik modeli.
//
// Model: mürəkkəb Poisson (compound Poisson), sığorta aktuariyasının standart
// yanaşması:
//     N ~ Poisson(ARO)                     — il ərzində hadisə sayı
//     X_i ~ LogNormal(μ, σ)                — hər hadisənin zərəri, E[X] = SLE
//     İllik zərər = Σ(i=1..N) X_i
//
// Diqqət: mənbə kodda illik zərər `bir X * N` kimi hesablanırdı, yəni bir ildəki
// bütün hadisələr eyni zərərə malik sayılırdı. Bu, quyruğu süni şəkildə
// şişirdir. Burada hər hadisə üçün ayrıca zərər çəkilir və toplanır.
//
// Bütün təsadüfi ədədlər TOXUMLANIR (seed): eyni toxum həmişə eyni nəticəni
// verir. Auditor hesabatdakı rəqəmi yenidən işlədib yoxlaya bilər — toxumsuz
// simulyasiyanın nəticəsi sübut kimi işə yaramır.

export interface MonteCarloInput {
  /** Aktivin dəyəri (AV) */
  assetValue: number
  /** Zərər faizi (EF), 0–1 */
  exposureFactor: number
  /** İllik başvermə tezliyi (ARO) — Poisson λ */
  aro: number
  /** Zərərin dəyişkənliyi (lognormal σ). Standart fərziyyə 0.3 */
  volatility?: number
  iterations?: number
  /** Təkrarlana bilən nəticə üçün toxum */
  seed?: number
}

export interface HistogramBucket {
  /** Aralığın aşağı sərhədi */
  from: number
  /** Aralığın yuxarı sərhədi */
  to: number
  count: number
}

export interface MonteCarloResult {
  iterations: number
  seed: number
  volatility: number
  /** Deterministik SLE = AV × EF */
  sle: number
  /** Deterministik ALE = SLE × ARO */
  ale: number
  /** Simulyasiyanın orta illik zərəri */
  simulatedMeanAle: number
  median: number
  var95: number
  var99: number
  /** VaR95-dən yuxarı zərərlərin ortalaması (gözlənilən defisit) */
  tvar95: number
  maxSimulatedLoss: number
  /** Zərərsiz keçən illərin payı — Poisson-da N=0 olan hallar */
  zeroLossProbability: number
  buckets: HistogramBucket[]
}

export const DEFAULT_ITERATIONS = 10_000
export const DEFAULT_VOLATILITY = 0.3
const MAX_ITERATIONS = 200_000
const BUCKET_COUNT = 40

// ── Toxumlanan təsadüfi ədəd generatoru (mulberry32) ────────────────────────
// Math.random() toxumlana bilmir, ona görə işlədilmir.
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller: standart normal paylanma */
function normal(rng: () => number): number {
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Poisson(λ) — hadisə sayı.
 * Kiçik λ üçün Knuth üsulu; λ böyüdükcə e^-λ sıfıra yuvarlaqlaşdığı üçün
 * (λ > 500-də double dəqiqliyi çatmır) normal yaxınlaşmaya keçilir.
 */
export function poisson(rng: () => number, lambda: number): number {
  if (lambda <= 0) return 0
  if (lambda < 30) {
    const limit = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= rng()
    } while (p > limit)
    return k - 1
  }
  const approx = Math.round(lambda + Math.sqrt(lambda) * normal(rng))
  return approx < 0 ? 0 : approx
}

/**
 * Lognormal, gözlənilən qiyməti `mean` olacaq şəkildə parametrləşdirilir:
 *     μ = ln(mean) − σ²/2   →   E[X] = mean
 */
function lognormal(rng: () => number, mean: number, sigma: number): number {
  if (mean <= 0) return 0
  const mu = Math.log(mean) - (sigma * sigma) / 2
  return Math.exp(mu + sigma * normal(rng))
}

/** Xətti interpolyasiya ilə persentil — numpy.percentile ilə eyni davranış */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Deterministik SLE və ALE — simulyasiyasız baza göstəriciləri */
export function deterministicRisk(input: Pick<MonteCarloInput, 'assetValue' | 'exposureFactor' | 'aro'>) {
  const sle = input.assetValue * input.exposureFactor
  return { sle: round2(sle), ale: round2(sle * input.aro) }
}

/**
 * Histoqram YALNIZ zərərli illər üzərində qurulur.
 * Səbəb: ARO=0.5 olanda illərin ~61%-i sıfır zərərlə keçir (Poisson-da N=0).
 * Sıfırlar histoqrama qatılsaydı, birinci sütun qalan bütün paylanmanı əzərdi
 * və qrafik oxunmaz olardı. Sıfır kütləsi ayrıca `zeroLossProbability` kimi
 * verilir — məlumat itmir, sadəcə iki fərqli sual iki yerdə cavablanır:
 * "nə qədər tez-tez zərər olur" və "zərər olanda nə qədər olur".
 */
function buildBuckets(sortedLosses: number[]): HistogramBucket[] {
  const positive = sortedLosses.filter(v => v > 0)
  if (positive.length === 0) return []
  // Yuxarı sərhəd kimi p99.5 götürülür: tək bir kənar dəyər bütün histoqramı
  // yastılaşdırmasın. Ondan yuxarısı sonuncu səbətə yığılır.
  const upper = Math.max(percentile(positive, 99.5), 1e-9)
  const width = upper / BUCKET_COUNT
  const buckets: HistogramBucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    from: round2(i * width),
    to: round2((i + 1) * width),
    count: 0,
  }))
  for (const loss of positive) {
    const i = Math.min(BUCKET_COUNT - 1, Math.floor(loss / width))
    buckets[i].count++
  }
  return buckets
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const iterations = Math.min(MAX_ITERATIONS, Math.max(1, Math.floor(input.iterations ?? DEFAULT_ITERATIONS)))
  const volatility = input.volatility ?? DEFAULT_VOLATILITY
  const seed = input.seed ?? Math.floor(Math.random() * 2 ** 31)
  const rng = createRng(seed)

  const { sle, ale } = deterministicRisk(input)

  const losses = new Array<number>(iterations)
  let zeroYears = 0
  for (let i = 0; i < iterations; i++) {
    const events = poisson(rng, input.aro)
    if (events === 0) { losses[i] = 0; zeroYears++; continue }
    // Hər hadisə üçün ayrıca zərər — hamısı eyni deyil
    let annual = 0
    for (let e = 0; e < events; e++) annual += lognormal(rng, sle, volatility)
    losses[i] = annual
  }

  const sorted = [...losses].sort((a, b) => a - b)
  const sum = losses.reduce((acc, v) => acc + v, 0)
  const var95 = percentile(sorted, 95)
  const tail = sorted.filter(v => v >= var95)

  return {
    iterations,
    seed,
    volatility,
    sle,
    ale,
    simulatedMeanAle: round2(sum / iterations),
    median: round2(percentile(sorted, 50)),
    var95: round2(var95),
    var99: round2(percentile(sorted, 99)),
    tvar95: round2(tail.length ? tail.reduce((a, v) => a + v, 0) / tail.length : var95),
    maxSimulatedLoss: round2(sorted[sorted.length - 1]),
    zeroLossProbability: round2((zeroYears / iterations) * 100),
    buckets: buildBuckets(sorted),
  }
}
