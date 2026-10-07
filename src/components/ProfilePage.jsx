import { useState, useEffect } from 'react'
import { useImageLoaded } from '../hooks/useImageLoaded.js'

function GalleryShot({ src, onOpen }) {
  const loaded = useImageLoaded(src)
  return (
    <div className="shot" style={{ backgroundImage: loaded ? `url(${src})` : 'none' }} onClick={onOpen}>
      {!loaded && <div className="skeleton shimmer" />}
      <div className="zoom-hint">⤢</div>
    </div>
  )
}

export default function ProfilePage({ profile, isFavorite, onToggleFav }) {
  const [lightbox, setLightbox] = useState(null)
  const heroLoaded = useImageLoaded(profile.cover)
  const fav = isFavorite ? isFavorite(profile.id) : false

  const open = (i) => setLightbox(i)
  const close = () => setLightbox(null)
  const prev = () => setLightbox(i => (i - 1 + profile.photos.length) % profile.photos.length)
  const next = () => setLightbox(i => (i + 1) % profile.photos.length)

  // 鍵盤控制：← → 切換，ESC 關閉
  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightbox])

  return (
    <div className="detail">
      {/* 大圖 hero — 圓角卡片風，名字 + 職業 overlay */}
      <div className="hero glass">
        <div className="bg" style={{ backgroundImage: heroLoaded ? `url(${profile.cover})` : 'none', backgroundPosition: 'center 25%' }} />
        {!heroLoaded && <div className="skeleton shimmer hero-skel" />}
        {profile.verified && <div className="verify">✓ 已認證</div>}
        <div className="meta">
          <div className="occ-pill">{profile.occupation}</div>
          <h2>{profile.name} <span className="age">{profile.age}</span></h2>
          <div className="sub">{profile.city} · {profile.tagline}</div>
        </div>
      </div>

      {/* 關於我 */}
      <div className="panel glass">
        <h3>關於我</h3>
        <p className="bio">{profile.bio}</p>
        <div className="tags">
          {profile.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
        </div>
      </div>

      {/* 相片 — 網格排列，可點擊放大 */}
      <div className="gallery glass">
        <div className="gallery-title">
          <h3>相片</h3>
          <span>{profile.photos.length} 張</span>
        </div>
        <div className="scroller">
          {profile.photos.map((p, i) => (
            <GalleryShot key={i} src={p} onOpen={() => open(i)} />
          ))}
        </div>
      </div>

      {/* 行動按鈕 */}
      <div className="actions">
        <button className="btn primary">✦ 發送邀請</button>
        <button className={`btn ${fav ? 'primary' : 'ghost'}`} onClick={() => onToggleFav(profile.id)}>
          {fav ? '♥ 已收藏' : '♡ 收藏'}
        </button>
      </div>

      {/* Lightbox 放大檢視 */}
      {lightbox !== null && (
        <div className="lightbox" onClick={close}>
          <button className="lb-close" onClick={close}>✕</button>
          {profile.photos.length > 1 && (
            <>
              <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); prev() }}>‹</button>
              <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); next() }}>›</button>
            </>
          )}
          <img
            src={profile.photos[lightbox]}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
          <div className="lb-count">{lightbox + 1} / {profile.photos.length}</div>
        </div>
      )}
    </div>
  )
}
