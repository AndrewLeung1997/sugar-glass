import { useState, useRef } from 'react'

export default function ProfileCard({ profile, onOpen, isFavorite, onToggleFav }) {
  const photos = profile.photos?.length ? profile.photos : [profile.cover]
  const multi = photos.length > 1
  const [idx, setIdx] = useState(0)
  const [openMore, setOpenMore] = useState(false)
  const fav = isFavorite ? isFavorite(profile.id) : false
  const fig = profile.figure || {}
  const startX = useRef(null)
  const dragged = useRef(false)
  const lastNav = useRef(0)

  const go = (n) => {
    const now = Date.now()
    if (now - lastNav.current < 260) return
    lastNav.current = now
    setIdx(i => Math.max(0, Math.min(photos.length - 1, n)))
  }

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    startX.current = e.clientX
    dragged.current = false
  }
  const onPointerMove = (e) => {
    if (startX.current == null) return
    if (Math.abs(e.clientX - startX.current) > 8) dragged.current = true
  }
  const onPointerUp = (e) => {
    if (startX.current == null) return
    const dx = e.clientX - startX.current
    const start = startX.current
    startX.current = null
    if (Math.abs(dx) > 40 && multi) {
      go(idx + (dx < 0 ? 1 : -1))
      return
    }
    if (dragged.current) return
    if (!multi) { onOpen(); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX || start) - rect.left
    go(idx + (x < rect.width * 0.35 ? -1 : 1))
  }

  return (
    <div className="card glass" data-profile-id={profile.id}>
      <div
        className="photo"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { startX.current = null }}
      >
        <div className="photo-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {photos.map((src, i) => (
            <img key={i} src={src} alt="" draggable={false} />
          ))}
        </div>
        {multi && (
          <div className="photo-dots" aria-hidden="true">
            {photos.map((_, i) => (
              <span key={i} className={i === idx ? 'on' : ''} />
            ))}
          </div>
        )}
        {profile.verified && <div className="badge">✓ 已認證</div>}
        <button
          className={`fav-btn ${fav ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFav(profile.id) }}
          aria-label="收藏"
        >{fav ? '♥' : '♡'}</button>
      </div>
      <div className="info">
        <div className="info-main" onClick={onOpen}>
          <div className="name">{profile.name} <span>{profile.age} · {profile.city}</span></div>
          <div className="tag">{profile.occupation} · {profile.tagline}</div>
          <div className="stats">
            <div className="stat"><b>{fig.bust}</b><small>胸圍</small></div>
            <div className="stat"><b>{fig.waist}</b><small>腰圍</small></div>
            <div className="stat"><b>{fig.hip}</b><small>臀圍</small></div>
          </div>
        </div>
        <button
          className={`card-more-btn ${openMore ? 'open' : ''}`}
          onClick={(e) => { e.stopPropagation(); setOpenMore(v => !v) }}
          aria-expanded={openMore}
          aria-label={openMore ? '收起身高體重' : '顯示身高體重'}
        >
          <span className="card-more-arrow">⌄</span>
        </button>
        {openMore && (
          <div className="card-more">
            <div className="stats stats-more">
              <div className="stat"><b>{fig.height}</b><small>身高</small></div>
              <div className="stat"><b>{fig.weight}</b><small>體重</small></div>
            </div>
            <div className="card-more-row">
              <small>教育程度</small>
              <b>{profile.education}</b>
            </div>
            <div className="card-more-row">
              <small>技能</small>
              <div className="card-more-pills">
                {(profile.skills || []).map(s => <span key={s}>{s}</span>)}
              </div>
            </div>
            <div className="card-more-row">
              <small>興趣</small>
              <div className="card-more-pills">
                {(profile.interests || []).map(s => <span key={s}>{s}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
