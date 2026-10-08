import { NextResponse } from 'next/server'

// Diaqnostika: deploy olunmuş build-də Supabase env dəyişənləri varmı?
// Yalnız BOOLEAN qaytarır — açar/URL heç vaxt açıqlanmır.
export const dynamic = 'force-dynamic'

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // phase67: /api/admin/users service role açarı olmadan 501 qaytarır. Həmin route
  // konfiqurasiya vəziyyətini qəsdən açmır (əvvəl autentifikasiya yoxlayır), ona görə
  // "Vercel env-ə əlavə olundumu?" sualına cavab verən yeganə yer buradır.
  // Yenə yalnız BOOLEAN — açarın özü heç vaxt qaytarılmır.
  const serviceRoleKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  return NextResponse.json({
    supabaseUrlSet: !!url,
    anonKeySet: !!key,
    serviceRoleKeySet,
    urlHost: url ? new URL(url).host : null,   // yalnız host, açar deyil
    mode: url && key ? 'supabase' : 'MOCK — giriş parolsuz demo hesaba düşür',
    adminProvisioning: serviceRoleKeySet
      ? 'ready'
      : 'SUPABASE_SERVICE_ROLE_KEY yoxdur — Settings → Users → Add user 501 qaytaracaq',
  })
}
