import { useState, useEffect } from 'react'
import { useImageLoaded } from '../hooks/useImageLoaded.js'
import { useScreenshotGuard, getViewerId, watermarkDataUri } from '../hooks/useScreenshotGuard.js'

function LuxShot({ src, onOpen, wm }) {
  const loaded = useImageLoaded(src)
  const block = (e) => { e.preventDefault(); return false }
  return (
    <div
      className="lux-shot"
      style={{ backgroundImage: loaded ? `url(${src})` : 'none' }}
      onClick={onOpen}
      onContextMenu={block}
      onDragStart={block}
    >
      {!loaded && <div className="skeleton shimmer" />}
      <div className="lux-wm" style={{ backgroundImage: wm }} />
    </div>
  )
}

export default function ProfilePage({ profile, isFavorite, onToggleFav, onBack }) {
  const [lightbox, setLightbox] = useState(null)
  const heroLoaded = useImageLoaded(profile.cover)
  const fav = isFavorite ? isFavorite(profile.id) : false
  const { guarded, warning, flash } = useScreenshotGuard()
  const viewerId = getViewerId()
  const today = new Date().toISOString().slice(0, 10)
  const wmText = `${viewerId} · ${profile.name} · ${today}`
  const wm = watermarkDataUri(wmText)
  const block = (e) => { e.preventDefault(); return false }

  const open = (i) => setLightbox(i)
  const close = () => setLightbox(null)
  const prev = () => setLightbox(i => (i - 1 + profile.photos.length) % profile.photos.length)
  const next = () => setLightbox(i => (i + 1) % profile.photos.length)

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

  // 統一 2 欄 grid，所有相片相同比例

  return (
    <div className={`detail-lux ${guarded ? 'is-guarded' : ''}`}>
      {/* 截圖警告 */}
      {warning && (
        <div className="ss-warning" key={flash}>{warning}</div>
      )}
      {/* 全屏大圖 hero */}
      <section className="lux-hero">
        <div className="lux-hero-bg" style={{ backgroundImage: heroLoaded ? `url(${profile.cover})` : 'none' }} />
        {!heroLoaded && <div className="skeleton shimmer" style={{ position: 'absolute', inset: 0 }} />}
        <div className="lux-hero-grad" />
        {profile.verified && <div className="lux-verify">✓ Verified</div>}
        <div className="lux-hero-meta">
          <div className="lux-occ">{profile.occupation}</div>
          <h1 className="lux-name">{profile.name} <span className="lux-age">{profile.age}</span></h1>
          <div className="lux-loc">{profile.city} · {profile.tagline}</div>
        </div>
      </section>

      {/* 統計條 */}
      <section className="lux-stats">
        <div className="lux-stat"><b>{profile.stats.budget}</b><small>預算</small></div>
        <span className="lux-div" />
        <div className="lux-stat"><b>{profile.stats.lifestyle}</b><small>風格</small></div>
      </section>

      {/* 關於 */}
      <section className="lux-about">
        <div className="lux-h"><span className="lux-h-line" />About</div>
        <p className="lux-bio">{profile.bio}</p>
        <div className="lux-tags">
          {profile.tags.map(t => <span key={t} className="lux-tag">{t}</span>)}
        </div>
      </section>

      {/* 相片牆 — 瀑布流 */}
      <section className="lux-gallery">
        <div className="lux-h"><span className="lux-h-line" />Gallery <span className="lux-h-count">{profile.photos.length}</span></div>
        <div className="lux-masonry">
          {profile.photos.map((p, i) => (
            <LuxShot key={i} src={p} wm={wm} onOpen={() => open(i)} />
          ))}
        </div>
      </section>

      {/* 行動 */}
      <div className="lux-actions">
        <button className="lux-btn filled">發送邀請</button>
        <button className={`lux-btn outline ${fav ? 'fav' : ''}`} onClick={() => onToggleFav(profile.id)}>
          {fav ? '♥ 已收藏' : '♡ 收藏'}
        </button>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="lightbox" onClick={close}>
          <button className="lb-close" onClick={close}>✕</button>
          {profile.photos.length > 1 && (
            <>
              <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); prev() }}>‹</button>
              <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); next() }}>›</button>
            </>
          )}
          <div className="lb-img-wrap" onClick={(e) => e.stopPropagation()} onContextMenu={block} onDragStart={block}>
            <img src={profile.photos[lightbox]} alt="" draggable={false} />
            <div className="lux-wm lb-wm" style={{ backgroundImage: wm }} />
          </div>
          <div className="lb-count">{lightbox + 1} / {profile.photos.length}</div>
          <div className="lb-protect-hint">本相片受版權保護 · 禁止截圖及轉載</div>
        </div>
      )}
    </div>
  )
}
