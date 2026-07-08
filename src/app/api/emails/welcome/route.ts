// Welcome email endpoint — called right after a successful sign-up.
// Sends a Resend welcome email to the new account owner.
// Public endpoint by necessity (the user has no session yet at call time),
// so it is defended with schema validation + a light per-IP rate limit.

import { z } from 'zod'
import { isEmailConfigured, sendWelcomeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().email().max(254),
  full_name: z.string().min(2).max(120),
  company: z.string().min(2).max(120),
})

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_SENDS = 5

const sendLog = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (sendLog.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_SENDS) {
    sendLog.set(ip, recent)
    return true
  }
  sendLog.set(ip, [...recent, now])
  return false
}

export async function POST(request: Request): Promise<Response> {
  if (!isEmailConfigured()) {
    return Response.json(
      { ok: false, message: 'Email is not configured. Set RESEND_API_KEY.' },
      { status: 501 },
    )
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return Response.json({ ok: false, message: 'Too many requests' }, { status: 429 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ ok: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ ok: false, message: 'Invalid input' }, { status: 400 })
  }

  const result = await sendWelcomeEmail({
    to: parsed.data.email,
    fullName: parsed.data.full_name,
    company: parsed.data.company,
  })

  if (!result.ok) {
    console.error('[emails/welcome] send failed:', result.error)
    return Response.json({ ok: false, message: 'Email send failed' }, { status: 502 })
  }

  return Response.json({ ok: true, id: result.id })
}