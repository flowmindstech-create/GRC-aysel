import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

// Next.js 16: "proxy" replaces "middleware" — export name must be "proxy"
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

// api/ excluded: API routes carry their own auth (bearer secret / rate limit)
export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}