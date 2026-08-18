// Single source of truth for the incident category taxonomy.
// Incident categories are sub-categories of the parent risk category — the
// intake form shows only the sub-categories belonging to the selected risk
// category. Edit here only; the form derives its options from this map.

import type { RiskCategory } from './risk-categories'

const OTHER = 'Other'

export const INCIDENT_TAXONOMY: Record<RiskCategory, string[]> = {
  financial: [
    'Financial loss / Incorrect payment',
    'Accounting / reporting error',
    'Budget violation',
    OTHER,
  ],
  operational: [
    'Operational error / Procedure violation',
    'Internal fraud',
    'Third party / Vendor',
    'Process / system outage',
    OTHER,
  ],
  reputation: [
    'Media / public complaint',
    'Customer dissatisfaction',
    'Brand damage',
    OTHER,
  ],
  information_security: [
    'Cybersecurity / Data breach',
    'Confidentiality breach',
    'Unauthorized access',
    OTHER,
  ],
  strategic: [
    'Strategic decision risk',
    'Market / competition change',
    OTHER,
  ],
  compliance: [
    'Compliance breach',
    'Regulatory requirement violation',
    'AML / sanctions',
    OTHER,
  ],
  // Bazar Riski — RAS(RİB) sənədində ayrıca risk sahəsi (Qarantiya Fondu göstəriciləri)
  market: [
    'Reserve adequacy breach',
    'Guarantee Fund coverage shortfall',
    'Liquidity shortfall in the Fund',
    'Adverse market movement',
    OTHER,
  ],
}

// Sub-categories for a given risk category (empty array if none selected).
export function incidentSubcategories(riskCategory: RiskCategory | undefined): string[] {
  if (!riskCategory) return []
  return INCIDENT_TAXONOMY[riskCategory] ?? []
}
