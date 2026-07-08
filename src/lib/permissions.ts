// ─── Rol-əsaslı icazə nüvəsi (RBAC) ──────────────────────────────────────────
// Səviyyə-əsaslı model: hər rola rütbə rəqəmi verilir, böyük rəqəm çox icazə deməkdir.
// Hər əməliyyat (capability) üçün minimum tələb olunan səviyyə var.
// Bu qat SAF məntiqdir — DB qıfılı Supabase RLS-dədir (bax supabase-phase45-rbac.sql).
// UI burada gizlədir; əsl təhlükəsizlik RLS-də dublikat olunur.

import type { UserRole, UserProfile } from '@/types'

// ── Rütbə səviyyələri ──────────────────────────────────────────────────────
// Aralarda boşluq (10-luq addım) qoyulub ki gələcəkdə yeni rol asan əlavə olunsun.
export const ROLE_LEVEL: Record<UserRole, number> = {
  super_admin:  100,  // hər şey + silmə + istifadəçi/rol idarəsi + hər yerə giriş
  admin:         80,  // bir səviyyə aşağı: yarat/redaktə/təsdiq, amma silmə və user idarəsi yox
  risk_manager:  60,  // risk/compliance əməliyyatları: yarat/redaktə
  auditor:       40,  // audit + test icrası + export, amma yaratma məhdud
  employee:      20,  // yalnız oxuma + öz təqdimatları
}

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin:  'Super Admin',
  admin:        'Administrator',
  risk_manager: 'Risk Manager',
  auditor:      'Auditor',
  employee:     'Əməkdaş',
}

// Rolların yuxarıdan-aşağı sıralanması (UI dropdown-ları üçün)
export const ROLE_ORDER: UserRole[] = ['super_admin', 'admin', 'risk_manager', 'auditor', 'employee']

// ── Əməliyyatlar (capabilities) və tələb olunan minimum səviyyə ──────────────
export type Capability =
  | 'read'            // istənilən modulu oxu
  | 'export'          // reyestrləri ixrac et (CSV/XLSX/PDF)
  | 'create'          // yeni qeyd yarat
  | 'edit'            // mövcud qeydi redaktə et
  | 'run_test'        // nəzarət testini icra et (Control Checklist)
  | 'approve'         // təsdiq (kontrol, treatment, exec approval)
  | 'delete'          // qeyd sil
  | 'manage_settings' // org strukturu / konfiqurasiya
  | 'manage_users'    // istifadəçi yarat + rol təyin et

export const CAPABILITY_MIN_LEVEL: Record<Capability, number> = {
  read:            20,   // employee+
  export:          40,   // auditor+
  run_test:        40,   // auditor+
  create:          60,   // risk_manager+
  edit:            60,   // risk_manager+
  approve:         80,   // admin+
  manage_settings: 80,   // admin+
  delete:         100,   // yalnız super_admin
  manage_users:   100,   // yalnız super_admin
}

// ── Helperlər ────────────────────────────────────────────────────────────────

/** Rolun rütbə səviyyəsini qaytarır (naməlum rol → 0). */
export function roleLevel(role?: UserRole | null): number {
  return role ? (ROLE_LEVEL[role] ?? 0) : 0
}

/** Profil verilmiş əməliyyata icazəlidirmi? */
export function can(profile: Pick<UserProfile, 'role'> | null | undefined, action: Capability): boolean {
  return roleLevel(profile?.role) >= CAPABILITY_MIN_LEVEL[action]
}

/** Profilin rütbəsi verilmiş roldan bərabər/yuxarıdırmı? (məs. atLeast(p, 'admin')) */
export function atLeast(profile: Pick<UserProfile, 'role'> | null | undefined, role: UserRole): boolean {
  return roleLevel(profile?.role) >= ROLE_LEVEL[role]
}

export function isSuperAdmin(profile: Pick<UserProfile, 'role'> | null | undefined): boolean {
  return profile?.role === 'super_admin'
}
