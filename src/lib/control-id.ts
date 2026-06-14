import type { Control } from '@/types'

/**
 * Generate a human-readable Control ID: CTRL-<YEAR>-<NNN>, sequential within the year.
 * (Same shape as the Risk ID so controls and risks read consistently.)
 */
export function generateControlCode(
  existing: Control[],
  year: number = new Date().getFullYear()
): string {
  const prefix = `CTRL-${year}-`
  let max = 0
  for (const c of existing) {
    if (c.control_id?.startsWith(prefix)) {
      const seq = parseInt(c.control_id.slice(prefix.length), 10)
      if (!Number.isNaN(seq) && seq > max) max = seq
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}
