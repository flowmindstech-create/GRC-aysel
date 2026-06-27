// Single source of truth for risk categories.
// Add/rename here only — every consumer (form, table, filters, dashboard, charts)
// derives its options and labels from this list.

export const RISK_CATEGORIES = [
  { value: 'financial', label: 'Maliyyə' },
  { value: 'operational', label: 'Əməliyyat' },
  { value: 'reputation', label: 'Reputasiya' },
  { value: 'information_security', label: 'İnformasiya Təhlükəsizliyi' },
  { value: 'strategic', label: 'Strateji' },
  { value: 'compliance', label: 'Komplayens' },
] as const

export type RiskCategory = (typeof RISK_CATEGORIES)[number]['value']

export const RISK_CATEGORY_VALUES = RISK_CATEGORIES.map((c) => c.value) as RiskCategory[]

export const CATEGORY_LABELS: Record<RiskCategory, string> = Object.fromEntries(
  RISK_CATEGORIES.map((c) => [c.value, c.label])
) as Record<RiskCategory, string>

// Maps removed/renamed legacy category values to the current set.
// Used when reading old DB/localStorage rows so filters and charts never break.
const LEGACY_CATEGORY_MAP: Record<string, RiskCategory> = {
  cybersecurity: 'information_security',
  legal_compliance: 'compliance',
  legal: 'compliance',
  hr: 'operational',
}

export function normalizeCategory(value: string | undefined | null): RiskCategory {
  if (!value) return 'operational'
  if (RISK_CATEGORY_VALUES.includes(value as RiskCategory)) return value as RiskCategory
  return LEGACY_CATEGORY_MAP[value] ?? 'operational'
}

export function categoryLabel(value: string | undefined | null): string {
  return CATEGORY_LABELS[normalizeCategory(value)]
}
