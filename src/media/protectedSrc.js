import { getBlob, ref } from 'firebase/storage'
import { firebaseReady, getBucket } from '../firebase.js'

const cache = new Map()

export function storagePathFromUrl(src) {
  if (!src) return ''
  if (!/^https?:\/\//i.test(src)) return String(src).replace(/^\//, '')
  try {
    const u = new URL(src)
    const marker = '/o/'
    const i = u.pathname.indexOf(marker)
    if (i < 0) return ''
    return decodeURIComponent(u.pathname.slice(i + marker.length))
  } catch {
    return ''
  }
}

export async function resolveProtectedSrc(src) {
  if (!src) return ''
  if (src.startsWith('blob:') || src.startsWith('data:')) return src
  if (cache.has(src)) return cache.get(src)

  const path = storagePathFromUrl(src)
  const bucket = getBucket()
  if (!firebaseReady || !bucket || !path) return src

  try {
    const blob = await getBlob(ref(bucket, path))
    const url = URL.createObjectURL(blob)
    cache.set(src, url)
    return url
  } catch {
    return src
  }
}
