// Sətir daxilində göstərilən enum dəyərlərinin Azərbaycanca qarşılıqları.
//
// Qayda: interfeys (başlıqlar, düymələr, menyu) İngilis dilindədir, cədvəl
// xanasındakı dəyər isə məzmun sayılır və Azərbaycan dilində göstərilir.
// Enum-un özü (bazadakı dəyər) toxunulmur — yalnız göstərilən etiket dəyişir.
//
// Buranı tək mənbə saxlayın: hesabatlar, reyestrlər və kartlar eyni sözü
// göstərməlidir, əks halda eyni status iki yerdə iki cür adlanır.

const fallback = (v: string) => v.replace(/_/g, ' ')

function look(map: Record<string, string>, v?: string | null): string {
  if (!v) return '—'
  return map[v] ?? fallback(v)
}

// Monitorinq svetoforu (KRI, KPI)
export const MONITORING_STATUS_AZ: Record<string, string> = {
  green: 'Yaşıl',
  amber: 'Sarı',
  red: 'Qırmızı',
}

// Nəzarət effektivliyi statusu (KCI, Control Library)
export const EFFECTIVENESS_AZ: Record<string, string> = {
  effective: 'Effektiv',
  partially_effective: 'Qismən effektiv',
  ineffective: 'Effektiv deyil',
  na: 'Yoxlanılmayıb',
  not_tested: 'Yoxlanılmayıb',
}

// Nəzarət test nəticəsi (checklist)
export const CONTROL_TEST_AZ: Record<string, string> = {
  pass: 'Keçdi',
  partial: 'Qismən',
  fail: 'Keçmədi',
  na: 'Yoxlanılmayıb',
}

// RCSA nəzarət qiyməti (1-5 balın söz qarşılığı)
export const CONTROL_RATING_AZ: Record<string, string> = {
  strong: 'Güclü',
  relatively_strong: 'Nisbətən güclü',
  adequate: 'Adekvat',
  relatively_adequate: 'Nisbətən adekvat',
  weak: 'Zəif və ya yox',
}

// Risk / insident səviyyəsi və ciddiliyi
export const LEVEL_AZ: Record<string, string> = {
  minimal: 'Minimal',
  low: 'Aşağı',
  medium: 'Orta',
  high: 'Yüksək',
  critical: 'Kritik',
}

// Öhdəlik uyğunluq statusu
export const OBLIGATION_STATUS_AZ: Record<string, string> = {
  compliant: 'Uyğun',
  non_compliant: 'Uyğun deyil',
  under_review: 'Baxışda',
  not_applicable: 'Tətbiq olunmur',
}

// Risk reyestri statusu (6 mərhələli model)
export const RISK_STATUS_AZ: Record<string, string> = {
  backlog: 'Növbədə',
  open: 'Açıq',
  in_progress: 'İcrada',
  review: 'Baxışda',
  solved: 'Həll olunub',
  done: 'Bağlanıb',
}

// İnsident statusu və iş axını mərhələsi
export const INCIDENT_STATUS_AZ: Record<string, string> = {
  open: 'Açıq',
  backlog: 'Növbədə',
  in_progress: 'İcrada',
  review_by_risk_manager: 'Risk meneceri baxışında',
  review: 'Baxışda',
  solved: 'Həll olunub',
  done: 'Bağlanıb',
  closed: 'Bağlanıb',
}

export const WORKFLOW_STAGE_AZ: Record<string, string> = {
  intake: 'Qəbul',
  investigation: 'Araşdırma',
  resolution: 'Həll',
  closure: 'Bağlanma',
}

// Dövrilik
export const FREQUENCY_AZ: Record<string, string> = {
  continuous: 'Fasiləsiz',
  daily: 'Gündəlik',
  weekly: 'Həftəlik',
  monthly: 'Aylıq',
  quarterly: 'Rüblük',
  annual: 'İllik',
  ad_hoc: 'Ad-hoc',
}

export const monitoringStatusAz = (v?: string | null) => look(MONITORING_STATUS_AZ, v)
export const effectivenessAz    = (v?: string | null) => look(EFFECTIVENESS_AZ, v)
export const controlTestAz      = (v?: string | null) => look(CONTROL_TEST_AZ, v)
export const controlRatingAz    = (v?: string | null) => look(CONTROL_RATING_AZ, v)
export const levelAz            = (v?: string | null) => look(LEVEL_AZ, v)
export const obligationStatusAz = (v?: string | null) => look(OBLIGATION_STATUS_AZ, v)
export const riskStatusAz       = (v?: string | null) => look(RISK_STATUS_AZ, v)
export const incidentStatusAz   = (v?: string | null) => look(INCIDENT_STATUS_AZ, v)
export const workflowStageAz    = (v?: string | null) => look(WORKFLOW_STAGE_AZ, v)
export const frequencyAz        = (v?: string | null) => look(FREQUENCY_AZ, v)
