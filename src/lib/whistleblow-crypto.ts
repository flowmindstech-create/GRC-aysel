// Whistleblowing confidentiality — AES-GCM encryption keyed by the officer
// access code. The code is never stored; only its derived key (held transiently
// in the officer's session) can decrypt complaint bodies. Works in the browser
// and in Node 20+ route handlers (both expose Web Crypto via globalThis.crypto).

const ENC = new TextEncoder()
const DEC = new TextDecoder()
// Fixed application salt so the same code derives the same key on server & client.
const SALT = ENC.encode('riskshield-whistleblow-v1')
const ITERATIONS = 100_000

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function deriveKey(code: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', ENC.encode(code) as BufferSource, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBody(code: string, plaintext: string): Promise<{ iv: string; cipher: string }> {
  const key = await deriveKey(code)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ENC.encode(plaintext) as BufferSource)
  return { iv: toB64(iv.buffer), cipher: toB64(cipher) }
}

export async function decryptBody(code: string, iv: string, cipher: string): Promise<string> {
  const key = await deriveKey(code)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) as BufferSource }, key, fromB64(cipher) as BufferSource)
  return DEC.decode(plain)
}
