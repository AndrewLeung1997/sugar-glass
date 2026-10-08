import { useImageLoaded } from '../hooks/useImageLoaded.js'

export default function ProfileCard({ profile, onOpen, isFavorite, onToggleFav }) {
  const loaded = useImageLoaded(profile.cover)
  const fav = isFavorite ? isFavorite(profile.id) : false

  return (
    <div className="card glass" onClick={onOpen}>
      <div className="photo" style={{ backgroundImage: `url(${profile.cover})` }}>
        {!loaded && <div className="skeleton shimmer" />}
        {profile.verified && <div className="badge">✓ 已認證</div>}
        <button
          className={`fav-btn ${fav ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFav(profile.id) }}
          aria-label="收藏"
        >{fav ? '♥' : '♡'}</button>
      </div>
      <div className="info">
        <div className="name">{profile.name} <span>{profile.age} · {profile.city}</span></div>
        <div className="tag">{profile.occupation} · {profile.tagline}</div>
        <div className="stats">
          <div className="stat"><b>{profile.stats.budget}</b><small>預算</small></div>
          <div className="stat"><b>{profile.stats.lifestyle}</b><small>風格</small></div>
        </div>
      </div>
    </div>
  )
}
