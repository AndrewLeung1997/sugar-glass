import { useState, useEffect, useRef } from 'react'
import { PROFILES, FILTERS } from './data.js'
import ProfileCard from './components/ProfileCard.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import BottomBar from './components/BottomBar.jsx'
import { useFavorites } from './hooks/useFavorites.js'

const PAGE_SIZE = 12

export default function App() {
  // ===== 所有 useState / useRef 必須喺任何 early return 之前 =====
  const [view, setView] = useState('home')          // home | favorites | member
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('全部')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)  // infinite scroll 已載入數量
  const [scrolled, setScrolled] = useState(false)    // iOS large title 收縮狀態
  const [isLoading, setIsLoading] = useState(false) // infinite scroll 載入中
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const sentinelRef = useRef(null)

  // 列表資料（唔係 hook，但放喺 return 之前計算）
  const source = view === 'favorites'
    ? PROFILES.filter(p => favorites.has(p.id))
    : (filter === '全部' ? PROFILES : PROFILES.filter(p => p.stats.lifestyle === filter))
  const items = source.slice(0, visibleCount)
  const hasMore = visibleCount < source.length

  // 進入/離開詳情頁時捲返頂部 + 重設載入數
  useEffect(() => {
    window.scrollTo(0, 0)
    setVisibleCount(PAGE_SIZE)
  }, [selected])

  // 監聽捲動 — 超過 40px 就收縮大標題（iOS large title 行為）
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // IntersectionObserver — sentinel 進入視窗就載入更多
  // dep 含 visibleCount：每次載入後重新 observe，等 observer 重新評估交集狀態（解決卡喺「載入中」）
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsLoading(true)
        setVisibleCount(c => Math.min(c + PAGE_SIZE, source.length))
        setTimeout(() => setIsLoading(false), 400)
      }
    }, { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, source.length, visibleCount])

  const changeFilter = (f) => { setFilter(f); setVisibleCount(PAGE_SIZE); window.scrollTo(0, 0) }
  const switchView = (v) => { setView(v); setSelected(null); setVisibleCount(PAGE_SIZE); window.scrollTo(0, 0) }

  // ===== early returns（喺所有 hooks 之後）=====

  // 詳情頁 — 任何 view 都可以進入
  if (selected) {
    return (
      <div className="app">
        <div className="orbs"><div className="orb a"/><div className="orb b"/><div className="orb c"/></div>
        <div className="app-inner app-with-bar">
          <div className="back glass" onClick={() => setSelected(null)}>
            ← 返回
          </div>
          <ProfilePage profile={selected} isFavorite={isFavorite} onToggleFav={toggleFavorite} onBack={() => setSelected(null)} />
        </div>
        <BottomBar view={view} onChange={switchView} />
      </div>
    )
  }

  // 會員中心
  if (view === 'member') {
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

          {view === 'home' && (
            <div className="filters segmented" style={{ '--active': FILTERS.indexOf(filter) }}>
              <div className="seg-indicator" />
              {FILTERS.map(f => (
                <div key={f} className={`seg ${filter === f ? 'active' : ''}`} onClick={() => changeFilter(f)}>
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="app-inner app-with-bar">
        {source.length === 0 ? (
          <div className="empty glass">
            {view === 'favorites' ? '尚未收藏任何對象 ♡' : '沒有符合的配對對象'}
          </div>
        ) : (
          <>
            <div className="grid">
              {items.map(p => (
                <ProfileCard key={p.id} profile={p} onOpen={() => setSelected(p)} isFavorite={isFavorite} onToggleFav={toggleFavorite} />
              ))}
            </div>

            <div ref={sentinelRef} className="load-more">
              {hasMore ? (
                isLoading
                  ? <div className="lm-spinner glass">載入中…</div>
                  : <div className="lm-hint">向下捲動載入更多 ↓</div>
              ) : (
                <div className="lm-end">已顯示全部 {source.length} 位</div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomBar view={view} onChange={switchView} />
    </div>
  )
}
