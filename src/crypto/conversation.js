const te = new TextEncoder()
const td = new TextDecoder()
const ALG = 'A256GCM'
const VERSION = 1

function bytesToB64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function b64ToBytes(value) {
  const bin = atob(String(value || ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function siteMaterial() {
  const extra = String(import.meta.env.VITE_CONVERSATION_KEY || '')
  return [
    import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    import.meta.env.VITE_FIREBASE_API_KEY || '',
    'velvet-conversation-aes-v1',
    extra,
  ].join('|')
}

async function importAesKey(raw, usages) {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, usages)
}

async function siteKey(usages = ['encrypt', 'decrypt']) {
  const raw = await crypto.subtle.digest('SHA-256', te.encode(siteMaterial()))
  return importAesKey(raw, usages)
}

export async function encryptText(plain, aad = '') {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await siteKey(['encrypt'])
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: te.encode(String(aad || '')) },
    key,
    te.encode(String(plain ?? '')),
  )
  return { v: VERSION, alg: ALG, iv: bytesToB64(iv), ct: bytesToB64(ct) }
}

export async function decryptText(payload, aad = '') {
  if (!payload?.ct || !payload?.iv) throw new Error('密文不完整')
  const key = await siteKey(['decrypt'])
  const pt = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: b64ToBytes(payload.iv),
      additionalData: te.encode(String(aad || '')),
    },
    key,
    b64ToBytes(payload.ct),
  )
  return td.decode(pt)
}

export async function encryptJson(data, aad = '') {
  return encryptText(JSON.stringify(data ?? {}), aad)
}

export async function decryptJson(payload, aad = '') {
  const text = await decryptText(payload, aad)
  return JSON.parse(text)
}

export function isCipher(value) {
  return Boolean(value && value.alg === ALG && value.ct && value.iv)
}
