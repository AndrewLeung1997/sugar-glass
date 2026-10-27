import { useEffect, useRef, useState } from 'react'
import { detectIntent, matchKnowledge } from './knowledge.js'
import { COMMAND_HELP, filterCommands, parseChatCommand } from './commands.js'
import {
  appendConversationMessage,
  checkRegisterAvailable,
  checkUserNameFormat,
  completeChatRegister,
  createSupportTicket,
  ensureConversation,
  mergeChatMessages,
  saveTranscript,
  clearChatRecaptcha,
  isChatRecaptchaSolved,
  prepareChatRecaptcha,
  prepareChatRegisterSession,
  sendChatSms,
  watchConversationMessages,
} from './chatApi.js'

const WELCOME = '你好，我係 Velvet 助理。輸入 / 可以叫出指令，例如 /register 註冊、/human 轉人工、/bot 返回助理。'

export default function Chatbot({ onRegistered, lift }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState(() => [bot(WELCOME)])
  const [flow, setFlow] = useState('idle')
  const [unread, setUnread] = useState(0)
  const [formErr, setFormErr] = useState('')
  const [otp, setOtp] = useState('')
  const draft = useRef({})
  const listRef = useRef(null)
  const seeded = useRef(false)
  const openRef = useRef(false)
  const messagesRef = useRef(messages)
  const seenStaff = useRef(new Set())
  const preferBot = useRef(false)

  useEffect(() => { openRef.current = open }, [open])
  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    const timer = setTimeout(() => {
      saveTranscript(messagesRef.current).catch(() => {})
    }, 400)
    return () => clearTimeout(timer)
  }, [messages])

  useEffect(() => {
    let stop = () => {}
    let alive = true
    ensureConversation()
      .then((id) => {
        if (!alive) return
        stop = watchConversationMessages(id, (rows) => {
          if (!rows) return
          const incomingStaff = rows.filter(m => m.role === 'staff' && !seenStaff.current.has(m.id))
          incomingStaff.forEach(m => seenStaff.current.add(m.id))
          setMessages(curr => mergeChatMessages(curr, rows))
          if (incomingStaff.length && !preferBot.current) {
            setFlow('live-staff')
            if (!openRef.current) setUnread(n => n + incomingStaff.length)
          } else if (incomingStaff.length && preferBot.current && !openRef.current) {
            setUnread(n => n + incomingStaff.length)
          }
          requestAnimationFrame(() => {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
          })
        })
      })
      .catch(() => {})
    return () => { alive = false; stop() }
  }, [])

  const persist = (msg) => {
    appendConversationMessage({ role: msg.role, text: msg.text }).catch(() => {})
  }

  const push = (msg) => {
    setMessages(m => [...m, msg])
    persist(msg)
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const startRegister = () => {
    preferBot.current = true
    draft.current = {}
    setFormErr('')
    setOtp('')
    setFlow('reg-form')
    push(bot('請填寫註冊表單：用戶名稱、密碼、電話。如果用戶名稱同電話都未有人註冊，我會發送 SMS 驗證碼。輸入 /cancel 可取消。'))
  }

  const returnToBot = () => {
    preferBot.current = true
    draft.current = {}
    setFormErr('')
    setOtp('')
    setFlow('idle')
    push(bot('已返回助理。輸入 /help 睇指令，或者 /human 再轉人工。'))
  }

  const startHuman = (reason, existingMsg) => {
    preferBot.current = false
    draft.current = { reason, message: existingMsg || '' }
    if (existingMsg) {
      setFlow('human-contact')
      push(bot('知識庫冇足夠資料，我幫你轉介人工客服。請留下聯絡電話或電郵。輸入 /bot 可返回助理。'))
      return
    }
    setFlow('human-msg')
    push(bot('我幫你轉介人工客服。請先講你想問嘅內容。輸入 /bot 可返回助理。'))
  }

  const runCommand = (cmd) => {
    if (cmd.id === 'help') {
      push(bot(`可用指令：\n${COMMAND_HELP}`))
      return
    }
    if (cmd.id === 'bot' || cmd.id === 'cancel') return returnToBot()
    if (cmd.id === 'human') return startHuman('user-request')
    if (cmd.id === 'register') return startRegister()
    if (cmd.id === 'faq') {
      const hit = matchKnowledge('入會事宜')
      push(bot(hit?.answer || '女性會員免費註冊，男士需審核。可用 /register 開戶。'))
      setFlow('idle')
      preferBot.current = true
      return
    }
    push(bot(`未有呢個指令。輸入 /help 睇全部指令。`))
  }

  const handleText = async (raw) => {
    const text = String(raw || '').trim()
    if (!text || busy) return
    setInput('')
    const cmd = parseChatCommand(text)
    push(user(text))
    if (cmd) return runCommand(cmd)
    if (flow === 'live-staff') return
    if (flow === 'reg-form') return
    if (flow === 'reg-otp') return onRegOtp(text)
    if (flow === 'human-msg') return onHumanMsg(text)
    if (flow === 'human-contact') return onHumanContact(text)

    const intent = detectIntent(text)
    if (intent === 'register') return startRegister()
    if (intent === 'human') return startHuman('user-request')
    const hit = matchKnowledge(text)
    if (hit) {
      push(bot(hit.answer))
      if (hit.id === 'join' || hit.id === 'query') {
        draft.current = {}
        setFormErr('')
        setOtp('')
        setFlow('reg-form')
      }
      return
    }
    startHuman('kb-miss', text)
  }

  const submitRegister = async ({ userName, password, confirmPassword, phone }) => {
    setFormErr('')
    if (!checkUserNameFormat(userName)) {
      setFormErr('用戶名稱需 3–24 位英數')
      return
    }
    if (String(password || '').length < 6) {
      setFormErr('密碼至少 6 位')
      return
    }
    if (password !== confirmPassword) {
      setFormErr('兩次輸入嘅密碼不一致')
      return
    }
    setBusy(true)
    try {
      const check = await checkRegisterAvailable(userName, phone)
      if (!check.available) {
        if (check.nameTaken && check.phoneTaken) setFormErr('呢個用戶名稱同電話都已經註冊。請用「會員登入」。')
        else if (check.nameTaken) setFormErr('呢個用戶名稱已被使用，請換一個。')
        else setFormErr('呢個電話已經註冊。請用「會員登入」。')
        return
      }
      draft.current = { userName: check.userName, password, phone: check.phone }
      push(user(`已提交註冊表單（${check.userName} / ${mask(check.phone)}）`))
      const confirmation = await sendChatSms(check.phone)
      draft.current.confirmation = confirmation
      setOtp('')
      setFlow('reg-otp')
      push(bot(`已發送驗證碼到 ${mask(check.phone)}。請輸入 6 位數字。`))
    } catch (ex) {
      setFormErr(mapChatError(ex))
    } finally {
      setBusy(false)
    }
  }

  const onRegOtp = async (text) => {
    setBusy(true)
    setFormErr('')
    try {
      const rec = await completeChatRegister({
        userName: draft.current.userName,
        phone: draft.current.phone,
        password: draft.current.password,
        confirmation: draft.current.confirmation,
        code: text,
      })
      draft.current.password = ''
      setFlow('done')
      push(bot(`開戶成功。一次性邀請碼：${rec.inviteCode}\n請妥善保存。帳戶有效 1 日，未付費將自動停用。請用你設定嘅密碼登入。`))
    } catch (ex) {
      setFormErr(ex.message || '驗證失敗，請再試一次。')
    } finally {
      setBusy(false)
    }
  }

  const onHumanMsg = (text) => {
    draft.current.message = text
    setFlow('human-contact')
    push(bot('請留下聯絡電話或電郵，職員會稍後回覆。'))
  }

  const onHumanContact = async (text) => {
    setBusy(true)
    try {
      await createSupportTicket({
        name: '訪客',
        contact: text,
        message: draft.current.message,
        reason: draft.current.reason,
        transcript: messagesRef.current,
      })
      preferBot.current = false
      setFlow('live-staff')
      push(bot('已轉介人工客服。你可以繼續喺度留言。輸入 /bot 可返回助理。'))
    } catch (ex) {
      setFlow('idle')
      push(bot(mapChatError(ex)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`chatbot ${open ? 'open' : ''} ${lift ? 'lift' : ''}`}>
      {open && (
        <div className={`chatbot-panel glass${flow === 'reg-form' || flow === 'reg-otp' ? ' form-focus' : ''}`}>
          <div className="chatbot-head">
            <div>
              <b>Velvet Concierge</b>
              <small>{flow === 'live-staff' ? '職員對話中 · 已加密' : '入會助理 · 對話已加密'}</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="關閉">✕</button>
          </div>
          <div className="chatbot-list" ref={listRef}>
            {messages.map(m => (
              <div key={m.id} className={`chatbot-msg ${m.role}`}>
                {m.role === 'staff' && <small className="inbox-role">職員</small>}
                {m.text}
              </div>
            ))}
          </div>
          {(flow === 'idle' || flow === 'done' || flow === 'live-staff' || flow === 'human-msg' || flow === 'human-contact') && (
            <div className="chatbot-chips">
              {flow === 'live-staff' || flow === 'human-msg' || flow === 'human-contact' ? (
                <>
                  <button type="button" onClick={() => handleText('/bot')}>/bot 返回助理</button>
                  <button type="button" onClick={() => handleText('/register')}>/register</button>
                  <button type="button" onClick={() => handleText('/help')}>/help</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => handleText('/faq')}>/faq 入會</button>
                  <button type="button" onClick={() => handleText('/register')}>/register</button>
                  <button type="button" onClick={() => handleText('/human')}>/human</button>
                  <button type="button" onClick={() => handleText('/help')}>/help</button>
                </>
              )}
              {flow === 'done' && onRegistered && (
                <button type="button" onClick={onRegistered}>前往男士專區</button>
              )}
            </div>
          )}
          {flow === 'reg-form' && (
            <RegisterForm
              busy={busy}
              error={formErr}
              onSubmit={submitRegister}
              onCancel={() => { setFlow('idle'); setFormErr(''); push(bot('已取消註冊。')) }}
            />
          )}
          {flow === 'reg-otp' && (
            <OtpForm
              busy={busy}
              error={formErr}
              value={otp}
              onChange={setOtp}
              onSubmit={onRegOtp}
              onCancel={() => { setFlow('reg-form'); setFormErr(''); setOtp('') }}
            />
          )}
          {flow !== 'reg-form' && flow !== 'reg-otp' && (
            <div className="chatbot-composer">
              {filterCommands(input).length > 0 && (
                <div className="chatbot-cmd-list">
                  {filterCommands(input).map(item => (
                    <button key={item.id} type="button" onClick={() => handleText(item.label)}>
                      <b>{item.label}</b>
                      <span>{item.hint}</span>
                    </button>
                  ))}
                </div>
              )}
              <form className="chatbot-input" onSubmit={e => { e.preventDefault(); handleText(input) }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={busy ? '處理中…' : flow === 'live-staff' ? '傳送俾職員，或輸入 /bot' : '輸入訊息或 / 指令'}
                  disabled={busy}
                />
                <button type="submit" disabled={busy || !input.trim()}>送出</button>
              </form>
            </div>
          )}
        </div>
      )}
      <button type="button" className="chatbot-fab" onClick={() => {
        const next = !open
        setOpen(next)
        if (next) setUnread(0)
        if (next && !seeded.current) {
          seeded.current = true
          ensureConversation()
            .then(() => persist({ role: 'bot', text: WELCOME }))
            .catch(() => {})
        }
      }} aria-label="開啟客服">
        {open ? '✕' : '✦'}
        {!open && unread > 0 && <i className="chatbot-fab-badge">{unread > 9 ? '9+' : unread}</i>}
      </button>
    </div>
  )
}

function RegisterForm({ busy, error, onSubmit, onCancel }) {
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [captchaReady, setCaptchaReady] = useState(false)
  const [captchaOk, setCaptchaOk] = useState(false)
  const [captchaErr, setCaptchaErr] = useState('')
  useEffect(() => {
    let alive = true
    const tick = setInterval(() => {
      if (isChatRecaptchaSolved()) setCaptchaOk(true)
    }, 400)
    ;(async () => {
      try {
        await prepareChatRegisterSession()
        if (!alive) return
        await prepareChatRecaptcha()
        if (alive) setCaptchaReady(true)
      } catch (ex) {
        if (alive) setCaptchaErr(ex.message || 'reCAPTCHA 載入失敗')
      }
    })()
    return () => {
      alive = false
      clearInterval(tick)
      clearChatRecaptcha()
    }
  }, [])
  return (
    <form
      className="chatbot-form"
      onSubmit={e => {
        e.preventDefault()
        onSubmit({ userName, password, confirmPassword, phone })
      }}
    >
      <b>註冊開戶</b>
      <label>用戶名稱
        <input value={userName} onChange={e => setUserName(e.target.value)} autoComplete="username" placeholder="3–24 位英數" disabled={busy} required />
      </label>
      <label>密碼
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="至少 6 位" disabled={busy} required />
      </label>
      <label>確認密碼
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="再輸入一次密碼" disabled={busy} required />
      </label>
      <label>電話號碼
        <input value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" placeholder="香港 8 位或 +852" disabled={busy} required />
      </label>
      <p className="admin-hint">{captchaReady ? '請剔選「我不是機器人」，再發送驗證碼。' : '正在載入驗證…'}</p>
      <div id="chat-recaptcha" className="chatbot-recaptcha" />
      {captchaErr && <div className="chatbot-form-err">{captchaErr}</div>}
      {error && <div className="chatbot-form-err">{error}</div>}
      <div className="chatbot-form-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={busy}>取消</button>
        <button type="submit" disabled={busy || !captchaReady || !captchaOk}>{busy ? '正在發送驗證碼…' : captchaOk ? '發送驗證碼' : '請先完成驗證'}</button>
      </div>
    </form>
  )
}

function OtpForm({ busy, error, value, onChange, onSubmit, onCancel }) {
  return (
    <form
      className="chatbot-form"
      onSubmit={e => {
        e.preventDefault()
        onSubmit(value)
      }}
    >
      <b>電話驗證</b>
      <p className="admin-hint">輸入 6 位 SMS 驗證碼</p>
      <ChatOtp value={value} onChange={onChange} onComplete={onSubmit} disabled={busy} error={Boolean(error)} />
      {error && <div className="chatbot-form-err">{error}</div>}
      <div className="chatbot-form-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={busy}>返回</button>
        <button type="submit" disabled={busy || String(value || '').length !== 6}>{busy ? '驗證中…' : '完成註冊'}</button>
      </div>
    </form>
  )
}

function ChatOtp({ value, onChange, onComplete, disabled, error }) {
  const inputRef = useRef(null)
  const done = useRef(false)
  useEffect(() => { if (String(value || '').length < 6) done.current = false }, [value])
  return (
    <div className={`otp-row ${error ? 'is-error' : ''} ${disabled ? 'is-busy' : ''}`} onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        className="otp-hidden"
        value={value}
        onChange={e => {
          const pin = String(e.target.value || '').replace(/\D/g, '').slice(0, 6)
          onChange(pin)
          if (pin.length === 6 && !done.current) {
            done.current = true
            onComplete?.(pin)
          }
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={disabled}
        aria-label="6 位 SMS 驗證碼"
      />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={`otp-cell ${value[i] ? 'filled' : ''} ${!disabled && i === Math.min(value.length, 5) ? 'on' : ''}`} aria-hidden="true">
          {value[i] || ''}
        </div>
      ))}
    </div>
  )
}

function bot(text) {
  return { id: uid(), role: 'bot', text }
}
function user(text) {
  return { id: uid(), role: 'user', text }
}
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
function mapChatError(ex) {
  const c = ex.code || ''
  const m = String(ex.message || '')
  if (/permission|insufficient/i.test(m)) return '加密工單暫時寫唔入伺服器。請喺 Firebase 發佈最新 Firestore rules 後再試。'
  if (c.includes('invalid-app-credential') || c.includes('captcha') || /recaptcha|captcha/i.test(m)) {
    return 'reCAPTCHA 驗證失敗。請重新打開 /register，剔選「我不是機器人」後再發送。請用 http://localhost:5173。'
  }
  if (c.includes('too-many-requests')) return '嘗試次數過多，請稍後再試'
  return m || '提交失敗，請稍後再試。'
}

function mask(phone) {
  const s = String(phone || '')
  if (s.length < 6) return s
  return `${s.slice(0, 4)}****${s.slice(-2)}`
}
