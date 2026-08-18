import { NextResponse } from 'next/server'

// Diaqnostika: deploy olunmuş build-də Supabase env dəyişənləri varmı?
// Yalnız BOOLEAN qaytarır — açar/URL heç vaxt açıqlanmır.
export const dynamic = 'force-dynamic'

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return NextResponse.json({
    supabaseUrlSet: !!url,
    anonKeySet: !!key,
    urlHost: url ? new URL(url).host : null,   // yalnız host, açar deyil
    mode: url && key ? 'supabase' : 'MOCK — giriş parolsuz demo hesaba düşür',
  })
}
