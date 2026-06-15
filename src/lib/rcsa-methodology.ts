// ============================================================================
// RCSA methodology — SINGLE SOURCE OF TRUTH.
// Texts are taken verbatim from "Risk Policy 30.04.2026.xlsx" (the official
// methodology). Do NOT paraphrase — these are the exact policy descriptions.
// ============================================================================

export interface ScaleOption {
  value: number
  label: string
  desc: string
}

// 5-level impact scale labels (the 6th "Kritik/fors-major" column is excluded by design)
export const IMPACT_LEVEL_LABELS = ['Minimal', 'Aşağı', 'Orta', 'Yüksək', 'Maksimum'] as const

function impactOptions(descs: [string, string, string, string, string]): ScaleOption[] {
  return descs.map((desc, i) => ({ value: i + 1, label: IMPACT_LEVEL_LABELS[i], desc }))
}

export interface ImpactDomain {
  key: string
  label: string
  group?: string // e.g. İT, Əməliyyat
  field: string // Risk field name
  options: ScaleOption[]
}

// 9 impact dimensions (İT = 3 sub: Məxfilik/Dürüstlük/Mövcudluq) — Excel "1-Təsir Şkalası" + "2-İT üçün təsir"
export const IMPACT_DOMAINS: ImpactDomain[] = [
  {
    key: 'financial', label: 'Maliyyə', field: 'financial_impact',
    options: impactOptions([
      '1000-ədək AZN',
      '1001-10.000 AZN aralığı',
      '10.001-100.000 aralığı AZN',
      '100.001-1.000.000 aralığı AZN',
      '1.000.000-1.500.000 aralığı AZN',
    ]),
  },
  {
    key: 'compliance', label: 'Uyğunluq / Qanuni', field: 'compliance_impact',
    options: impactOptions([
      '1.Heç bir qanun pozuntusu, heç bir iddia yoxdur 2.Sənədləşmələr aktualdır və heç bir xəta yoxdur',
      'İş prosesində heç bir cərimə və ya nüfuza xələl gətirmə riski olmayan qanuni tələblərin pozulması var.',
      '1. Cərimə ilə nəticələnə bilən qanun pozuntularının baş verməsi 2. Qanunvericiliyin pozulması və üzvlərin şikayətləri nəticəsində biznes proseslərinə təsir 3.Struktur daxili tərtib edilmiş sənədlərin tələblərin pozulması',
      '1.Qanuni tələblərin pozulması nəticəsində Büroya qarşı görülmüş hüquqi tədbirlər (sanksiyaların tətbiqi, fəaliyyətin məhdudlaşdırılması və s.) 2.Ali icra orqan tərəfindən təsdiq edilmiş imperativ sənədlərin tələblərinin pozulması',
      '1.Büronun fəaliyyətinin məhdudlaşdırılması 2.COB tələblərinin gecikdirilməsi 3.Ali idarə edici orqanın sənədlərinin pozulması 4.Sənədləşmələrin aparılmaması 5.Regulyator tərəfindən iradlar 6.BCP-nin aktivləşmə riski',
    ]),
  },
  {
    key: 'strategy', label: 'Strategiya', field: 'strategy_impact',
    options: impactOptions([
      'Strategiyanın icrası zamanı hər hansı neqativ təsir müəyyən edilmədi',
      'Strategiya fəaliyyəti üzrə Milestone səviyyəsində yayınmaların və ya gecikmələrin olması (1 ayadək)',
      'Strateji təşəbbüslərin reallaşmasında gecikmələr yaranır (cari il üçün nəzərdə tutulan tapşırığın yerinə yetirilməməsi).',
      'Bir ana fəaliyyət üzrə strategiyada uğursuzluğun yaranması',
      'Bir neçə ana fəaliyyətdə uğursuzluğun yaranması və ya strategiyanın 50%-dən aşağı icrası',
    ]),
  },
  {
    key: 'reputation', label: 'Reputasiya', field: 'reputation_impact',
    options: impactOptions([
      'Reputasiyaya heç bir ziyan dəyməyib.',
      '1. Mülki şikayətlərin olması (3-dən çox, nüfuz/maliyyə itkisi riski yaratmır) 2.Məhkəmədə baxılan işlərin olması və sosial şəbəkələrdə 1 həftədən çox şərhlər',
      '1. Respublika mətbuatında neqativ, reputasiyaya xələl gətirən məlumatların dərci 2. Mərkəzi Bankdan məktub/xəbərdarlıq 3. KİV-də dəqiq olmayan/köhnə məlumatlar',
      '1. Uyğunluq boşluqları səbəbindən kiber insidentlər, yüksək təsir, iştirakçıların 10%-nin itirilməsi 2. AMB tərəfindən təcili iclas və məhdudiyyətlər 3. Sosial şəbəkələrdə zidd məlumatlar',
      '1. COB tərəfindən məhdudlaşdırma 2. Portfeldə əsas üzvlərin itirilməsi 3. Nüfuza dəyən zərərlə fəaliyyətin məhdudlaşdırılması (Büronun imicinin itirilməsi və ləğvi)',
    ]),
  },
  {
    key: 'hse', label: 'SƏTƏM', group: 'Əməliyyat', field: 'hse_impact',
    options: impactOptions([
      '1. SƏTƏM ilə bağlı heç bir insident baş verməyib.',
      '1.SƏTƏM hadisəsi baş verib; yüngül xəsarət (tibbi müdaxiləyə ehtiyac yoxdur). İlk yardım kifayətdir.',
      '1.Ciddi xəstəliklər/xəsarətlər (həkim müayinəsi lazımdır) 2.Əməyin təhlükəsizliyi aktivlərinin yetərsizliyi 3.Aktivlərin zədələnməsi ilə nəticələnməyən hadisələr',
      '1.Ağır xəsarət, əlillik (birinci dərəcə) 2.Büro aktivlərinin/inzibati binanın zədələnməsi 3.Əməyin mühafizəsi üçün kritik aktivlərin olmaması',
      '1.Daimi əlillik (2,3,4 dərəcə) və ya ölüm ehtimalı 2.Yanğından mühafizə tədbirlərinin yetərsizliyi 3.İnzibati binanın istifadəsində məhdudiyyətlər (ölüm/bina yararsızlığı)',
    ]),
  },
  {
    key: 'business_process', label: 'Biznes prosesi', group: 'Əməliyyat', field: 'business_process_impact',
    options: impactOptions([
      '1. Əməliyyat prosesinə təsir edən işlərin 10%-i yerinə yetirilməmişdir. 2. Proseslərə heç bir mənfi təsir olmadı.',
      '1. Əməliyyat prosesinə təsir edən işlərin 20%-i tamamlanmayıb. 2. Proseslərə cüzi (50%-dən az) mənfi təsir, prosesdən yayınma (10%-dən az).',
      '1. Prosesi təşkil edən işin 50%-nin yerinə yetirilməməsi 2. Əsas hədəflərin 50% yerinə yetirilməməsi və ya 10% kənara çıxma 3. Biznes proseslərin 1 gün təmin edilməməsi / 3 gün gecikmə',
      '1. İşlərin 50%-80%-nin yerinə yetirilməməsi 2. Əsas hədəflərin 50%-70%-nin pozulması / 20% kənara çıxma 3. Biznes proseslərin 2 gün təmin edilməməsi / 4-7 gün gecikmə',
      '1. Prosesin dayandırılması (80%-100% icra olunmaması) 2. Əsas məqsədlərin 80%-nin pozulması / 50% kənara çıxma 3. Biznes proseslərin 3-7 gün təmin edilməməsi / 8-29 gün gecikmə',
    ]),
  },
  {
    key: 'confidentiality', label: 'Məxfilik', group: 'İT', field: 'confidentiality',
    options: impactOptions([
      'Sızdırılmış məlumat ≤ 10% (PII deyil).',
      'Sızdırılmış məlumatlar 10-20% (məhdud daxili məlumat). Qanuni tələb yoxdur.',
      'Kiberhücum baş verir. Sızdırılmış məlumatlar 21%-50% (şəxsi məlumatlar). Daxili və məxfi məlumatların açıqlanması. Araşdırma tələb olunur.',
      'Kiberhücum/fişinq baş verir. Sızdırılmış məlumatlar 51%-70% (PII, maliyyə sənədləri). Tənzimləyiciyə bildiriş tələb olunur.',
      'Kiberhücum/fişinq baş verir. Sızdırılmış məlumatlar 71%+ və ya yüksək həssas/sektor məlumatları. Hüquqi sanksiya, reputasiya itkisi, medianın ifşası.',
    ]),
  },
  {
    key: 'integrity', label: 'Dürüstlük', group: 'İT', field: 'integrity',
    options: impactOptions([
      'Dəyişən məlumat ≤ 10% və proseslərdə səhvlərə səbəb olmur. Düzəliş vaxtı ≤ 10 dəqiqə.',
      'Məlumat 10%-20% arasında dəyişdi. Hesabatlarda uyğunsuzluq (10%-20%). Korreksiya ≤ 1 saat.',
      'Məlumatda 21%-50% dəyişiklik. Maliyyə hesablamalarına təsir edir. Düzəliş ≤ 4 saat.',
      'Məlumatda 51%-70% dəyişiklik. Əməliyyatlar səhv yerinə yetirilir. Düzəliş ≤ 1 gün.',
      'Məlumatda 71%+ dəyişiklik. Əməliyyatlar dayandırılır və ya səhv icra edilir. Düzəliş müddəti 1 gün+.',
    ]),
  },
  {
    key: 'availability', label: 'Mövcudluq', group: 'İT', field: 'availability',
    options: impactOptions([
      'Xidmətin kəsilməsi ≤ 5 dəqiqə. SLA pozulmayıb.',
      'Kəsinti 6-30 dəqiqə. Xidmət və əməliyyat proseslərində gecikmələr.',
      'Kəsinti 31 dəqiqə - 2 saat. Müştərilərin 21-50%-i xidmət ala bilmir.',
      'Kəsinti 2 saat – 8 saat. Kritik proseslər dayandırılıb. SLA 51%-71% pozulub.',
      'Kəsinti 12 saatdan çox. Əsas biznes funksiyaları dayandırılır. SLA 71%+ pozulub. Tənzimləyiciyə bildiriş, medianın açıqlanması.',
    ]),
  },
]

