import { useState, useEffect, useRef, useCallback } from 'react'

// 每個瀏覽器產生一個固定會員編號，用嚟做浮水印追蹤
export function getViewerId() {
  let id = ''
  try { id = localStorage.getItem('sg_viewer_id') } catch {}
  if (!id) {
    id = 'M' + Math.random().toString(36).slice(2, 8).toUpperCase()
    try { localStorage.setItem('sg_viewer_id', id) } catch {}
  }
  return id
}

/**
 * 防截圖守衛
 * - 偵測截圖快捷鍵（PrintScreen / Mac ⌘⇧3-6 / Ctrl+PrintScreen）
 * - 視窗失焦時模糊（用戶可能開緊截圖工具）
 * - 分頁隱藏時模糊
 * 回傳 { guarded, warning, flash } 供元件控制模糊同警告
 */
export function useScreenshotGuard() {
  const [guarded, setGuarded] = useState(false)
  const [warning, setWarning] = useState('')
  const [flash, setFlash] = useState(0) // 每次觸發 +1，用嚟重新播動畫
  const timer = useRef(null)

  const trigger = useCallback((msg) => {
    setGuarded(true)
    setWarning(msg)
    setFlash(f => f + 1)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setGuarded(false), 2800)
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const k = e.key
      if (k === 'PrintScreen') { e.preventDefault(); trigger('⚠ 偵測到截圖操作，相片已即時模糊') }
      if (e.metaKey && e.shiftKey && ['3', '4', '5', '6'].includes(k)) {
        e.preventDefault(); trigger('⚠ 偵測到截圖操作，相片已即時模糊')
      }
      if (e.ctrlKey && k === 'PrintScreen') { e.preventDefault(); trigger('⚠ 偵測到截圖操作，相片已即時模糊') }
    }
    // 部分瀏覽器 PrintScreen 只喺 keyup 觸發
    const onKeyUp = (e) => {
      if (e.key === 'PrintScreen') trigger('⚠ 偵測到截圖操作，相片已即時模糊')
    }
    const onBlur = () => setGuarded(true)
    const onFocus = () => { setGuarded(false); setWarning('') }
    const onVis = () => setGuarded(document.hidden)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      clearTimeout(timer.current)
    }
  }, [trigger])

  return { guarded, warning, flash }
}

// 產生重複斜向浮水印嘅 SVG data URI
export function watermarkDataUri(text) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='190'>` +
    `<text x='30' y='100' fill='rgba(255,255,255,0.22)' font-size='15' font-family='sans-serif' ` +
    `font-weight='600' transform='rotate(-28 170 95)' letter-spacing='1'>${text}</text>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
