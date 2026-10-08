// Super Admin istifadəçi provisioning endpoint-i (invite-only qeydiyyat).
//
// Açıq signup bağlandıqdan sonra hesabları yalnız bu route yaradır.
// İki qat qıfıl:
//   1) Çağıranın Supabase sessiyası oxunur və profilinin rolu super_admin olmalıdır.
//   2) Yaradıla bilən rollar ağ siyahı ilə məhdudlaşır (hazırda yalnız risk_manager).
// Service role açarı yalnız burada, server tərəfdə istifadə olunur.

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminConfigured } from '@/lib/supabase/admin'
import type { UserRole } from '@/types'

export const dynamic = 'force-dynamic'

// İlk mərhələ: super_admin yalnız Risk Manager yarada bilər.
// Yeni rol açılanda bura əlavə etmək kifayətdir — UI siyahını buradan almır,
// ona görə AddUserDialog-dakı seçimi də genişləndirmək lazımdır.
const CREATABLE_ROLES = ['risk_manager'] as const

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(CREATABLE_ROLES),
})

// Oxunaqlı, lakin güclü müvəqqəti parol: 4 blok × 4 simvol.
// Qarışdırıla bilən simvollar (0/O, 1/l/I) çıxarılıb — parol şifahi/yazılı ötürülür.
const PWD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
function generateTempPassword(): string {
  const bytes = new Uint32Array(16)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, b => PWD_ALPHABET[b % PWD_ALPHABET.length])
  return [0, 4, 8, 12].map(i => chars.slice(i, i + 4).join('')).join('-')
}

export async function POST(request: Request): Promise<Response> {
  // ── 1) Çağıran kimdir? ────────────────────────────────────────────────────
  // Konfiqurasiya yoxlaması QƏSDƏN autentifikasiyadan SONRA gəlir — kənar adam
  // serverin env vəziyyəti barədə məlumat almasın.
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ ok: false, message: 'Not signed in' }, { status: 401 })
  }

  const { data: callerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, org_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !callerProfile) {
    console.error('[admin/users] caller profile not found:', profileError)
    return Response.json({ ok: false, message: 'Profile not found' }, { status: 403 })
  }
  if (callerProfile.role !== 'super_admin') {
    return Response.json({ ok: false, message: 'Super Admin only' }, { status: 403 })
  }

  if (!isAdminConfigured()) {
    return Response.json(
      { ok: false, message: 'Server is not configured: SUPABASE_SERVICE_ROLE_KEY is missing.' },
      { status: 501 },
    )
  }

  // ── 2) Giriş validasiyası ─────────────────────────────────────────────────
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ ok: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }
  const { email, full_name, role } = parsed.data

  // ── 3) Auth istifadəçisini yarat ──────────────────────────────────────────
  const admin = createAdminClient()
  const tempPassword = generateTempPassword()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    // Super Admin şəxsən yaradır — e-poçt təsdiqi gözlənilmir, hesab dərhal aktivdir.
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createError || !created?.user) {
    const msg = createError?.message ?? 'User could not be created'
    const isDuplicate = /already (been )?registered|already exists|duplicate/i.test(msg)
    console.error('[admin/users] createUser failed:', createError)
    return Response.json(
      { ok: false, message: isDuplicate ? 'This email is already registered' : msg },
      { status: isDuplicate ? 409 : 502 },
    )
  }

  const newUserId = created.user.id

  // ── 4) Profil sətri — çağıranın org-una bağlanır ──────────────────────────
  // upsert: `on_auth_user_created` trigger-i aktivdirsə profil artıq 'employee'
  // kimi yaradılıb və bu UPDATE olur (phase67 trigger istisnası buna icazə verir);
  // trigger yoxdursa adi INSERT-dir.
  const { error: upsertError } = await admin
    .from('profiles')
    .upsert({
      id: newUserId,
      org_id: callerProfile.org_id,
      full_name,
      email,
      role: role as UserRole,
      is_active: true,
    }, { onConflict: 'id' })

  if (upsertError) {
    // Geri al — yetim auth istifadəçisi qalmasın.
    // (Məhz bu problem keçmişdə profilsiz `grcell.diag.*` hesabları yaratmışdı.)
    const { error: rollbackError } = await admin.auth.admin.deleteUser(newUserId)
    console.error('[admin/users] profile upsert failed, rolled back:', upsertError, rollbackError)
    return Response.json(
      {
        ok: false,
        message: rollbackError
          ? 'Profile could not be created and the auth user could not be rolled back. Check the user list.'
          : 'Profile could not be created — no user was created.',
      },
      { status: 502 },
    )
  }

  // ── 5) Audit izi ──────────────────────────────────────────────────────────
  // Uğursuzluq əsas əməliyyatı ləğv etmir (istifadəçi artıq yaradılıb), amma
  // səssiz qalmır: cavabda `audit_logged` sahəsi ilə bildirilir.
  const { error: activityError } = await admin.from('activities').insert({
    id: crypto.randomUUID(),
    org_id: callerProfile.org_id,
    user_id: callerProfile.id,
    action: `created user: ${full_name} (${role})`,
    entity_type: 'user',
    entity_id: newUserId,
    entity_title: full_name,
    created_at: new Date().toISOString(),
  })
  if (activityError) console.error('[admin/users] activity log failed:', activityError)

  return Response.json({
    ok: true,
    user: { id: newUserId, email, full_name, role, org_id: callerProfile.org_id },
    // Müvəqqəti parol YALNIZ bu cavabda qaytarılır, heç yerdə saxlanılmır.
    temp_password: tempPassword,
    audit_logged: !activityError,
  })
}
