import FaceBlurFill from './FaceBlurFill.jsx'

export default function ReelRail({ reels, profileOf, onOpen }) {
  return (
    <section className="reel-rail">
      <div className="reel-rail-title">Reels</div>
      <div className="reel-rail-row">
        {reels.map((reel, i) => {
          const p = profileOf(reel)
          return (
            <button key={reel.id} className="reel-rail-item" onClick={() => onOpen(i)}>
              <FaceBlurFill src={reel.poster || p?.cover} position="center top" />
              <span className="reel-rail-play">▶</span>
              <span className="reel-rail-name">{p?.name || 'Reel'}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
