import { useState } from 'react'
import { PROFILES, FILTERS } from './data.js'
import ProfileCard from './components/ProfileCard.jsx'
import ProfilePage from './components/ProfilePage.jsx'

const PAGE_SIZE = 12

export default function App() {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('全部')
  const [page, setPage] = useState(1)

  const filtered = filter === '全部'
    ? PROFILES
    : PROFILES.filter(p => p.stats.lifestyle === filter)

  const changeFilter = (f) => { setFilter(f); setPage(1) }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const cur = Math.min(page, totalPages)
  const start = (cur - 1) * PAGE_SIZE
  const pageItems = filtered.slice(start, start + PAGE_SIZE)

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

  if (selected) {
    return (
      <div className="app">
        <div className="orbs"><div className="orb a"/><div className="orb b"/><div className="orb c"/></div>
        <div className="app-inner">
          <div className="back glass" onClick={() => setSelected(null)}>
            ← 返回列表
          </div>
          <ProfilePage profile={selected} />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="orbs"><div className="orb a"/><div className="orb b"/><div className="orb c"/></div>

      <div className="header-sticky">
        <div className="header-inner">
          <div className="topbar">
            <div className="brand">
              <i>Velvet</i>
              <small>精緻配對 · 香港</small>
            </div>
            <div className="search glass">
              <input placeholder="搜尋名字、地區、興趣…" style={{ border:'none', background:'transparent', outline:'none', width:220, fontSize:14, color:'var(--text)' }} />
            </div>
          </div>

          <div className="filters">
            {FILTERS.map(f => (
              <div key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => changeFilter(f)}>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="app-inner">
        {filtered.length === 0 ? (
          <div className="empty glass">沒有符合的配對對象</div>
        ) : (
          <>
            <div className="grid">
              {pageItems.map(p => (
                <ProfileCard key={p.id} profile={p} onOpen={() => setSelected(p)} />
              ))}
            </div>

            <div className="pager">
              <div className="count">顯示 {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)}，共 {filtered.length} 位</div>
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
    </div>
  )
}