// ── Likelihood / Probability (Excel "3-Ehtimal")
export const LIKELIHOOD_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Nadir (<5%)', desc: '<5% · Hadisələr 10+ ildən uzun aralıqda baş verir' },
  { value: 2, label: 'Az ehtimal edilən (5%-10%)', desc: '5%-10% · 61 aydan-10 ildən bir baş verməsi ehtimal olunur' },
  { value: 3, label: 'Mümkün (11-20%)', desc: '11%-20% · 25 ay-5 ildən bir baş verməsi ehtimal olunur' },
  { value: 4, label: 'Çox ehtimal edilən (21-50%)', desc: '21-50% · 13 ay-2 ildən bir baş verməsi ehtimal olunur' },
  { value: 5, label: 'Mütəmadi (>50%)', desc: '>50% · 1 il ərzində bir və daha çox baş verməsi ehtimal olunur' },
]

// ── Control effectiveness: 6 sub-criteria — Design (3) + Implementation (3).
// value 1 = Güclü (best) … 5 = Zəif (worst). Each criterion has its own 1-5 description.
const CONTROL_RATING_LABELS = ['Güclü', 'Nisbətən güclü', 'Adekvat', 'Nisbətən adekvat', 'Zəif'] as const
function ctrlOptions(descs: [string, string, string, string, string]): ScaleOption[] {
  return descs.map((desc, i) => ({ value: i + 1, label: CONTROL_RATING_LABELS[i], desc }))
}

