// Server-only Resend email helper.
// Required env (local: .env.local, prod: Vercel → Settings → Env):
//   RESEND_API_KEY  Resend API key (server-only, never NEXT_PUBLIC_)
//   EMAIL_FROM      verified sender, e.g. "GRCell <noreply@grcell.com>"

import { Resend } from 'resend'

const DEFAULT_FROM = 'GRCell <noreply@grcell.com>'

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

interface SendResult {
  ok: boolean
  id?: string
  error?: string
}

interface WelcomeEmailInput {
  to: string
  fullName: string
  company: string
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' }
  }

  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM || DEFAULT_FROM

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: 'GRCell hesabınız yaradıldı',
    html: renderWelcomeHtml(input),
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true, id: data?.id }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderWelcomeHtml(input: WelcomeEmailInput): string {
  const name = escapeHtml(input.fullName)
  const company = escapeHtml(input.company)
  return `
<div style="background:#0b1220;padding:32px 16px;font-family:Segoe UI,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#111a2c;border:1px solid #1e293b;border-radius:16px;padding:32px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
      <span style="font-size:18px;font-weight:800;color:#f8fafc">🛡️ GRCell</span>
    </div>
    <h1 style="margin:0 0 12px;font-size:20px;color:#f8fafc">Xoş gəlmisiniz, ${name}!</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#94a3b8">
      <strong style="color:#e2e8f0">${company}</strong> üçün GRCell hesabınız uğurla yaradıldı.
      Risk idarəetməsi, RCSA, uyğunluq öhdəlikləri və insidentləri artıq bir platformadan idarə edə bilərsiniz.
    </p>
    <a href="https://grcell.com/login"
       style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:12px;margin:8px 0 24px">
      Platformaya daxil ol
    </a>
    <p style="margin:0;font-size:12px;color:#64748b;border-top:1px solid #1e293b;padding-top:16px">
      Bu e-poçt grcell.com-da hesab yaradıldığı üçün göndərilib. Əgər bu siz deyilsinizsə, bu mesajı nəzərə almayın.
    </p>
  </div>
</div>`
}
