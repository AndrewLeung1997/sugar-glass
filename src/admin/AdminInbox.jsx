import { useEffect, useRef, useState } from 'react'
import { listSupportTickets, mergeChatMessages, sendStaffReply, setTicketStatus, watchConversationMessages, watchConversations } from '../chat/chatApi.js'
import AdminBusyOverlay from './AdminBusyOverlay.jsx'

function when(value) {
  const t = value?.toDate ? value.toDate() : value
  if (!t) return '—'
  const d = t instanceof Date ? t : new Date(t)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-HK', { hour12: false })
}

function roleLabel(role) {
  if (role === 'user') return '訪客'
  if (role === 'staff') return '職員'
  if (role === 'system') return '系統'
  return '助理'
}

export default function AdminInbox() {
  const [tab, setTab] = useState('chats')
  const [tickets, setTickets] = useState([])
  const [threads, setThreads] = useState([])
  const [openId, setOpenId] = useState('')
  const [msgs, setMsgs] = useState([])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  const loadTickets = async () => {
    try { setTickets(await listSupportTickets()) } catch (ex) { setErr(ex.message || '讀取工單失敗') }
  }

  useEffect(() => { loadTickets() }, [])

  useEffect(() => {
    return watchConversations((list, error) => {
      if (error) { setErr(error.message || '讀取對話失敗'); return }
      if (list) setThreads(list)
    })
  }, [])

  useEffect(() => {
    if (!openId) { setMsgs([]); return undefined }
    return watchConversationMessages(openId, (next, error) => {
      if (error) { setErr(error.message || '讀取訊息失敗'); return }
      if (!next) return
      setMsgs(next)
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      })
    })
  }, [openId])

  const openThread = (id) => {
    setTab('chats')
    setOpenId(id)
    setErr('')
  }

  const closeTicket = async (id) => {
    setBusy(true)
    try {
      await setTicketStatus(id, 'closed')
      await loadTickets()
    } catch (ex) {
      setErr(ex.message || '更新失敗')
    } finally {
      setBusy(false)
    }
  }

  const send = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !openId || sending) return
    setSending(true)
    setErr('')
    try {
      await sendStaffReply(openId, text)
      setDraft('')
    } catch (ex) {
      setErr(ex.message || '傳送失敗')
    } finally {
      setSending(false)
    }
  }

  const current = threads.find(item => item.id === openId)
  const ticketHistory = tickets.find(t => t.conversationId === openId)?.transcript || []
  const threadMsgs = mergeChatMessages(current?.transcript, ticketHistory, msgs)

  return (
    <div className="admin-panel glass admin-inbox">
      <AdminBusyOverlay show={busy} text="處理中…" />
      <div className="admin-members-head">
        <div>
          <h2>客服對話</h2>
          <p className="admin-hint">加密即時對話。回覆會即時出現喺訪客 chatbot。</p>
        </div>
        <div className="chatbot-chips">
          <button type="button" className={tab === 'chats' ? 'on' : ''} onClick={() => setTab('chats')}>對話</button>
          <button type="button" className={tab === 'tickets' ? 'on' : ''} onClick={() => setTab('tickets')}>工單</button>
        </div>
      </div>
      {err && <div className="gate-err">{err}</div>}

      {tab === 'tickets' && (
        <div className="member-table-wrap">
          <table className="member-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>原因</th>
                <th>聯絡</th>
                <th>內容</th>
                <th>狀態</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!tickets.length && <tr><td colSpan={6} className="admin-hint">未有工單</td></tr>}
              {tickets.map(t => (
                <tr key={t.id}>
                  <td>{when(t.createdAt)}</td>
                  <td>{t.reason || '—'}</td>
                  <td>{t.contact || t.name || '—'}</td>
                  <td className="inbox-clip">{t.message}</td>
                  <td>{t.status === 'closed' ? '已結束' : '待處理'}</td>
                  <td>
                    {t.conversationId && (
                      <button type="button" className="admin-ghost" onClick={() => openThread(t.conversationId)}>回覆</button>
                    )}
                    {t.status !== 'closed' && (
                      <button type="button" className="admin-ghost" onClick={() => closeTicket(t.id)}>結束</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'chats' && (
        <div className="inbox-split">
          <div className="inbox-list">
            {!threads.length && <p className="admin-hint">未有對話。訪客喺主頁開啟 chatbot 後會出現喺度。</p>}
            {threads.map(item => (
              <button
                key={item.id}
                type="button"
                className={`inbox-item ${openId === item.id ? 'on' : ''}`}
                onClick={() => openThread(item.id)}
              >
                <b>{item.lastRole === 'user' ? '訪客待回覆' : item.staffJoined ? '職員已加入' : 'Chatbot'}</b>
                <small>{when(item.updatedAt)} · {item.messageCount} 則 · 已加密</small>
                <span>{item.preview || '（無預覽）'}</span>
              </button>
            ))}
          </div>
          <div className="inbox-thread live">
            {!openId && <p className="admin-hint">選擇一則對話開始回覆</p>}
            {openId && (
              <>
                <div className="inbox-thread-head">
                  <div>
                    <b>即時對話</b>
                    <small>{current?.staffJoined ? '職員已加入 · 加密傳送' : '加密傳送'}</small>
                  </div>
                </div>
                <div className="inbox-thread-list" ref={listRef}>
                  {threadMsgs.map((m, i) => (
                    <div key={m.id || `${m.role}-${i}`} className={`chatbot-msg ${m.role}`}>
                      <small className="inbox-role">{roleLabel(m.role)}</small>
                      {m.text}
                    </div>
                  ))}
                  {!threadMsgs.length && <p className="admin-hint">尚未有訊息</p>}
                </div>
                <form className="chatbot-input inbox-composer" onSubmit={send}>
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={sending ? '傳送中…' : '輸入回覆，訪客會即時看到'}
                    disabled={sending}
                  />
                  <button type="submit" disabled={sending || !draft.trim()}>傳送</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