export interface ControlSubCriterion {
  key:
    | 'design_compliance' | 'design_strength' | 'design_timeliness'
    | 'impl_relevance' | 'impl_sustainability' | 'impl_traceability'
  group: 'design' | 'implementation'
  label: string
  options: ScaleOption[]
}

export const CONTROL_SUBCRITERIA: ControlSubCriterion[] = [
  {
    key: 'design_compliance', group: 'design', label: 'Uyğunluq (əhatə)',
    options: ctrlOptions([
      'Bütün kritik risklər tam əhatə olunur; dizayn riskə proporsionaldır, standartlara cavab verir. Preventiv/dərhal.',
      'Risk-əsaslı yanaşma, ~90% əhatə. Minimal boşluq. Əsasən vaxtında.',
      'Risklərin 50-89%-i əhatə olunur, bəzi dizayn boşluqları var. Nəzərəçarpan gecikmə.',
      'Yalnız 25-49% əhatə; dizayn risk xəritəsini örtmür. İcra reaktiv/qeyri-sabit.',
      '0-24% əhatə; kritik dizayn boşluqları. Nəzarət vaxtında tətbiq olunmur.',
    ]),
  },
  {
    key: 'design_strength', group: 'design', label: 'Güclülük',
    options: ctrlOptions([
      'Dizayn test standartlarına və ən yaxşı təcrübələrə tam cavab verir.',
      'Əksər aspektlərdə adekvat, minimal təkmilləşmə (90%-ə qədər standart).',
      'Bəzi sahələrdə qeyri-adekvat, orta təkmilləşmə (70%-ə qədər).',
      'Bir neçə aspektdə qeyri-adekvat, əhəmiyyətli təkmilləşmə (50%-ə qədər).',
      'Çox aspektdə qeyri-adekvat; təcili genişləndirmə tələb olunur.',
    ]),
  },
  {
    key: 'design_timeliness', group: 'design', label: 'Zamanlılıq',
    options: ctrlOptions([
      'Real vaxtda/dərhal icra. Gecikmə yox. Preventiv.',
      'Preventiv, vaxtında, kiçik gecikmələr (<10%).',
      'Əsasən vaxtında, gecikmələr (11-49%). Detektiv/preventiv.',
      'Tez-tez gecikmələr (50-90%). Detektiv/direktiv.',
      'Vaxtında icra edilmir (91-100%) və ya tətbiq olunmur.',
    ]),
  },
  {
    key: 'impl_relevance', group: 'implementation', label: 'Münasiblik (aktuallıq)',
    options: ctrlOptions([
      'Tam aktual (91-100% risk/biznes dəyişikliklərinə uyğun).',
      'Yüksək aktual (~90%), biznes tələblərinə uyğun.',
      'Əsas riskləri əhatə edir (50-89%), orta uyğun. Proseslərlə dəyişməyib.',
      'Qismən aktual (25-49%), yalnız bəzi biznes ehtiyaclarına uyğun.',
      'Köhnəlmiş (0-24%), uyğun deyil/işləmir.',
    ]),
  },
  {
    key: 'impl_sustainability', group: 'implementation', label: 'Davamlılıq',
    options: ctrlOptions([
      'Tam avtomatlaşdırılmış və fasiləsiz tətbiq olunur.',
      'Demək olar fasiləsiz, stabil tətbiq.',
      'Müntəzəm, lakin bəzi fasilələrlə tətbiq.',
      'Ara-sıra, sistemsiz tətbiq.',
      'Tətbiq olunmur və ya çox nadir.',
    ]),
  },
  {
    key: 'impl_traceability', group: 'implementation', label: 'İzləniləbilərlik',
    options: ctrlOptions([
      'Real-vaxt monitorinq, tam audit izi, tam icra sübutu.',
      'Sistemli izləmə və audit izi mövcuddur.',
      'Qismən sənədləşdirilmiş izləmə və sübut.',
      'Yalnız manual və natamam izləmə.',
      'Monitorinq, izləmə və ya sənədləşmə yoxdur.',
    ]),
  },
]

