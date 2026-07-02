// Whistleblowing Gmail ingest endpoint.
// Pulls unread complaint emails from the configured Gmail inbox over IMAP,
// encrypts each body with the officer access code, and stores them as
// whistleblow_reports. Trigger via cron/manual POST.
//
// Required server-only env vars (set in Vercel → Project → Settings → Env):
//   GMAIL_USER              e.g. racabli.aysel@gmail.com
//   GMAIL_APP_PASSWORD      Google App Password (NOT the account password)
//   WHISTLEBLOW_ACCESS_CODE the officer code used to encrypt bodies
//   SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (server insert)
//
// Activation: once the env vars above are set AND the `imapflow` package is
// installed, replace the stub below with the IMAP fetch loop.

export const dynamic = 'force-dynamic'

// Reject anonymous callers when a CRON_SECRET is configured. The ingest route is
// meant to be triggered only by the scheduler (Vercel Cron / manual op), so a
// shared bearer secret keeps the public endpoint from being invoked by anyone.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // not configured yet → don't block the stub
  const auth = request.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
  }

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  const code = process.env.WHISTLEBLOW_ACCESS_CODE

  if (!user || !pass || !code) {
    return Response.json(
      {
        ok: false,
        configured: false,
        message:
          'Whistleblowing Gmail ingest is not configured. Set GMAIL_USER, GMAIL_APP_PASSWORD and WHISTLEBLOW_ACCESS_CODE, then install the mail library to enable live ingestion.',
      },
      { status: 501 },
    )
  }

  // TODO (activate once app password is provided + `imapflow` installed):
  //   1. const { ImapFlow } = await import('imapflow')
  //   2. connect with { host: 'imap.gmail.com', port: 993, secure: true, auth: { user, pass } }
  //   3. for each UNSEEN message: extract subject + text body
  //   4. encrypt body with encryptBody(code, body) from '@/lib/whistleblow-crypto'
  //   5. insert into whistleblow_reports (source: 'email') via Supabase service client
  //   6. mark message seen
  return Response.json(
    { ok: false, configured: true, message: 'Ingest stub: install the IMAP library to activate live Gmail fetching.' },
    { status: 200 },
  )
}

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, endpoint: 'whistleblowing/ingest', method: 'POST to ingest' })
}
