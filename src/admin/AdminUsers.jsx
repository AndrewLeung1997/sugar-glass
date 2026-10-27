import { useState } from 'react'
import { createMemberAccount } from '../auth/adminApi.js'
import AdminBusyOverlay from './AdminBusyOverlay.jsx'

export default function AdminUsers() {
  const [form, setForm] = useState({ userName: '', phone: '', password: '', confirmPassword: '', inviteCode: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setOk('')
    if (form.password !== form.confirmPassword) {
      setErr('兩次輸入的密碼不一致')
      return
    }
    setBusy(true)
    try {
      const created = await createMemberAccount(form)
      setOk(created.userName)
      setForm({ userName: '', phone: '', password: '', confirmPassword: '', inviteCode: '' })
    } catch (ex) {
      setErr(ex.code === 'auth/email-already-in-use' ? '此用戶名稱已被註冊' : (ex.message || '建立失敗'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="create-user">
      <AdminBusyOverlay show={busy} text="正在建立帳戶，請稍候…" />
      <form className="create-user-card glass" onSubmit={onSubmit}>
        <fieldset disabled={busy} className="admin-lock">
          <div className="create-user-head">
            <span className="create-user-kicker">Member</span>
            <h2>新建用戶</h2>
          </div>

          <div className="create-user-grid">
            <label className="create-field">
              <span>用戶名稱</span>
              <input value={form.userName} onChange={set('userName')} placeholder="andrew_l" autoComplete="off" required />
            </label>
            <label className="create-field">
              <span>電話號碼</span>
              <input value={form.phone} onChange={set('phone')} placeholder="+852 9123 4567" inputMode="tel" required />
            </label>
            <label className="create-field">
              <span>密碼</span>
              <div className="create-pw">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  required
                />
                <button type="button" className="create-pw-toggle" onClick={() => setShowPw(v => !v)}>
                  {showPw ? '隱藏' : '顯示'}
                </button>
              </div>
            </label>
            <label className="create-field">
              <span>確認密碼</span>
              <input
                type={showPw ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                placeholder="再輸入一次"
                autoComplete="new-password"
                required
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <small className="create-field-warn">兩次密碼不一致</small>
              )}
            </label>
            <label className="create-field create-field-wide">
              <span>邀請碼 <em>可選</em></span>
              <input value={form.inviteCode} onChange={set('inviteCode')} placeholder="沒有可留空" />
            </label>
          </div>

          {err && <div className="create-user-msg err">{err}</div>}
          {ok && <div className="create-user-msg ok">已建立 <b>{ok}</b></div>}

          <button className="create-user-submit" type="submit" disabled={busy}>
            {busy ? '建立中…' : '建立帳戶'}
          </button>
        </fieldset>
      </form>
    </div>
  )
}
