import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { SESSION_KICK_MSG } from '../auth/session.js'
import { adminSignIn } from '../auth/adminApi.js'
import { go as goPath } from '../nav.js'
import AdminUsers from './AdminUsers.jsx'
import AdminCms from './AdminCms.jsx'
import AdminMembers from './AdminMembers.jsx'
import AdminInbox from './AdminInbox.jsx'

const BOOTSTRAP_ADMIN_UID = 'MVd50jqSlQWPB6pndoMURXs1qf42'
const BOOTSTRAP_ADMIN_EMAIL = 'admin@velvet.app'

const PAGES = [
  { id: 'cms', label: '新建 Profile' },
  { id: 'members', label: '管理用戶' },
  { id: 'create', label: '新建用戶' },
  { id: 'inbox', label: '客服對話' },
]

export default function AdminApp() {
  const { user, isAdmin, ready, firebaseReady, logout, kicked } = useAuth()
  const allowed = Boolean(
    isAdmin
    || (user && (user.uid === BOOTSTRAP_ADMIN_UID || user.email === BOOTSTRAP_ADMIN_EMAIL))
  )
  const [page, setPage] = useState('members')
  const [drawer, setDrawer] = useState(false)
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('velvet-admin-email') || '' } catch { return '' }
  })
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setErr('') }, [user])
  useEffect(() => {
    if (!drawer) return
    const onKey = (e) => { if (e.key === 'Escape') setDrawer(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  const onLogin = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await adminSignIn(email, password, { remember })
    } catch (ex) {
      setErr(mapAuthError(ex))
    } finally {
      setBusy(false)
    }
  }

  const go = (id) => {
    setPage(id)
    setDrawer(false)
  }

  if (!firebaseReady) {
    return (
      <div className="gate">
        <div className="gate-card glass">
          <h1>Admin</h1>
          <p>尚未連接 Firebase。複製 <code>.env.example</code> 為 <code>.env.local</code>，填入專案金鑰後重開 dev server。</p>
          <a className="gate-link" href="/" onClick={e => { e.preventDefault(); goPath('/') }}>返回網站</a>
        </div>
      </div>
    )
  }

  if (!ready) {
    return <div className="gate"><div className="gate-card glass">載入中…</div></div>
  }

  if (!user || !allowed) {
    return (
      <div className="gate">
        <form className="gate-card glass" onSubmit={onLogin}>
          <div className="gate-brand">Velvet Admin</div>
          <h1>管理員登入</h1>
          <p className="gate-sub">使用 Firebase 管理員帳戶</p>
          {kicked && <div className="gate-err">{SESSION_KICK_MSG}</div>}
          {user && !allowed && <div className="gate-err">此帳戶沒有 admin 權限。請在 Firestore 建立 admins/{user.uid}</div>}
          <label>Admin Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label>
          <label>密碼<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          <label className="admin-remember">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            記住登入（關閉瀏覽器後仍保持登入）
          </label>
          {err && <div className="gate-err">{err}</div>}
          <button className="lp-btn primary" type="submit" disabled={busy}>{busy ? '登入中…' : '登入'}</button>
          <a className="gate-link" href="/" onClick={e => { e.preventDefault(); goPath('/') }}>返回網站</a>
        </form>
      </div>
    )
  }

  const current = PAGES.find(p => p.id === page) || PAGES[0]

  return (
    <div className="admin">
      <header className="admin-bar">
        <button type="button" className="admin-menu-btn" onClick={() => setDrawer(true)} aria-label="開啟選單">☰</button>
        <div className="admin-brand">Velvet CMS</div>
        <span className="admin-page-title">{current.label}</span>
        <div className="admin-right">
          <span>{user.email}</span>
          <button onClick={logout}>登出</button>
          <a href="/" onClick={e => { e.preventDefault(); goPath('/') }}>網站</a>
        </div>
      </header>

      {drawer && (
        <>
          <div className="admin-drawer-mask" onClick={() => setDrawer(false)} />
          <aside className="admin-drawer open">
            <div className="admin-drawer-head">
              <b>Velvet Admin</b>
              <button type="button" onClick={() => setDrawer(false)} aria-label="關閉">✕</button>
            </div>
            <nav>
              {PAGES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={page === item.id ? 'on' : ''}
                  onClick={() => go(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        </>
      )}

      <main className={`admin-main ${page === 'members' || page === 'inbox' ? 'wide' : ''} ${page === 'inbox' ? 'inbox-page' : ''}`}>
        {page === 'cms' && <AdminCms />}
        {page === 'members' && <AdminMembers />}
        {page === 'create' && <AdminUsers />}
        {page === 'inbox' && <AdminInbox />}
      </main>
    </div>
  )
}

function mapAuthError(ex) {
  const c = ex.code || ''
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return '帳戶或密碼不正確'
  if (c.includes('too-many-requests')) return '嘗試次數過多，請稍後再試'
  return ex.message || '登入失敗'
}
