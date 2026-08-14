// UAT / access policy — komponent və DB-də tətbiq olunan qaydaların
// tək mənbədən (primitivlər üzərində) ifadəsi. Testlərdə UAT ssenariləri
// bu funksiyalar üzərində yoxlanılır; komponentlər eyni primitivlərdən
// (can/atLeast/isSuperAdmin) istifadə etdiyi üçün nəticə üst-üstə düşür.

import type { UserRole, UserProfile, Risk } from '@/types'
import { can, atLeast, isSuperAdmin } from './permissions'

type Actor = Pick<UserProfile, 'role' | 'id' | 'full_name'> | null | undefined

// Yeni yaradılan riskin təsdiq statusu: yalnız super_admin dərhal 'approved',
// başqası 'pending' (maker-checker). DB-də guard_risk_approval bunu məcbur edir.
export function approvalOnCreate(role: UserRole): 'approved' | 'pending' {
  return can({ role }, 'approve') ? 'approved' : 'pending'
}

// Riski görmə hüququ: auditor+ hamısını; adi əməkdaş sahibi VƏ YA yaratdığı.
// (RiskTable filtrinin eyni məntiqi.)
export function canViewRisk(profile: Actor, risk: Pick<Risk, 'owner_id' | 'owner_name' | 'created_by' | 'created_by_name'>): boolean {
  if (atLeast(profile, 'auditor')) return true
  const id = profile?.id
  const name = profile?.full_name
  return (
    risk.owner_id === id ||
    risk.created_by === id ||
    (!!name && (risk.owner_name === name || risk.created_by_name === name))
  )
}

// Təsdiq / redaktə / silmə / status — GRC matrisi
export function canApproveRisk(profile: Actor): boolean { return can(profile, 'approve') }   // super_admin
export function canEditRecord(profile: Actor): boolean { return isSuperAdmin(profile) }        // super_admin
export function canDeleteRecord(profile: Actor): boolean { return can(profile, 'delete') }     // super_admin
export function canChangeRiskStatus(profile: Actor): boolean { return atLeast(profile, 'risk_manager') } // risk komandası
