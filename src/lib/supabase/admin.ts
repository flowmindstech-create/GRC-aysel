import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase klienti — YALNIZ SERVER.
// Bu açar bütün RLS-i keçir, ona görə brauzerə heç vaxt düşməməlidir:
// `SUPABASE_SERVICE_ROLE_KEY` NEXT_PUBLIC_ prefiksi OLMADAN saxlanılır, yəni
// Next.js onu klient bundle-ına daxil etmir. Aşağıdakı runtime yoxlaması
// faylın səhvən bir klient komponentindən import edilməsini erkən tutur.

export function isAdminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function createAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient() yalnız serverdə çağırıla bilər')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY konfiqurasiya olunmayıb')
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
