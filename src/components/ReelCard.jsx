import { useEffect, useRef, useState } from 'react'

export default function ReelCard({ reel, profile, onOpen }) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
        el.play().catch(() => {})
      } else {
        el.pause()
      }
    }, { threshold: [0.55] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="card reel-card" onClick={onOpen}>
      <div className="reel-media">
        <video
          ref={videoRef}
          src={reel.src}
          poster={reel.poster}
          muted={muted}
          loop
          playsInline
          preload="metadata"
        />
        <div className="reel-badge">Reel</div>
        <button
          className="reel-mute"
          onClick={(e) => { e.stopPropagation(); setMuted(m => !m) }}
          aria-label={muted ? '取消靜音' : '靜音'}
        >{muted ? '🔇' : '🔊'}</button>
        <div className="reel-meta">
          <div className="reel-name">{profile?.name || 'Velvet'} <span>{profile ? `${profile.age} · ${profile.city}` : ''}</span></div>
          <div className="reel-caption">{reel.caption}</div>
        </div>
      </div>
    </div>
  )
}
