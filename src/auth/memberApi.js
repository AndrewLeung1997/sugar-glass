import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firebaseReady, getDb, getFirebaseAuth, memberEmail } from '../firebase.js'
import { markLoginPending, rotateAuthSession } from './session.js'
import { TRIAL_EXPIRED_MSG, enforceAccountAccess } from './accountAccess.js'

export async function memberPasswordLogin(userName, password) {
  if (!firebaseReady) throw new Error('尚未設定 Firebase。請先填 .env.local')
  const auth = getFirebaseAuth()
  markLoginPending()
  const cred = await signInWithEmailAndPassword(auth, memberEmail(userName), password)
  const snap = await getDoc(doc(getDb(), 'users', cred.user.uid))
  if (!snap.exists()) {
    await signOut(auth).catch(() => {})
    throw new Error('帳戶資料不完整，請聯絡管理員')
  }
  const gated = await enforceAccountAccess(cred.user.uid, snap.data())
  if (gated?.disabled) {
    await signOut(auth).catch(() => {})
    throw new Error(gated.disabledReason === 'trial-expired' ? TRIAL_EXPIRED_MSG : '此帳戶已被停用，請聯絡管理員')
  }
  return { uid: cred.user.uid, ...snap.data() }
}

export function clearMemberRecaptcha() {
  if (window.__velvetRecaptcha) {
    try { window.__velvetRecaptcha.clear() } catch {}
    window.__velvetRecaptcha = null
  }
  window.__velvetRecaptchaOk = false
  const el = document.getElementById('recaptcha-container')
  if (el) el.innerHTML = ''
}

export function isMemberRecaptchaSolved() {
  return Boolean(window.__velvetRecaptchaOk)
}

export async function prepareMemberRecaptcha() {
  const auth = getFirebaseAuth()
  if (!auth) throw new Error('尚未連接 Firebase')
  const el = document.getElementById('recaptcha-container')
  if (!el) throw new Error('驗證框尚未準備好')
  clearMemberRecaptcha()
  const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'normal',
    callback: () => { window.__velvetRecaptchaOk = true },
    'expired-callback': () => { window.__velvetRecaptchaOk = false },
  })
  window.__velvetRecaptcha = verifier
  window.__velvetRecaptchaOk = false
  await verifier.render()
  return verifier
}

export async function sendMemberSms(phone) {
  const auth = getFirebaseAuth()
  if (!auth.currentUser) throw new Error('請先用帳戶密碼登入')
  if (!window.__velvetRecaptchaOk) throw new Error('請先剔選「我不是機器人」')
  const verifier = window.__velvetRecaptcha
  if (!verifier) throw new Error('reCAPTCHA 尚未載入，請稍等再試')
  const provider = new PhoneAuthProvider(auth)
  const verificationId = await provider.verifyPhoneNumber(phone, verifier)
  return verificationId
}

export async function confirmMemberSms(verificationId, code) {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user) throw new Error('登入已過期，請重新登入')
  const cred = PhoneAuthProvider.credential(verificationId, code.trim())
  try {
    await linkWithCredential(user, cred)
  } catch (e) {
    const codeId = e.code || ''
    if (
      codeId === 'auth/provider-already-linked' ||
      codeId === 'auth/credential-already-in-use' ||
      codeId === 'auth/account-exists-with-different-credential'
    ) {
      await reauthenticateWithCredential(user, cred)
    } else {
      throw e
    }
  }
  const db = getDb()
  await updateDoc(doc(db, 'users', user.uid), { phoneVerified: true, lastLoginAt: Date.now() }).catch(() => {})
  await rotateAuthSession(user.uid).catch(() => {})
  return user
}
