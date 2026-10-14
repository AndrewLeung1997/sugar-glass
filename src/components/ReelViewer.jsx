import { useEffect, useRef, useState } from 'react'

export default function ReelViewer({ reels, index, onClose, onChange, onOpenProfile, profileOf }) {
  const reel = reels[index]
  const profile = profileOf(reel)
  const videoRef = useRef(null)
  const startY = useRef(null)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    setPaused(false)
    const el = videoRef.current
    if (!el) return
    el.currentTime = 0
    el.play().catch(() => {})
  }, [index])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowUp') onChange(Math.max(0, index - 1))
      if (e.key === 'ArrowDown') onChange(Math.min(reels.length - 1, index + 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [index, reels.length, onChange, onClose])

  const togglePause = () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) { el.play(); setPaused(false) }
    else { el.pause(); setPaused(true) }
  }

  const onPointerDown = (e) => { startY.current = e.clientY }
  const onPointerUp = (e) => {
    if (startY.current == null) return
    const dy = e.clientY - startY.current
    startY.current = null
    if (dy < -50) onChange(Math.min(reels.length - 1, index + 1))
    else if (dy > 50) onChange(Math.max(0, index - 1))
    else togglePause()
  }

  if (!reel) return null

  return (
    <div
      className="reel-viewer"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <video
        ref={videoRef}
        src={reel.src}
        poster={reel.poster}
        muted={muted}
        loop
        playsInline
        autoPlay
      />
      <button className="reel-viewer-close" onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClose() }}>✕</button>
      <button
        className="reel-viewer-mute"
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setMuted(m => !m) }}
      >{muted ? '🔇' : '🔊'}</button>
      {paused && <div className="reel-viewer-pause">▶</div>}
      <div className="reel-viewer-meta">
        <div className="reel-viewer-name">{profile?.name} <span>{profile ? `${profile.age} · ${profile.occupation}` : ''}</span></div>
        <p>{reel.caption}</p>
        {profile && (
          <button
            className="reel-viewer-profile"
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onOpenProfile(profile) }}
          >查看檔案</button>
        )}
      </div>
      <div className="reel-viewer-hint">{index + 1} / {reels.length} · 上滑下一個</div>
    </div>
  )
}
