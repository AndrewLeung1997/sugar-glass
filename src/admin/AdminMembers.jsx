import { useEffect, useState } from 'react'
import { addPayment, deleteMember, listMembers, listPayments, setMemberDisabled } from '../auth/adminApi.js'
import { isPaidAccount, isUnpaidExpired } from '../auth/accountAccess.js'
import AdminBusyOverlay from './AdminBusyOverlay.jsx'

export default function AdminMembers() {
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyText, setBusyText] = useState('處理中…')
  const [payUser, setPayUser] = useState(null)
  const [payments, setPayments] = useState([])
  const [payForm, setPayForm] = useState({ paidAt: todayInput(), amount: '', note: '' })
  const [payErr, setPayErr] = useState('')

  const load = async () => {
    try { setList(await listMembers()) } catch (ex) { setList([]); setErr(ex.message || '讀取用戶失敗') }
  }
  useEffect(() => { load() }, [])

  const run = async (text, fn, success) => {
    setErr('')
    setOk('')
    setBusyText(text)
    setBusy(true)
    try {
      await fn()
      if (success) setOk(success)
      await load()
    } catch (ex) {
      setErr(ex.message || '操作失敗')
    } finally {
      setBusy(false)
    }
  }

  const onDisable = (u) => {
    const next = !u.disabled
    const label = next ? `停用 ${u.userName}？對方會即時被登出。` : `重新啟用 ${u.userName}？`
    if (!confirm(label)) return
    run(next ? '正在停用…' : '正在啟用…', () => setMemberDisabled(u.id, next), next ? `已停用 ${u.userName}` : `已啟用 ${u.userName}`)
  }

  const onDelete = (u) => {
    if (!confirm(`確定刪除 ${u.userName}？此操作無法還原。`)) return
    run('正在刪除…', () => deleteMember(u), `已刪除 ${u.userName}`)
  }

  const openPay = async (u) => {
    setPayErr('')
    setPayUser(u)
    setPayForm({ paidAt: todayInput(), amount: '', note: '' })
    try { setPayments(await listPayments(u.id)) } catch { setPayments([]) }
  }

  const submitPay = async (e) => {
    e.preventDefault()
    if (!payUser) return
    setPayErr('')
    setBusyText('正在儲存付費紀錄…')
    setBusy(true)
    try {
      await addPayment(payUser.id, payForm)
      setPayForm({ paidAt: todayInput(), amount: '', note: '' })
      setPayments(await listPayments(payUser.id))
      await load()
      setOk(`已更新 ${payUser.userName} 的付費紀錄`)
    } catch (ex) {
      setPayErr(ex.message || '儲存失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-panel glass admin-members">
      <AdminBusyOverlay show={busy} text={busyText} />
      <div className="admin-members-head">
        <div>
          <h2>管理用戶</h2>
          <p className="admin-hint">共 {list.length} 位會員</p>
        </div>
      </div>
      {err && <div className="gate-err">{err}</div>}
      {ok && <div className="gate-ok">{ok}</div>}
      <div className="member-table-wrap">
        <table className="member-table">
          <thead>
            <tr>
              <th>用戶名稱</th>
              <th>電話</th>
              <th>狀態</th>
              <th>最後上線</th>
              <th>註冊日期</th>
              <th>最近付費</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {!list.length && (
              <tr><td colSpan={7} className="admin-hint">未有會員</td></tr>
            )}
            {list.map(u => (
              <tr key={u.id} className={u.disabled ? 'is-disabled' : ''}>
                <td>
                  <b>{u.userName || '—'}</b>
                  <small>{u.inviteCode ? `邀請碼 ${u.inviteCode}` : '—'}</small>
                </td>
                <td>
                  {u.phone || '—'}
                  <small>{u.phoneVerified ? '已驗證' : '未驗證'}</small>
                </td>
                <td>
                  <span className={`status-pill ${memberTone(u)}`}>{memberStatus(u)}</span>
                  {!u.paid && u.expiresAt && <small>至 {fmtTime(u.expiresAt)}</small>}
                </td>
                <td>{fmtTime(u.lastLoginAt)}</td>
                <td>{fmtTime(u.createdAt)}</td>
                <td>{u.lastPaidAmount ? `HK$${Number(u.lastPaidAmount).toLocaleString()} · ${fmtDate(u.lastPaidAt)}` : '—'}</td>
                <td>
                  <div className="member-actions">
                    <button type="button" onClick={() => onDisable(u)}>{u.disabled ? '啟用' : '停用'}</button>
                    <button type="button" onClick={() => openPay(u)}>更新付費紀錄</button>
                    <button type="button" className="danger" onClick={() => onDelete(u)}>刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payUser && (
        <div className="pay-mask" onClick={() => setPayUser(null)}>
          <form className="pay-card glass" onClick={e => e.stopPropagation()} onSubmit={submitPay}>
            <h3>更新付費紀錄</h3>
            <p className="admin-hint">{payUser.userName} · {payUser.phone}</p>
            <div className="admin-2">
              <label>付費日期<input type="date" value={payForm.paidAt} onChange={e => setPayForm(f => ({ ...f, paidAt: e.target.value }))} required /></label>
              <label>付費金額（HKD）<input type="number" min="1" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="例如 1280" required /></label>
            </div>
            <label>備註（可選）<input value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} placeholder="月費 / 升級等" /></label>
            {payErr && <div className="gate-err">{payErr}</div>}
            <div className="pay-actions">
              <button type="button" className="admin-ghost" onClick={() => setPayUser(null)}>取消</button>
              <button className="lp-btn primary" type="submit" disabled={busy}>儲存紀錄</button>
            </div>
            <div className="pay-history">
              <h4>歷史紀錄</h4>
              {!payments.length && <p className="admin-hint">尚未有付費紀錄</p>}
              {payments.map(p => (
                <div key={p.id} className="pay-row">
                  <span>{fmtDate(p.paidAt)}</span>
                  <b>HK${Number(p.amount || 0).toLocaleString()}</b>
                  <small>{p.note || '—'}</small>
                </div>
              ))}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function memberStatus(u) {
  if (isPaidAccount(u) && !u.disabled) return '已付費'
  if (u.disabled && u.disabledReason === 'trial-expired') return '試用已過期'
  if (u.disabled) return '已停用'
  if (!isPaidAccount(u) && u.expiresAt) return isUnpaidExpired(u) ? '試用已過期' : '試用 1 日'
  return '使用中'
}

function memberTone(u) {
  if (u.disabled || isUnpaidExpired(u)) return 'off'
  if (isPaidAccount(u)) return 'on'
  return 'on'
}

function todayInput() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function toDate(v) {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate()
  if (v.seconds) return new Date(v.seconds * 1000)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function fmtTime(v) {
  const d = toDate(v)
  if (!d) return '—'
  return d.toLocaleString('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(v) {
  const d = toDate(v)
  if (!d) return '—'
  return d.toLocaleDateString('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
