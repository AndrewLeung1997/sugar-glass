import { useState, useEffect } from 'react'
import { PROFILES, FILTERS } from './data.js'
import ProfileCard from './components/ProfileCard.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import BottomBar from './components/BottomBar.jsx'
import { useFavorites } from './hooks/useFavorites.js'

const PAGE_SIZE = 12

export default function App() {
  const [view, setView] = useState('home')          // home | favorites | member
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('全部')
  const [page, setPage] = useState(1)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()

  // 進入/離開詳情頁、切換頁碼時都捲返頂部
  useEffect(() => { window.scrollTo(0, 0) }, [selected, page])

  const changeFilter = (f) => { setFilter(f); setPage(1) }

  // 詳情頁 — 任何 view 都可以進入
  if (selected) {
    return (
      <div className="app">
        <div className="orbs"><div className="orb a"/><div className="orb b"/><div className="orb c"/></div>
        <div className="app-inner app-with-bar">
          <div className="back glass" onClick={() => setSelected(null)}>
            ← 返回
          </div>
          <ProfilePage profile={selected} isFavorite={isFavorite} onToggleFav={toggleFavorite} />
        </div>
        <BottomBar view={view} onChange={setView} />
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
              <div className="brand"><i>Velvet</i><small>精緻配對 · 香港</small></div>
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
        <BottomBar view={view} onChange={setView} />
      </div>
    )
  }

  // 主頁 / 我的收藏 共用列表邏輯
  const source = view === 'favorites'
    ? PROFILES.filter(p => favorites.has(p.id))
    : (filter === '全部' ? PROFILES : PROFILES.filter(p => p.stats.lifestyle === filter))

  const totalPages = Math.max(1, Math.ceil(source.length / PAGE_SIZE))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * PAGE_SIZE
  const pageItems = source.slice(start, start + PAGE_SIZE)

  const pageBtns = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageBtns.push(i)
  } else if (cur <= 4) {
    pageBtns.push(1, 2, 3, 4, 5, '…', totalPages)
  } else if (cur >= totalPages - 3) {
    pageBtns.push(1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  } else {
    pageBtns.push(1, '…', cur - 1, cur, cur + 1, '…', totalPages)
  }

  return (
    <div className="app">
      <div className="orbs"><div className="orb a"/><div className="orb b"/><div className="orb c"/></div>

      <div className="header-sticky">
        <div className="header-inner">
          <div className="topbar">
            <div className="brand">
              <i>Velvet</i>
              <small>{view === 'favorites' ? '我的收藏 · 香港' : '精緻配對 · 香港'}</small>
            </div>
            <div className="search glass">
              <input placeholder="搜尋名字、地區、興趣…" style={{ border:'none', background:'transparent', outline:'none', width:220, fontSize:14, color:'var(--text)' }} />
            </div>
          </div>

          {view === 'home' && (
            <div className="filters">
              {FILTERS.map(f => (
                <div key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => changeFilter(f)}>
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
              {pageItems.map(p => (
                <ProfileCard key={p.id} profile={p} onOpen={() => setSelected(p)} isFavorite={isFavorite} onToggleFav={toggleFavorite} />
              ))}
            </div>

            <div className="pager">
              <div className="count">顯示 {start + 1}–{Math.min(start + PAGE_SIZE, source.length)}，共 {source.length} 位</div>
              <div className="pager-btns">
                <button className="pg" disabled={cur === 1} onClick={() => setPage(cur - 1)}>‹ 上一頁</button>
                {pageBtns.map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} className="ellipsis">…</span>
                    : <button key={p} className={`pg ${p === cur ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                )}
                <button className="pg" disabled={cur === totalPages} onClick={() => setPage(cur + 1)}>下一頁 ›</button>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomBar view={view} onChange={(v) => { setView(v); setSelected(null); setPage(1) }} />
    </div>
  )
}
