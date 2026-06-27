// Single source of truth for the incident category taxonomy.
// Incident categories are sub-categories of the parent risk category — the
// intake form shows only the sub-categories belonging to the selected risk
// category. Edit here only; the form derives its options from this map.

import type { RiskCategory } from './risk-categories'

const OTHER = 'Digər (Other)'

export const INCIDENT_TAXONOMY: Record<RiskCategory, string[]> = {
  financial: [
    'Maliyyə itkisi / Yanlış ödəniş',
    'Mühasibat / hesabat səhvi',
    'Büdcə pozuntusu',
    OTHER,
  ],
  operational: [
    'Əməliyyat səhvi / Prosedur pozuntusu',
    'Daxili saxtakarlıq',
    'Üçüncü tərəf / Vendor',
    'Proses / sistem dayanması',
    OTHER,
  ],
  reputation: [
    'Media / ictimai şikayət',
    'Müştəri narazılığı',
    'Brend zərəri',
    OTHER,
  ],
  information_security: [
    'Kibertəhlükəsizlik / Data breach',
    'Məxfilik pozuntusu',
    'İcazəsiz giriş',
    OTHER,
  ],
  strategic: [
    'Strateji qərar riski',
    'Bazar / rəqabət dəyişikliyi',
    OTHER,
  ],
  compliance: [
    'Uyğunluq pozuntusu (Compliance breach)',
    'Tənzimləyici tələb pozuntusu',
    'AML / sanksiya',
    OTHER,
  ],
}

// Sub-categories for a given risk category (empty array if none selected).
export function incidentSubcategories(riskCategory: RiskCategory | undefined): string[] {
  if (!riskCategory) return []
  return INCIDENT_TAXONOMY[riskCategory] ?? []
}
