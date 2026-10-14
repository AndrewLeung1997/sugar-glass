import { useState, useEffect, useRef } from 'react'
import { PROFILES, FILTERS } from './data.js'
import { REELS, interleaveFeed } from './reels.js'
import ProfileCard from './components/ProfileCard.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import ReelCard from './components/ReelCard.jsx'
import ReelViewer from './components/ReelViewer.jsx'
import ReelRail from './components/ReelRail.jsx'
import BottomBar from './components/BottomBar.jsx'
import Landing from './components/Landing.jsx'
import { useFavorites } from './hooks/useFavorites.js'

const PAGE_SIZE = 12

export default function App() {
  // ===== 所有 useState / useRef 必須喺任何 early return 之前 =====
  const [showLanding, setShowLanding] = useState(true)
  const [view, setView] = useState('home')          // home | favorites | member
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('全部')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)  // infinite scroll 已載入數量
  const [scrolled, setScrolled] = useState(false)    // iOS large title 收縮狀態
  const [isLoading, setIsLoading] = useState(false) // infinite scroll 載入中
  const [closing, setClosing] = useState(false)     // 詳情頁退出動畫
  const [animDone, setAnimDone] = useState(false)   // 詳情頁進入動畫完成（移除 class 避免 containing block）
  const [activeReel, setActiveReel] = useState(null) // 全屏 Reel 索引
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const sentinelRef = useRef(null)
  const returnToIdRef = useRef(null) // 返回主頁時捲去呢張 card
  const pendingReturnId = useRef(null)

  // 列表資料（唔係 hook，但放喺 return 之前計算）
  const source = view === 'favorites'
    ? PROFILES.filter(p => favorites.has(p.id))
    : (filter === '全部' ? PROFILES : PROFILES.filter(p => p.stats.lifestyle === filter))
  const items = source.slice(0, visibleCount)
  const hasMore = visibleCount < source.length
  const feed = view === 'home' ? interleaveFeed(items, REELS, 3) : items.map(p => ({ kind: 'profile', profile: p, key: p.id }))
  const profileOfReel = (reel) => PROFILES.find(p => p.id === reel.profileId)

  // 監聽捲動 — 超過 40px 就收縮大標題（iOS large title 行為）
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 詳情 overlay 打開時鎖住底層捲動，返回時列表位置唔會被帶走
  useEffect(() => {
    if (!selected) return
    const html = document.documentElement
    const prevBody = document.body.style.overflow
    const prevHtml = html.style.overflow
    document.body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      html.style.overflow = prevHtml
    }
  }, [selected])

  // 返回 / 撳主頁之後，等列表重新顯示再捲去嗰張 card
  useEffect(() => {
    if (selected || closing) return
    const id = pendingReturnId.current
    if (!id) return
    const idx = source.findIndex(p => p.id === id)
    if (idx < 0) {
      pendingReturnId.current = null
      return
    }
    if (idx >= visibleCount) {
      setVisibleCount(idx + 1)
      return
    }
    const el = document.querySelector(`[data-profile-id="${id}"]`)
    if (!el) return
    pendingReturnId.current = null
    const r = el.getBoundingClientRect()
    const inView = r.bottom > 120 && r.top < window.innerHeight - 80
    if (!inView) el.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [selected, closing, visibleCount, view, source.length])

  // IntersectionObserver — sentinel 進入視窗就載入更多
  // 必須含 showLanding：landing 期間 sentinel 未掛上，入主頁後要重新 observe
  useEffect(() => {
    if (showLanding || selected) return
    const el = sentinelRef.current
    if (!el || !hasMore) return
    let busy = false
    const load = () => {
      if (busy) return
      busy = true
      setIsLoading(true)
      setVisibleCount(c => Math.min(c + PAGE_SIZE, source.length))
      setTimeout(() => setIsLoading(false), 400)
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) load()
    }, { rootMargin: '400px', threshold: 0 })
    io.observe(el)
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight + 400) load()
    return () => io.disconnect()
  }, [hasMore, source.length, visibleCount, selected, showLanding])

  const changeFilter = (f) => { returnToIdRef.current = null; pendingReturnId.current = null; setFilter(f); setVisibleCount(PAGE_SIZE); window.scrollTo(0, 0) }
  const closeProfile = () => {
    const id = returnToIdRef.current
    setClosing(true)
    setTimeout(() => {
      setSelected(null)
      setClosing(false)
      setAnimDone(false)
      if (id) pendingReturnId.current = id
      returnToIdRef.current = null
    }, 280)
  }
  const switchView = (v) => {
    // 詳情頁撳「主頁」＝返回：關 overlay，留低列表，去返嗰張 card
    if (v === 'home' && selected) {
      if (view !== 'home') setView('home')
      closeProfile()
      return
    }
    if (v === view && !selected) return
    returnToIdRef.current = null
    pendingReturnId.current = null
    setView(v)
    setSelected(null)
    setClosing(false)
    setAnimDone(false)
    setVisibleCount(PAGE_SIZE)
    window.scrollTo(0, 0)
  }
  const openProfile = (p) => {
    returnToIdRef.current = p.id
    setClosing(false)
    setAnimDone(false)
    setSelected(p)
  }
  const selectedIdx = selected ? source.findIndex(p => p.id === selected.id) : -1
  const prevProfile = selectedIdx > 0 ? source[selectedIdx - 1] : null
  const nextProfile = selectedIdx >= 0 && selectedIdx < source.length - 1 ? source[selectedIdx + 1] : null
  const goAdjacent = (p) => {
    if (!p) return
    const i = source.findIndex(x => x.id === p.id)
    if (i >= visibleCount) setVisibleCount(i + 1)
    returnToIdRef.current = p.id
    setAnimDone(true)
    setSelected(p)
    const overlay = document.querySelector('.detail-overlay')
    if (overlay) overlay.scrollTop = 0
  }

  // ===== early returns（喺所有 hooks 之後）=====

  // Landing page — 首次進入時顯示
  if (showLanding) {
    return <Landing onEnter={() => { setShowLanding(false); window.scrollTo(0, 0) }} />
  }

  // 會員中心
  if (view === 'member' && !selected) {
    return (
      <div className="app">
        <div className="orbs"><div className="orb a"/><div className="orb b"/><div className="orb c"/></div>
        <div className="header-sticky">
          <div className="header-inner">
            <div className="topbar">
              <div className="brand"><i className="brand-mark">Velvet</i><small>精緻配對 · 香港</small></div>
            </div>
          </div>
        </div>
        <div className="app-inner app-with-bar">
          <div className="member glass">
            <div className="member-avatar">✦</div>
            <h2 className="member-name">尊貴會員</h2>
            <p className="member-sub">VIP · 已加入 365 日</p>
            <div className="member-stats">
              <div className="mstat"><b>{favorites.size}</b><small>收藏</small></div>
              <div className="mstat"><b>{PROFILES.length}</b><small>配對對象</small></div>
              <div className="mstat"><b>12</b><small>本月瀏覽</small></div>
            </div>
            <div className="member-menu">
              <div className="mitem">編輯個人檔案</div>
              <div className="mitem">配對偏好</div>
              <div className="mitem">通知設定</div>
              <div className="mitem">隱私與安全</div>
              <div className="mitem">升級 Premium</div>
            </div>
          </div>
        </div>
        <BottomBar view={view} onChange={switchView} />
      </div>
    )
  }

  // ===== 主頁 / 我的收藏 =====
  return (
    <div className="app">
      <div className="orbs"><div className="orb a"/><div className="orb b"/><div className="orb c"/></div>

      <div className={selected ? 'home-hold' : undefined} aria-hidden={!!selected}>
      <div className={`header-sticky ${scrolled ? 'compact' : ''}`}>
        <div className="header-inner">
          <div className="topbar">
            <div className="brand">
              <i className="brand-mark">Velvet</i>
              <small>{view === 'favorites' ? '我的收藏 · 香港' : '精緻配對 · 香港'}</small>
            </div>
            <div className="search glass">
              <input placeholder="搜尋名字、地區、興趣…" style={{ border:'none', background:'transparent', outline:'none', width:220, fontSize:14, color:'var(--text)' }} />
            </div>
          </div>
        </div>
      </div>

      {view === 'home' && (
        <div className="seg-bar">
          <div className="filters segmented" style={{ '--active': FILTERS.indexOf(filter) }}>
            <div className="seg-indicator" />
            {FILTERS.map(f => (
              <div key={f} className={`seg ${filter === f ? 'active' : ''}`} onClick={() => changeFilter(f)}>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="app-inner app-with-bar">
        {view === 'home' && (
          <ReelRail reels={REELS} profileOf={profileOfReel} onOpen={setActiveReel} />
        )}
        {source.length === 0 ? (
          <div className="empty glass">
            {view === 'favorites' ? '尚未收藏任何對象 ♡' : '沒有符合的配對對象'}
          </div>
        ) : (
          <>
            <div className="grid">
              {feed.map(item => item.kind === 'reel' ? (
                <ReelCard
                  key={item.key}
                  reel={item.reel}
                  profile={profileOfReel(item.reel)}
                  onOpen={() => setActiveReel(REELS.findIndex(r => r.id === item.reel.id))}
                />
              ) : (
                <ProfileCard key={item.key} profile={item.profile} onOpen={() => openProfile(item.profile)} isFavorite={isFavorite} onToggleFav={toggleFavorite} />
              ))}
            </div>

            <div ref={sentinelRef} className="load-more">
              {hasMore && isLoading && <div className="lm-spinner glass">載入中…</div>}
              {!hasMore && <div className="lm-end">已顯示全部 {source.length} 位</div>}
            </div>
          </>
        )}
      </div>

      </div>

      {selected && (
        <div
          className={`detail-overlay ${closing ? 'detail-pop-out' : ''} ${!animDone && !closing ? 'detail-pop' : ''}`}
          onAnimationEnd={() => { if (!closing) setAnimDone(true) }}
        >
          <div className="app-inner app-with-bar">
            <div className="back glass" onClick={closeProfile}>
              ← 返回
            </div>
            <ProfilePage
              profile={selected}
              isFavorite={isFavorite}
              onToggleFav={toggleFavorite}
              onBack={closeProfile}
              prevProfile={prevProfile}
              nextProfile={nextProfile}
              onPrev={() => goAdjacent(prevProfile)}
              onNext={() => goAdjacent(nextProfile)}
            />
          </div>
        </div>
      )}

      <BottomBar view={view} onChange={switchView} />
      {activeReel !== null && (
        <ReelViewer
          reels={REELS}
          index={activeReel}
          onClose={() => setActiveReel(null)}
          onChange={setActiveReel}
          profileOf={profileOfReel}
          onOpenProfile={(p) => { setActiveReel(null); openProfile(p) }}
        />
      )}
    </div>
  )
}
