// ─── Görünürlük qaydaları — TƏK MƏNBƏ ────────────────────────────────────────
// Kim hansı qeydi görür? Bu sual əvvəllər 4 ayrı yerdə (Sidebar, MobileNav,
// IncidentTable, RiskTable, DashboardClient) təkrar yazılmışdı və zamanla
// fərqlənmişdi — nəticədə sidebar-dakı badge cədvəldəki sətir sayı ilə
// uyğunlaşmırdı (badge 2 göstərir, cədvəl boş).
//
// Qayda burada bir dəfə yazılır; siyahı da, sayğac da eyni funksiyadan keçir.
// DİQQƏT: bu qat yalnız UI-dır — əsl qoruma Supabase RLS-dədir.

import type { Incident, Risk, UserProfile } from '@/types'
import { atLeast } from './permissions'

type Actor = UserProfile | null | undefined

// ── İnsidentlər ──────────────────────────────────────────────────────────────
// Məxfilik: insidenti yalnız risk komandası (risk_manager+), bildirən şəxs,
// təyin olunan araşdırma rəhbəri/üzvü və həll üzrə məsul görə bilər.
export function canSeeIncident(profile: Actor, incident: Incident): boolean {
  if (atLeast(profile, 'risk_manager')) return true
  const myId = profile?.id
  const myName = profile?.full_name
  if (myId && (incident.reported_by === myId || incident.assigned_to === myId || incident.resolution_assignee === myId)) {
    return true
  }
  if (myName && (
    incident.reporter_person === myName
    || incident.investigation_lead === myName
    || (incident.investigation_members ?? []).includes(myName)
  )) {
    return true
  }
  return false
}

/** Bağlanmamış insident (badge və dashboard sayğacı üçün) */
export function isOpenIncident(incident: Incident): boolean {
  return incident.status !== 'done' && incident.status !== 'closed'
}

/** Sidebar/MobileNav badge-i: yalnız istifadəçinin görə bildiyi açıq insidentlər */
export function visibleOpenIncidents(profile: Actor, incidents: Incident[]): Incident[] {
  return incidents.filter(i => isOpenIncident(i) && canSeeIncident(profile, i))
}

// ── Risklər ──────────────────────────────────────────────────────────────────
// Risk komandası (auditor+) hamısını görür; adi əməkdaş sahibi olduğu VƏ YA
// özünün yaratdığı riskləri görür (created_by — phase49).
export function canSeeRisk(profile: Actor, risk: Risk): boolean {
  if (atLeast(profile, 'auditor')) return true
  const myId = profile?.id
  const myName = profile?.full_name
  if (myId && (risk.owner_id === myId || risk.created_by === myId)) return true
  if (myName && (risk.owner_name === myName || risk.created_by_name === myName)) return true
  return false
}

/** Dashboard "Open Risks" kartı üçün */
export function isOpenRisk(risk: Risk): boolean {
  return risk.status === 'open' || risk.status === 'in_progress'
}

export function visibleOpenRisks(profile: Actor, risks: Risk[]): Risk[] {
  return risks.filter(r => isOpenRisk(r) && canSeeRisk(profile, r))
}
