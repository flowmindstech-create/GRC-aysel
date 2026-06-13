import type { OrgUnit, UserProfile } from '@/types'

export interface ResolvedOwner {
  owner_id: string
  owner_name: string
  owner_role: string
  owner_dept: string
}

const EMPTY_OWNER: ResolvedOwner = {
  owner_id: '',
  owner_name: '',
  owner_role: '',
  owner_dept: '',
}

/**
 * Deterministic department -> owner resolution.
 * Given the selected org unit and the profile list, returns the head person,
 * their role title, and the department name to auto-fill the risk form.
 */
export function resolveOwnerFromUnit(
  unit: OrgUnit | undefined,
  profiles: UserProfile[]
): ResolvedOwner {
  if (!unit) return { ...EMPTY_OWNER }
  const head = profiles.find((p) => p.id === unit.head_user_id)
  return {
    owner_id: head?.id ?? '',
    owner_name: head?.full_name ?? '',
    owner_role: unit.head_role ?? '',
    owner_dept: unit.name,
  }
}
