import { useState, useEffect } from 'react'
import { getViewerId, watermarkDataUri } from '../hooks/useScreenshotGuard.js'
import FaceBlurFill from './FaceBlurFill.jsx'

function LuxShot({ src, onOpen, wm }) {
  const block = (e) => { e.preventDefault(); return false }
  return (
    <div
      className="lux-shot"
      onClick={onOpen}
      onContextMenu={block}
      onDragStart={block}
    >
      <FaceBlurFill src={src} position="center center" />
      <div className="lux-wm" style={{ backgroundImage: wm }} />
    </div>
  )
}

export default function ProfilePage({ profile, isFavorite, onToggleFav, onBack, prevProfile, nextProfile, onPrev, onNext }) {
  const [lightbox, setLightbox] = useState(null)
  const [openMore, setOpenMore] = useState(false)
  const fig = profile.figure || {}
  const fav = isFavorite ? isFavorite(profile.id) : false
  const viewerId = getViewerId()
  const today = new Date().toISOString().slice(0, 10)
  const wmText = `${viewerId} · ${profile.name} · ${today}`
  const wm = watermarkDataUri(wmText)
  const block = (e) => { e.preventDefault(); return false }

  const open = (i) => setLightbox(i)
  const close = () => setLightbox(null)
  const prev = () => setLightbox(i => (i - 1 + profile.photos.length) % profile.photos.length)
  const next = () => setLightbox(i => (i + 1) % profile.photos.length)

  useEffect(() => { setLightbox(null); setOpenMore(false) }, [profile.id])

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
    <div className="detail-lux">
      {/* 全屏大圖 hero */}
      <section className="lux-hero">
        <FaceBlurFill className="lux-hero-bg" src={profile.cover} position="center 22%" />
        <div className="lux-hero-grad" />
        {profile.verified && <div className="lux-verify">✓ Verified</div>}
        <div className="lux-hero-meta">
          <div className="lux-occ">{profile.occupation}</div>
          <h1 className="lux-name">{profile.name} <span className="lux-age">{profile.age}</span></h1>
          <div className="lux-loc">{profile.city} · {profile.tagline}</div>
        </div>
      </section>

      {/* 三圍；箭嘴先出身高體重 */}
      <section className="lux-stats">
        <div className="lux-stat"><b>{fig.bust}</b><small>胸圍</small></div>
        <span className="lux-div" />
        <div className="lux-stat"><b>{fig.waist}</b><small>腰圍</small></div>
        <span className="lux-div" />
        <div className="lux-stat"><b>{fig.hip}</b><small>臀圍</small></div>
      </section>
      <button
        className={`card-more-btn lux-more-btn ${openMore ? 'open' : ''}`}
        onClick={() => setOpenMore(v => !v)}
        aria-expanded={openMore}
        aria-label={openMore ? '收起身高體重' : '顯示身高體重'}
      >
        <span className="card-more-arrow">⌄</span>
      </button>
      {openMore && (
        <section className="lux-stats lux-stats-more">
          <div className="lux-stat"><b>{fig.height}</b><small>身高</small></div>
          <span className="lux-div" />
          <div className="lux-stat"><b>{fig.weight}</b><small>體重</small></div>
        </section>
      )}

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
        <button type="button" className={`lux-btn outline ${fav ? 'fav' : ''}`} onClick={() => onToggleFav?.(profile.id)}>
          {fav ? '♥ 已收藏' : '♡ 收藏'}
        </button>
      </div>

      <nav className="detail-pager">
        <button
          className="detail-pager-btn prev"
          disabled={!prevProfile}
          onClick={onPrev}
        >
          <span className="detail-pager-dir">‹ 上一個</span>
          <span className="detail-pager-name">{prevProfile ? `${prevProfile.name} · ${prevProfile.age}` : '—'}</span>
        </button>
        <button
          className="detail-pager-btn next"
          disabled={!nextProfile}
          onClick={onNext}
        >
          <span className="detail-pager-dir">下一個 ›</span>
          <span className="detail-pager-name">{nextProfile ? `${nextProfile.name} · ${nextProfile.age}` : '—'}</span>
        </button>
      </nav>

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
            <FaceBlurFill src={profile.photos[lightbox]} position="center center" fit="contain" />
            <div className="lux-wm lb-wm" style={{ backgroundImage: wm }} />
          </div>
          <div className="lb-count">{lightbox + 1} / {profile.photos.length}</div>
          <div className="lb-protect-hint">本相片受版權保護 · 禁止截圖及轉載</div>
        </div>
      )}
    </div>
  )
}