// Overall control rating descriptions (Excel "Təsvir") — keyed by ControlRating
export const CONTROL_RATING_INFO: Record<string, { label: string; desc: string }> = {
  strong: { label: 'Güclü', desc: 'Nəzarət və idarəetmə mühafizələri gücləndirir və risklərdən qorunmaq üçün şərait yaradır. Risklərin sürətlənməsini/təsirini azaldır (riskin 0 olması demək deyil).' },
  relatively_strong: { label: 'Nisbətən güclü', desc: 'Nəzarət alətləri adekvatdır və riskin ehtimal/təsirini azaldır. Effektivliyi təkmilləşdirmək imkanları mövcuddur.' },
  adequate: { label: 'Adekvat', desc: 'Nəzarət alətləri risklərin idarə olunmasında effektivdir, lakin risklər baş verə bilər. İnkişaf və əlavə kompensasiya nəzarətləri qalıq riski azalda bilər.' },
  relatively_adequate: { label: 'Nisbətən adekvat', desc: 'Nəzarət alətləri riski aşağı səviyyəyə endirir. Əsas boşluqlar və nəzarət nöqsanları aşkar edilmişdir.' },
  weak: { label: 'Zəif və ya yox', desc: 'Nəzarət alətləri risklərin effektiv idarə olunmasına imkan vermir. Risklərin tezliyində və təsirində azalma yoxdur.' },
}

