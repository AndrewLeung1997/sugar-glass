export default function BottomBar({ view, onChange }) {
  const tabs = [
    { id: 'home', label: '主頁', icon: '⌂' },
    { id: 'favorites', label: '我的收藏', icon: '♡' },
    { id: 'member', label: '會員中心', icon: '✦' },
  ]
  return (
    <nav className="bottom-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`bb-tab ${view === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="bb-icon">{t.icon}</span>
          <span className="bb-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
