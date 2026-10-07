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
  const [closing, setClosing] = useState(false)     // 詳情頁退出動畫
  const [animDone, setAnimDone] = useState(false)   // 詳情頁進入動畫完成（移除 class 避免 containing block）
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const sentinelRef = useRef(null)
  const scrollPosRef = useRef(0)  // 記住開詳情頁前嘅捲動位置

  // 列表資料（唔係 hook，但放喺 return 之前計算）
  const source = view === 'favorites'
    ? PROFILES.filter(p => favorites.has(p.id))
    : (filter === '全部' ? PROFILES : PROFILES.filter(p => p.stats.lifestyle === filter))
  const items = source.slice(0, visibleCount)
  const hasMore = visibleCount < source.length

  // 進入詳情頁捲返頂部；返回時恢復原本捲動位置（唔重設 visibleCount）
  useEffect(() => {
    if (selected) {
      window.scrollTo(0, 0)
    } else if (scrollPosRef.current > 0) {
      window.scrollTo(0, scrollPosRef.current)
    }
  }, [selected])

  // 監聽捲動 — 超過 40px 就收縮大標題（iOS large title 行為）
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // IntersectionObserver — sentinel 進入視窗就載入更多
  // dep 含 visibleCount + selected：返回詳情頁時重新 observe 新 sentinel（舊元素已 unmount）
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
  }, [hasMore, source.length, visibleCount, selected])

  const changeFilter = (f) => { setFilter(f); setVisibleCount(PAGE_SIZE); window.scrollTo(0, 0) }
  const switchView = (v) => { setView(v); setSelected(null); setClosing(false); setVisibleCount(PAGE_SIZE); window.scrollTo(0, 0) }

  const openProfile = (p) => { scrollPosRef.current = window.scrollY; setClosing(false); setAnimDone(false); setSelected(p) }
  const closeProfile = () => {
    setClosing(true)
    setTimeout(() => { setSelected(null); setClosing(false); setAnimDone(false) }, 340)
  }

  // ===== early returns（喺所有 hooks 之後）=====

  // 詳情頁 — 任何 view 都可以進入
  if (selected) {
    return (
      <div className="app">
        <div className="orbs"><div className="orb a"/><div className="orb b"/><div className="orb c"/></div>
        <div
          className={`app-inner app-with-bar ${closing ? 'detail-pop-out' : ''} ${!animDone && !closing ? 'detail-pop' : ''}`}
          onAnimationEnd={() => { if (!closing) setAnimDone(true) }}
        >
          <div className="back glass" onClick={closeProfile}>
            ← 返回
          </div>
          <ProfilePage profile={selected} isFavorite={isFavorite} onToggleFav={toggleFavorite} onBack={closeProfile} />
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
        {source.length === 0 ? (
          <div className="empty glass">
            {view === 'favorites' ? '尚未收藏任何對象 ♡' : '沒有符合的配對對象'}
          </div>
        ) : (
          <>
            <div className="grid">
              {items.map(p => (
                <ProfileCard key={p.id} profile={p} onOpen={() => openProfile(p)} isFavorite={isFavorite} onToggleFav={toggleFavorite} />
              ))}
            </div>

            <div ref={sentinelRef} className="load-more">
              {hasMore && isLoading && <div className="lm-spinner glass">載入中…</div>}
              {!hasMore && <div className="lm-end">已顯示全部 {source.length} 位</div>}
            </div>
          </>
        )}
      </div>

      <BottomBar view={view} onChange={switchView} />
    </div>
  )
}
