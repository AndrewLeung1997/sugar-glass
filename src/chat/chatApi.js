import {
  EmailAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { firebaseReady, getDb, getFirebaseAuth, memberEmail, normalizePhone, phoneKey } from '../firebase.js'
import { rotateAuthSession } from '../auth/session.js'
import { trialExpiresAt } from '../auth/accountAccess.js'
import { decryptJson, decryptText, encryptJson, encryptText, isCipher } from '../crypto/conversation.js'

const CONV_STORE = 'velvet-conv-v1'

function conversationId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export function getLocalConversationId() {
  try {
    const raw = sessionStorage.getItem(CONV_STORE)
    if (!raw) return ''
    return JSON.parse(raw).id || ''
  } catch {
    return ''
  }
}

let pendingConversation = null

export async function ensureConversation(channel = 'chatbot') {
  if (!firebaseReady) throw new Error('尚未連接 Firebase')
  const existing = getLocalConversationId()
  if (existing) return existing
  if (pendingConversation) return pendingConversation
  pendingConversation = (async () => {
    const id = conversationId()
    await setDoc(doc(getDb(), 'conversations', id), {
      channel,
      encrypted: true,
      alg: 'A256GCM',
      messageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    sessionStorage.setItem(CONV_STORE, JSON.stringify({ id }))
    return id
  })()
  try {
    return await pendingConversation
  } finally {
    pendingConversation = null
  }
}

export async function appendConversationMessage({ role, text, conversationId: forcedId }) {
  if (!firebaseReady) return null
  const body = String(text || '')
  if (!body) return null
  const id = forcedId || await ensureConversation()
  const aad = `${id}:${role}`
  const enc = await encryptText(body, aad)
  const ref = await addDoc(collection(getDb(), 'conversations', id, 'messages'), {
    role,
    enc,
    encrypted: true,
    createdAt: serverTimestamp(),
  })
  const previewEnc = await encryptText(body.slice(0, 160), `${id}:preview`)
  const patch = {
    previewEnc,
    updatedAt: serverTimestamp(),
    messageCount: increment(1),
    lastRole: role,
  }
  if (role === 'staff') patch.staffJoined = true
  await updateDoc(doc(getDb(), 'conversations', id), patch).catch(() => {})
  return { id: ref.id, conversationId: id, role, text: body }
}

export function mergeChatMessages(...lists) {
  const seen = new Set()
  const out = []
  for (const list of lists) {
    for (const item of list || []) {
      const role = item?.role || 'bot'
      const text = String(item?.text || '').trim()
      if (!text) continue
      const key = `${role}::${text}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ ...item, role, text })
    }
  }
  return out
}

function compactTranscript(messages) {
  return mergeChatMessages(messages).map(m => ({ role: m.role, text: m.text }))
}

export async function saveTranscript(messages, conversationId) {
  if (!firebaseReady) return ''
  const id = conversationId || await ensureConversation()
  const rows = compactTranscript(messages)
  const transcriptEnc = await encryptJson(rows, `${id}:transcript`)
  await updateDoc(doc(getDb(), 'conversations', id), {
    transcriptEnc,
    updatedAt: serverTimestamp(),
  })
  return id
}

export async function sendStaffReply(conversationId, text) {
  const body = String(text || '').trim()
  if (!body) throw new Error('請輸入回覆')
  if (!conversationId) throw new Error('尚未選擇對話')
  return appendConversationMessage({ role: 'staff', text: body, conversationId })
}

async function decodeMessage(conversationId, d) {
  const data = d.data()
  let text = ''
  if (isCipher(data.enc)) {
    try { text = await decryptText(data.enc, `${conversationId}:${data.role}`) } catch { text = '（解密失敗）' }
  } else {
    text = data.text || ''
  }
  return { id: d.id, role: data.role || 'bot', text, createdAt: data.createdAt, encrypted: Boolean(data.encrypted) }
}

async function decodeConversation(d) {
  const data = d.data()
  let preview = ''
  if (isCipher(data.previewEnc)) {
    try { preview = await decryptText(data.previewEnc, `${d.id}:preview`) } catch { preview = '（解密失敗）' }
  }
  let transcript = []
  if (isCipher(data.transcriptEnc)) {
    try { transcript = await decryptJson(data.transcriptEnc, `${d.id}:transcript`) } catch { transcript = [] }
  }
  return {
    id: d.id,
    channel: data.channel || 'chatbot',
    encrypted: Boolean(data.encrypted),
    messageCount: data.messageCount || 0,
    lastRole: data.lastRole || '',
    staffJoined: Boolean(data.staffJoined),
    preview,
    transcript: Array.isArray(transcript) ? transcript : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function watchConversationMessages(conversationId, onChange) {
  if (!firebaseReady || !conversationId) return () => {}
  const q = query(
    collection(getDb(), 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(200),
  )
  return onSnapshot(q, async (snap) => {
    const msgs = await Promise.all(snap.docs.map(d => decodeMessage(conversationId, d)))
    onChange(msgs)
  }, (err) => onChange(null, err))
}

export function watchConversations(onChange) {
  if (!firebaseReady) return () => {}
  const q = query(collection(getDb(), 'conversations'), orderBy('updatedAt', 'desc'), limit(80))
  return onSnapshot(q, async (snap) => {
    onChange(await Promise.all(snap.docs.map(decodeConversation)))
  }, (err) => onChange(null, err))
}

export function checkUserNameFormat(name) {
  return /^[a-zA-Z0-9._-]{3,24}$/.test(String(name || '').trim())
}

export async function checkRegisterAvailable(userName, phone) {
  if (!firebaseReady) throw new Error('尚未連接 Firebase')
  const name = String(userName || '').trim()
  const tel = normalizePhone(phone)
  if (!checkUserNameFormat(name)) throw new Error('用戶名稱需 3–24 位英數')
  if (!tel || tel.length < 10) throw new Error('請輸入有效電話號碼')
  const db = getDb()
  const [nameSnap, phoneSnap] = await Promise.all([
    getDoc(doc(db, 'usernames', name.toLowerCase())),
    getDoc(doc(db, 'phones', phoneKey(tel))),
  ])
  return {
    userName: name,
    phone: tel,
    nameTaken: nameSnap.exists(),
    phoneTaken: phoneSnap.exists(),
    available: !nameSnap.exists() && !phoneSnap.exists(),
  }
}

export function clearChatRecaptcha() {
  if (window.__velvetChatRecaptcha) {
    try { window.__velvetChatRecaptcha.clear() } catch {}
    window.__velvetChatRecaptcha = null
  }
  window.__velvetChatRecaptchaOk = false
  const el = document.getElementById('chat-recaptcha')
  if (el) el.innerHTML = ''
}

export async function prepareChatRegisterSession() {
  const auth = getFirebaseAuth()
  if (auth?.currentUser) await signOut(auth).catch(() => {})
}

export async function prepareChatRecaptcha() {
  const auth = getFirebaseAuth()
  if (!auth) throw new Error('尚未連接 Firebase')
  const el = document.getElementById('chat-recaptcha')
  if (!el) throw new Error('驗證框尚未準備好，請關閉後再打開註冊表單')
  clearChatRecaptcha()
  const verifier = new RecaptchaVerifier(auth, 'chat-recaptcha', {
    size: 'normal',
    callback: () => { window.__velvetChatRecaptchaOk = true },
    'expired-callback': () => { window.__velvetChatRecaptchaOk = false },
  })
  window.__velvetChatRecaptcha = verifier
  window.__velvetChatRecaptchaOk = false
  await verifier.render()
  return verifier
}

export function isChatRecaptchaSolved() {
  return Boolean(window.__velvetChatRecaptchaOk)
}

export async function sendChatSms(phone) {
  const auth = getFirebaseAuth()
  if (!auth) throw new Error('尚未連接 Firebase')
  if (auth.currentUser) throw new Error('偵測到已登入帳戶。請重新打開註冊表單再試。')
  const tel = normalizePhone(phone)
  if (!window.__velvetChatRecaptchaOk) throw new Error('請先剔選表單入面嘅 reCAPTCHA')
  const verifier = window.__velvetChatRecaptcha
  if (!verifier) throw new Error('reCAPTCHA 尚未載入，請稍等再試')
  return signInWithPhoneNumber(auth, tel, verifier)
}

function makeInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = 'V'
  for (let i = 0; i < 7; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function completeChatRegister({ userName, phone, password, confirmation, code }) {
  const auth = getFirebaseAuth()
  const name = String(userName || '').trim()
  const tel = normalizePhone(phone)
  const pass = String(password || '')
  if (!checkUserNameFormat(name)) throw new Error('用戶名稱需 3–24 位英數')
  if (pass.length < 6) throw new Error('密碼至少 6 位')
  const cred = await confirmation.confirm(String(code || '').trim())
  const user = cred.user
  const db = getDb()
  const existing = await getDoc(doc(db, 'users', user.uid))
  if (existing.exists()) {
    throw new Error('此電話已綁定帳戶，請直接登入')
  }
  const inviteCode = makeInviteCode()
  await linkWithCredential(user, EmailAuthProvider.credential(memberEmail(name), pass))
  const payload = {
    userName: name,
    userNameKey: name.toLowerCase(),
    phone: tel,
    inviteCode,
    inviteOnce: true,
    role: 'member',
    createdAt: serverTimestamp(),
    passwordHashed: true,
    phoneVerified: true,
    disabled: false,
    paid: false,
    expiresAt: trialExpiresAt(),
    lastLoginAt: Date.now(),
    source: 'chatbot',
  }
  await setDoc(doc(db, 'users', user.uid), payload)
  await setDoc(doc(db, 'usernames', name.toLowerCase()), { uid: user.uid, userName: name, phone: tel })
  await setDoc(doc(db, 'phones', phoneKey(tel)), { uid: user.uid, userName: name, phone: tel })
  await setDoc(doc(db, 'invitationCodes', inviteCode), {
    uid: user.uid,
    userName: name,
    phone: tel,
    once: true,
    used: false,
    expiresAt: trialExpiresAt(),
    createdAt: serverTimestamp(),
    source: 'chatbot',
  })
  await rotateAuthSession(user.uid).catch(() => {})
  return { uid: user.uid, userName: name, phone: tel, inviteCode }
}

export async function createSupportTicket({ name, contact, message, reason, transcript }) {
  if (!firebaseReady) throw new Error('尚未連接 Firebase')
  const history = compactTranscript(transcript)
  const plain = {
    name: String(name || '').trim() || '訪客',
    contact: String(contact || '').trim(),
    message: String(message || '').trim(),
    reason: reason || 'kb-miss',
    transcript: history,
  }
  if (!plain.message) throw new Error('請輸入你想查詢嘅內容')
  const conversationId = await ensureConversation().catch(() => '')
  const enc = await encryptJson(plain, conversationId || 'ticket')
  const payload = {
    enc,
    encrypted: true,
    reason: plain.reason,
    status: 'open',
    conversationId: conversationId || null,
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(getDb(), 'supportTickets'), payload)
  if (conversationId) {
    await saveTranscript(history, conversationId).catch(() => {})
    await appendConversationMessage({
      role: 'system',
      text: `已轉介人工客服：${plain.message}`,
      conversationId,
    }).catch(() => {})
  }
  return { id: ref.id, conversationId, encrypted: true }
}

async function decodeTicket(id, data) {
  const base = { id, status: data.status || 'open', reason: data.reason || '', createdAt: data.createdAt, conversationId: data.conversationId || '', encrypted: Boolean(data.encrypted) }
  if (isCipher(data.enc)) {
    try {
      const plain = await decryptJson(data.enc, data.conversationId || 'ticket')
      return { ...base, ...plain }
    } catch {
      return { ...base, name: '（解密失敗）', contact: '', message: '此工單無法解密。請確認對話金鑰沒有變更。', transcript: [] }
    }
  }
  return {
    ...base,
    name: data.name || '訪客',
    contact: data.contact || '',
    message: data.message || '',
    transcript: [],
  }
}

export async function listSupportTickets() {
  if (!firebaseReady) throw new Error('尚未連接 Firebase')
  const snap = await getDocs(query(collection(getDb(), 'supportTickets'), orderBy('createdAt', 'desc'), limit(80)))
  return Promise.all(snap.docs.map(d => decodeTicket(d.id, d.data())))
}

export async function setTicketStatus(id, status) {
  if (!firebaseReady) throw new Error('尚未連接 Firebase')
  await updateDoc(doc(getDb(), 'supportTickets', id), { status })
}

export async function listConversations() {
  if (!firebaseReady) throw new Error('尚未連接 Firebase')
  const snap = await getDocs(query(collection(getDb(), 'conversations'), orderBy('updatedAt', 'desc'), limit(80)))
  return Promise.all(snap.docs.map(decodeConversation))
}

export async function listConversationMessages(conversationId) {
  if (!firebaseReady) throw new Error('尚未連接 Firebase')
  const snap = await getDocs(query(
    collection(getDb(), 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(200),
  ))
  return Promise.all(snap.docs.map(d => decodeMessage(conversationId, d)))
}
