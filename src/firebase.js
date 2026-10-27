import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyADnaXydXBmyqXu3lauauF2-qpzCN8Xwb0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dating-high-end.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dating-high-end',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dating-high-end.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '770592004990',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:770592004990:web:21d1aa62fc34e82be5b12f',
}

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

export const MEMBER_EMAIL_DOMAIN = 'members.velvet.app'
export const memberEmail = (userName) =>
  `${String(userName || '').trim().toLowerCase()}@${MEMBER_EMAIL_DOMAIN}`

export function phoneKey(raw) {
  return normalizePhone(raw).replace(/\D/g, '')
}

export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (String(raw).trim().startsWith('+')) return `+${digits}`
  if (digits.startsWith('852') && digits.length >= 11) return `+${digits}`
  if (digits.length === 8) return `+852${digits}`
  return `+${digits}`
}

let app
let secondaryApp

function getApp() {
  if (!firebaseReady) return null
  if (!app) app = getApps().find(a => a.name === '[DEFAULT]') || initializeApp(firebaseConfig)
  return app
}

export function getFirebaseAuth() {
  const a = getApp()
  return a ? getAuth(a) : null
}

export function getDb() {
  const a = getApp()
  return a ? getFirestore(a) : null
}

export function getBucket() {
  const a = getApp()
  return a ? getStorage(a) : null
}

/** 第二個 Auth instance：admin 開戶時唔會登出自己 */
export function getSecondaryAuth() {
  if (!firebaseReady) return null
  if (!secondaryApp) {
    secondaryApp = getApps().find(a => a.name === 'secondary') || initializeApp(firebaseConfig, 'secondary')
  }
  return getAuth(secondaryApp)
}
