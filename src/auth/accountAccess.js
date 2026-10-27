import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { getDb } from '../firebase.js'

export const TRIAL_MS = 24 * 60 * 60 * 1000

export function trialExpiresAt(from = Date.now()) {
  return Number(from) + TRIAL_MS
}

export function isPaidAccount(data) {
  return Boolean(data?.paid)
}

export function isUnpaidExpired(data) {
  if (!data || isPaidAccount(data)) return false
  const exp = Number(data.expiresAt || 0)
  return exp > 0 && Date.now() > exp
}

export async function enforceAccountAccess(uid, data) {
  if (!uid || !data) return data
  if (data.disabled) return data
  if (!isUnpaidExpired(data)) return data
  const patch = {
    disabled: true,
    disabledAt: Date.now(),
    disabledReason: 'trial-expired',
  }
  await updateDoc(doc(getDb(), 'users', uid), patch).catch(() => {})
  await setDoc(doc(getDb(), 'authSessions', uid), {
    sessionId: `expired-${Date.now()}`,
    startedAt: Date.now(),
    userAgent: 'trial-expired',
  }).catch(() => {})
  return { ...data, ...patch }
}

export const TRIAL_EXPIRED_MSG = '試用已過期，未付費帳戶已自動停用。請聯絡客服或完成付費後再登入。'
