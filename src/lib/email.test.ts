import { describe, it, expect, afterEach } from 'vitest'
import { isEmailConfigured, sendWelcomeEmail, escapeHtml, renderWelcomeHtml } from './email'

// Test planı 2. İnteqrasiya — elektron poçt bildirişləri (Resend)
//            + 3. Təhlükəsizlik — email məzmununda XSS/HTML escaping

const savedKey = process.env.RESEND_API_KEY
afterEach(() => {
  if (savedKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = savedKey
})

describe('email — konfiqurasiya', () => {
  it('RESEND_API_KEY yoxdursa isEmailConfigured=false', () => {
    delete process.env.RESEND_API_KEY
    expect(isEmailConfigured()).toBe(false)
  })

  it('RESEND_API_KEY varsa isEmailConfigured=true', () => {
    process.env.RESEND_API_KEY = 're_test_key'
    expect(isEmailConfigured()).toBe(true)
  })

  it('açar yoxdursa göndərmə şəbəkəyə çıxmadan xəta qaytarır (onboarding bloklanmır)', async () => {
    delete process.env.RESEND_API_KEY
    const res = await sendWelcomeEmail({ to: 'a@b.com', fullName: 'Ali', company: 'GRCell' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/RESEND_API_KEY/)
  })
})

describe('email — HTML məzmunu və XSS escaping', () => {
  it('escapeHtml təhlükəli simvolları neytrallaşdırır', () => {
    expect(escapeHtml('<script>&"')).toBe('&lt;script&gt;&amp;&quot;')
  })

  it('welcome məktubunda ad və şirkət görünür', () => {
    const html = renderWelcomeHtml({ to: 'x@y.com', fullName: 'Aysel', company: 'İcbari Sığorta' })
    expect(html).toContain('Aysel')
    expect(html).toContain('İcbari Sığorta')
  })

  it('ad sahəsindəki XSS payload escape olunur (raw <script> yoxdur)', () => {
    const html = renderWelcomeHtml({ to: 'x@y.com', fullName: '<script>alert(1)</script>', company: 'GRCell' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('login linki grcell.com-a gedir', () => {
    const html = renderWelcomeHtml({ to: 'x@y.com', fullName: 'A', company: 'B' })
    expect(html).toContain('https://grcell.com/login')
  })
})
