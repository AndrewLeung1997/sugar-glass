import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import {
  clearMemberRecaptcha,
  confirmMemberSms,
  isMemberRecaptchaSolved,
  memberPasswordLogin,
  prepareMemberRecaptcha,
  sendMemberSms,
} from '../auth/memberApi.js'
import { firebaseReady, getFirebaseAuth, normalizePhone } from '../firebase.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { go } from '../nav.js'
import { SESSION_KICK_MSG, clearLoginPending } from '../auth/session.js'

const OTP_LEN = 6

export default function MemberLogin({ onSuccess }) {
  const { firebaseReady: readyFlag, kicked, clearKicked } = useAuth()
  const enabled = readyFlag && firebaseReady
  const [step, setStep] = useState('password') // password | captcha | otp
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)
  const [captchaReady, setCaptchaReady] = useState(false)
  const [captchaOk, setCaptchaOk] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    if (step !== 'captcha') return
    let alive = true
    setCaptchaReady(false)
    setCaptchaOk(false)
    const tick = setInterval(() => {
      if (isMemberRecaptchaSolved()) setCaptchaOk(true)
    }, 400)
    ;(async () => {
      try {
        await prepareMemberRecaptcha()
        if (alive) setCaptchaReady(true)
      } catch (ex) {
        if (alive) fail(ex)
      }
    })()
    return () => {
      alive = false
      clearInterval(tick)
    }
  }, [step])

  useEffect(() => () => clearMemberRecaptcha(), [])

  const fail = (ex) => {
    setErr(mapErr(ex))
    setShake(n => n + 1)
  }

  const start = async (e) => {
    e.preventDefault()
    setErr('')
    clearKicked()
    setBusy(true)
    try {
      const rec = await memberPasswordLogin(userName, password)
      const tel = rec.phone || normalizePhone(rec.phone)
      if (!tel) throw new Error('此帳戶未登記電話，請聯絡管理員')
      setPhone(tel)
      setStep('captcha')
    } catch (ex) {
      clearLoginPending()
      const auth = getFirebaseAuth()
      if (auth?.currentUser) await signOut(auth).catch(() => {})
      fail(ex)
    } finally {
      setBusy(false)
    }
  }

  const sendSms = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      if (!phone) throw new Error('此帳戶未登記電話，請聯絡管理員')
      const vid = await sendMemberSms(phone)
      setVerificationId(vid)
      setCode('')
      setStep('otp')
    } catch (ex) {
      fail(ex)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e, pin = code) => {
    e?.preventDefault()
    const otp = String(pin || '').replace(/\D/g, '').slice(0, OTP_LEN)
    if (otp.length !== OTP_LEN) {
      setErr('請輸入 6 位驗證碼')
      setShake(n => n + 1)
      return
    }
    if (submitting.current) return
    submitting.current = true
    setErr('')
    setBusy(true)
    try {
      await confirmMemberSms(verificationId, otp)
      if (onSuccess) onSuccess()
      else go('/')
    } catch (ex) {
      fail(ex)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  if (!enabled) {
    return (
      <div className="gate">
        <div className="gate-card glass">
          <h1>會員登入</h1>
          <p>尚未連接 Firebase。請先完成專案設定。</p>
          <a className="gate-link" href="/" onClick={e => { e.preventDefault(); go('/') }}>返回</a>
        </div>
      </div>
    )
  }

  return (
    <div className="gate">
      <form
        className={`gate-card glass ${step === 'otp' ? 'is-otp' : ''}`}
        onSubmit={step === 'password' ? start : step === 'captcha' ? sendSms : (e) => verify(e)}
      >
        <div className="gate-brand">Velvet</div>
        <h1 key={step} className="gate-title">{step === 'otp' ? '輸入驗證碼' : step === 'captcha' ? '安全驗證' : '會員登入'}</h1>
        {kicked && <div className="gate-err gate-err-in">{SESSION_KICK_MSG}</div>}
        <div key={`pane-${step}`} className="gate-pane">
          {step === 'password' && (
            <>
              <p className="gate-sub">輸入用戶名稱同密碼。請用 http://localhost:5173 開啟。</p>
              <label>用戶名稱<input value={userName} onChange={e => setUserName(e.target.value)} autoComplete="username" required /></label>
              <label>密碼<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
            </>
          )}
          {step === 'captcha' && (
            <p className="gate-sub">{captchaReady ? `請剔選「我不是機器人」，再發送驗證碼到 ${mask(phone)}。` : '正在載入驗證…'}</p>
          )}
          {step === 'otp' && (
            <>
              <p className="gate-sub">已發送 6 位驗證碼到 {mask(phone)}</p>
              <OtpBoxes
                value={code}
                onChange={v => { setCode(v); if (err) setErr('') }}
                onComplete={(pin) => verify(null, pin)}
                disabled={busy}
                error={!!err}
                shakeKey={shake}
              />
            </>
          )}
        </div>
        {err && <div key={shake} className="gate-err gate-err-in">{err}</div>}
        <button
          className="lp-btn primary"
          type="submit"
          disabled={busy || (step === 'otp' && code.length !== OTP_LEN) || (step === 'captcha' && (!captchaReady || !captchaOk))}
        >
          {busy ? '處理中…' : step === 'otp' ? '確認登入' : step === 'captcha' ? (captchaOk ? '發送驗證碼' : '請先完成驗證') : '下一步'}
        </button>
        {(step === 'otp' || step === 'captcha') && (
          <button type="button" className="gate-link" onClick={async () => {
            setStep('password')
            setCode('')
            setErr('')
            submitting.current = false
            clearLoginPending()
            clearMemberRecaptcha()
            const auth = getFirebaseAuth()
            if (auth?.currentUser) await signOut(auth).catch(() => {})
          }}>返回</button>
        )}
        <a className="gate-link" href="/" onClick={e => { e.preventDefault(); go('/') }}>返回網站</a>
        <div id="recaptcha-container" className="recaptcha-box" hidden={step !== 'captcha'} />
      </form>
    </div>
  )
}

function OtpBoxes({ value, onChange, onComplete, disabled, error, shakeKey }) {
  // single hidden input — avoids per-cell maxLength focus trap
  const inputRef = useRef(null)
  const rowRef = useRef(null)
  const done = useRef(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [])

  useEffect(() => {
    const el = rowRef.current
    if (!el || !shakeKey) return
    el.classList.remove('is-error')
    void el.offsetWidth
    el.classList.add('is-error')
  }, [shakeKey])

  useEffect(() => {
    if (value.length < OTP_LEN) done.current = false
  }, [value])

  const setPin = (raw) => {
    const pin = String(raw || '').replace(/\D/g, '').slice(0, OTP_LEN)
    onChange(pin)
    if (pin.length === OTP_LEN && !done.current) {
      done.current = true
      onComplete?.(pin)
    }
  }

  const cursor = Math.min(value.length, OTP_LEN - 1)

  return (
    <div
      ref={rowRef}
      className={`otp-row ${error ? 'is-error' : ''} ${disabled ? 'is-busy' : ''}`}
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        className="otp-hidden"
        value={value}
        onChange={e => setPin(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCorrect="off"
        spellCheck={false}
        pattern="[0-9]*"
        maxLength={OTP_LEN}
        disabled={disabled}
        aria-label="6 位 SMS 驗證碼"
      />
      {Array.from({ length: OTP_LEN }, (_, i) => (
        <div
          key={i}
          className={`otp-cell ${value[i] ? 'filled' : ''} ${!disabled && i === cursor ? 'on' : ''}`}
          style={{ animationDelay: `${80 + i * 55}ms` }}
          aria-hidden="true"
        >
          {value[i] || ''}
        </div>
      ))}
    </div>
  )
}

function mask(phone) {
  const s = String(phone || '')
  if (s.length < 6) return s
  return `${s.slice(0, 4)}****${s.slice(-2)}`
}

function mapErr(ex) {
  const c = ex.code || ''
  const m = String(ex.message || '')
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return '用戶名稱或密碼不正確'
  if (c.includes('too-many-requests')) return '嘗試次數過多，請稍後再試'
  if (c.includes('invalid-verification-code')) return '驗證碼不正確'
  if (c.includes('captcha') || c.includes('argument') || c.includes('invalid-app-credential')) {
    const host = location.hostname
    return `SMS / reCAPTCHA 未通過。請到 Firebase Console → Authentication → Settings → Authorized domains 加入「${host}」同 localhost。並確認 Sign-in method 已開啟 Phone。本機請用 http://localhost:5173 而唔好用 127.0.0.1。`
  }
  if (c.includes('operation-not-allowed') || m.includes('region enabled')) {
    return 'Firebase 尚未開放此地區的 SMS。請到 Console → Authentication → Settings → SMS region policy，允許 Hong Kong（+852）。同時確認已開啟 Phone 登入，專案需 Blaze 計劃。'
  }
  return ex.message || '登入失敗'
}
