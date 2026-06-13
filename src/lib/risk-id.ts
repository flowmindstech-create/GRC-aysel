import type { OrgUnit, Risk } from '@/types'

// Derive a short department code: explicit `code` field, else initials of the name.
export function orgUnitCode(unit: OrgUnit | undefined): string {
  if (unit?.code && unit.code.trim()) return unit.code.trim().toUpperCase()
  if (unit?.name) {
    const initials = unit.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
    if (initials) return initials
  }
  return 'GEN'
}

/**
 * Generate a department-based unique Risk ID: <DEPTCODE>-<YEAR>-<NNN>.
 * The sequence is the count of existing risks already sharing the same
 * <DEPTCODE>-<YEAR> prefix, plus one (zero-padded to 3 digits).
 */
export function generateRiskCode(
  deptCode: string,
  existingRisks: Risk[],
  year: number = new Date().getFullYear()
): string {
  const prefix = `${deptCode}-${year}-`
  let max = 0
  for (const r of existingRisks) {
    if (r.risk_code?.startsWith(prefix)) {
      const seq = parseInt(r.risk_code.slice(prefix.length), 10)
      if (!Number.isNaN(seq) && seq > max) max = seq
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}
