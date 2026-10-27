import { doc, setDoc } from 'firebase/firestore'
import { getDb } from '../firebase.js'

const LOCAL_KEY = 'velvet-session-id'
const PENDING_KEY = 'velvet-login-pending'
const KICKED_KEY = 'velvet-session-kicked'

export const SESSION_KICK_MSG = '此帳戶已在其他裝置登入，你已被登出。'

export function newSessionId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function getLocalSession() {
  try { return localStorage.getItem(LOCAL_KEY) || '' } catch { return '' }
}

export function setLocalSession(id) {
  try { localStorage.setItem(LOCAL_KEY, id) } catch {}
}

export function clearLocalSession() {
  try { localStorage.removeItem(LOCAL_KEY) } catch {}
}

export function markLoginPending() {
  try { sessionStorage.setItem(PENDING_KEY, '1') } catch {}
}

export function clearLoginPending() {
  try { sessionStorage.removeItem(PENDING_KEY) } catch {}
}

export function isLoginPending() {
  try { return sessionStorage.getItem(PENDING_KEY) === '1' } catch { return false }
}

export function markKicked() {
  try { sessionStorage.setItem(KICKED_KEY, '1') } catch {}
}

export function peekKicked() {
  try { return sessionStorage.getItem(KICKED_KEY) === '1' } catch { return false }
}

export function clearKickedFlag() {
  try { sessionStorage.removeItem(KICKED_KEY) } catch {}
}

export async function writeAuthSession(uid, sessionId) {
  await setDoc(doc(getDb(), 'authSessions', uid), {
    sessionId,
    startedAt: Date.now(),
    userAgent: String(navigator.userAgent || '').slice(0, 180),
  })
}

export async function rotateAuthSession(uid) {
  const id = newSessionId()
  markLoginPending()
  setLocalSession(id)
  await writeAuthSession(uid, id)
  clearLoginPending()
  clearKickedFlag()
  return id
}
