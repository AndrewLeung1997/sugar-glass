// Service Worker — 圖片 cache-first，其他 request network-first
const CACHE = 'velvet-img-v1'
const IMG_CACHE = 'velvet-images-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)

  // 只處理 GET
  if (req.method !== 'GET') return

  // 圖片：cache-first（含同站 .jpg/.png/.webp 及外部圖片）
  if (req.destination === 'image' || /\.(jpe?g|png|webp|gif|svg)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(req)
        if (cached) return cached
        const fetched = await fetch(req)
        if (fetched.ok) cache.put(req, fetched.clone())
        return fetched
      })
    )
    return
  }

  // HTML / JS / CSS：network-first，fallback cache
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && req.url.startsWith(self.location.origin)) {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(req, clone))
      }
      return res
    }).catch(() => caches.match(req))
  )
})
