import { describe, it, expect } from 'vitest'
import { encryptBody, decryptBody, deriveKey } from './whistleblow-crypto'

// Test plan 3. Təhlükəsizlik testləri — məxfilik/şifrələmə (whistleblowing)
describe('whistleblow-crypto', () => {
  it('şifrələnmiş mətn eyni kodla deşifrə olunur (round-trip)', async () => {
    const plaintext = 'Müdir rüşvət alır — sübutlar əlavə edildi.'
    const { iv, cipher } = await encryptBody('gizli-kod-123', plaintext)
    expect(cipher).toBeTruthy()
    const decrypted = await decryptBody('gizli-kod-123', iv, cipher)
    expect(decrypted).toBe(plaintext)
  })

  it('şifrələnmiş mətn orijinaldan fərqlidir (həqiqətən şifrələnir)', async () => {
    const plaintext = 'Məxfi məlumat'
    const { cipher } = await encryptBody('kod', plaintext)
    expect(cipher).not.toContain('Məxfi')
    expect(cipher.length).toBeGreaterThan(0)
  })

  it('səhv kodla deşifrə uğursuz olur', async () => {
    const { iv, cipher } = await encryptBody('düzgün-kod', 'Məxfi mətn')
    await expect(decryptBody('səhv-kod', iv, cipher)).rejects.toThrow()
  })

  it('eyni kod eyni şifrəli mətn verir, fərqli kod fərqli verir', async () => {
    const a = await encryptBody('kod-a', 'Eyni mətn')
    const b = await encryptBody('kod-a', 'Eyni mətn')
    const c = await encryptBody('kod-b', 'Eyni mətn')
    expect(a.iv).not.toBe(b.iv) // random IV → hər dəfə fərqli cipher
    expect(c.cipher).not.toBe(a.cipher)
    // lakin hamısı eyni mətni deşifrə edir
    expect(await decryptBody('kod-a', a.iv, a.cipher)).toBe('Eyni mətn')
    expect(await decryptBody('kod-b', c.iv, c.cipher)).toBe('Eyni mətn')
  })
})