// ── Risk treatment (Excel "5-Riskin müalicəsi")
export interface TreatmentOption { value: string; label: string; desc: string }
export const TREATMENT_OPTIONS: TreatmentOption[] = [
  { value: 'accept', label: 'Qəbuletmə', desc: 'Nəzarətdə saxlanılması və nəzərdən keçirilməsi (tolerant)' },
  { value: 'transfer', label: 'Transfer', desc: 'Riskin sığorta edilməsi və ya başqa tərəfə/tərəfdaşa köçürülməsi' },
  { value: 'mitigate', label: 'Azaltma', desc: 'Riskin baş vermə ehtimalının azaldılması və ya riskə son qoymaq üçün tədbirlər görülməsi' },
  { value: 'avoid', label: 'Yayınma', desc: 'Ərazidən təcrid olunmaq və ya risk azalana qədər xidmət göstərilməməsi' },
]

// ── Level wording: inherent (natural risk) vs residual (Excel differs!)
import type { RiskLevel } from '@/types'
const INHERENT_WORD: Record<RiskLevel, string> = { minimal: 'Minimal', low: 'Aşağı', medium: 'Orta', high: 'Yüksək', critical: 'Maksimum' }
const RESIDUAL_WORD: Record<RiskLevel, string> = { minimal: 'Minimal', low: 'Aşağı', medium: 'Orta', high: 'Yüksək', critical: 'Çox Yüksək' }
export function inherentLevelWord(l: RiskLevel): string { return INHERENT_WORD[l] }
export function residualLevelWord(l: RiskLevel): string { return RESIDUAL_WORD[l] }

// ── SLA due-date budget per level (kept from prior phase)
export const SLA_DAYS: Record<RiskLevel, number> = { critical: 30, high: 90, medium: 120, low: 240, minimal: 365 }
export function computeDueDate(level: RiskLevel, fromISO?: string): string {
  const base = fromISO ? new Date(fromISO) : new Date()
  const due = new Date(base)
  due.setDate(due.getDate() + SLA_DAYS[level])
  return due.toISOString().slice(0, 10)
}
