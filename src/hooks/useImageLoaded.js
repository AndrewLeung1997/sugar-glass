import { useState, useEffect } from 'react'

// 預載圖片，回傳是否已載入完成。已 cache 嘅圖片會即時返回 true。
export function useImageLoaded(src) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!src) return
    setLoaded(false)
    let cancelled = false
    const img = new Image()
    img.onload = () => { if (!cancelled) setLoaded(true) }
    img.onerror = () => { if (!cancelled) setLoaded(true) } // 載入失敗都當完成，避免一直 skeleton
    img.src = src
    // 若瀏覽器已 cache，onload 會好快觸發
    return () => { cancelled = true }
  }, [src])

  return loaded
}
