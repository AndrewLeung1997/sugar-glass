import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import {
  firebaseReady,
  getDb,
  getBucket,
  getFirebaseAuth,
  getSecondaryAuth,
  memberEmail,
  normalizePhone,
  phoneKey,
} from '../firebase.js'
import { clearLoginPending, markLoginPending } from './session.js'
import { isUnpaidExpired, trialExpiresAt } from './accountAccess.js'

export function assertFirebase() {
  if (!firebaseReady) throw new Error('尚未設定 Firebase。請先填 .env.local')
}

export async function adminSignIn(email, password, { remember = true } = {}) {
  assertFirebase()
  const auth = getFirebaseAuth()
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence).catch(() => {})
  markLoginPending()
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  try { localStorage.setItem('velvet-admin-email', email.trim()) } catch {}
  clearLoginPending()
  return cred.user
}

export async function createMemberAccount({ userName, phone, password, inviteCode }) {
  assertFirebase()
  const name = String(userName || '').trim()
  const phoneE164 = normalizePhone(phone)
  if (!/^[a-zA-Z0-9._-]{3,24}$/.test(name)) throw new Error('用戶名稱需 3–24 位英數')
  if (!phoneE164 || phoneE164.length < 10) throw new Error('請輸入有效電話號碼')
  if (!password || password.length < 6) throw new Error('密碼至少 6 位')

  const db = getDb()
  const named = await getDoc(doc(db, 'usernames', name.toLowerCase()))
  if (named.exists()) throw new Error('此用戶名稱已被使用')

  const secondary = getSecondaryAuth()
  const cred = await createUserWithEmailAndPassword(secondary, memberEmail(name), password)
  const uid = cred.user.uid
  // 密碼由 Firebase Auth 以 hash 儲存，Firestore 唔存明文
  const payload = {
    userName: name,
    userNameKey: name.toLowerCase(),
    phone: phoneE164,
    inviteCode: String(inviteCode || '').trim() || null,
    role: 'member',
    createdAt: serverTimestamp(),
    passwordHashed: true,
    phoneVerified: false,
    disabled: false,
    lastLoginAt: null,
  }
  try {
    await setDoc(doc(db, 'users', uid), payload)
    await setDoc(doc(db, 'usernames', name.toLowerCase()), { uid, userName: name, phone: phoneE164 })
    await setDoc(doc(db, 'phones', phoneKey(phoneE164)), { uid, userName: name, phone: phoneE164 })
  } catch (err) {
    await cred.user.delete().catch(() => {})
    throw err
  }
  await signOut(secondary)
  return { uid, ...payload, phone: phoneE164 }
}

export async function listMembers() {
  assertFirebase()
  const snap = await getDocs(collection(getDb(), 'users'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

function tsMillis(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (v.seconds) return v.seconds * 1000
  const n = new Date(v).getTime()
  return Number.isNaN(n) ? 0 : n
}

export async function kickMemberSession(uid) {
  assertFirebase()
  await setDoc(doc(getDb(), 'authSessions', uid), {
    sessionId: `kicked-${Date.now()}`,
    startedAt: Date.now(),
    userAgent: 'admin-kick',
  })
}

export async function setMemberDisabled(uid, disabled) {
  assertFirebase()
  const patch = {
    disabled: Boolean(disabled),
    disabledAt: disabled ? Date.now() : null,
    disabledReason: disabled ? 'admin' : null,
  }
  if (!disabled) {
    const snap = await getDoc(doc(getDb(), 'users', uid))
    const data = snap.data() || {}
    if (!data.paid && isUnpaidExpired(data)) patch.expiresAt = trialExpiresAt()
  }
  await updateDoc(doc(getDb(), 'users', uid), patch)
  if (disabled) await kickMemberSession(uid).catch(() => {})
}

export async function deleteMember(member) {
  assertFirebase()
  const db = getDb()
  const uid = member.id
  const pays = await getDocs(collection(db, 'users', uid, 'payments'))
  await Promise.all(pays.docs.map(d => deleteDoc(d.ref).catch(() => {})))
  if (member.userNameKey || member.userName) {
    await deleteDoc(doc(db, 'usernames', String(member.userNameKey || member.userName).toLowerCase())).catch(() => {})
  }
  await deleteDoc(doc(db, 'users', uid))
  await kickMemberSession(uid).catch(() => {})
}

export async function listPayments(uid) {
  assertFirebase()
  const snap = await getDocs(collection(getDb(), 'users', uid, 'payments'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => tsMillis(b.paidAt) - tsMillis(a.paidAt))
}

export async function addPayment(uid, { paidAt, amount, note }) {
  assertFirebase()
  const value = Number(amount)
  if (!paidAt) throw new Error('請輸入付費日期')
  if (!Number.isFinite(value) || value <= 0) throw new Error('請輸入有效金額')
  const when = new Date(paidAt)
  if (Number.isNaN(when.getTime())) throw new Error('付費日期無效')
  const db = getDb()
  const payload = {
    paidAt: when.getTime(),
    amount: Math.round(value * 100) / 100,
    currency: 'HKD',
    note: String(note || '').trim() || null,
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, 'users', uid, 'payments'), payload)
  await updateDoc(doc(db, 'users', uid), {
    lastPaidAt: payload.paidAt,
    lastPaidAmount: payload.amount,
    paid: true,
    disabled: false,
    disabledAt: null,
    disabledReason: null,
    expiresAt: null,
  }).catch(() => {})
  return { id: ref.id, ...payload }
}

export async function listProfiles() {
  assertFirebase()
  const snap = await getDocs(collection(getDb(), 'profiles'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

async function uploadImage(path, file) {
  const bucket = getBucket()
  const r = ref(bucket, path)
  await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' })
  const url = await getDownloadURL(r)
  return { url, path }
}

export async function saveProfile(data, files) {
  assertFirebase()
  const db = getDb()
  const id = data.id || `cms_${Date.now().toString(36)}`
  let cover = data.cover || ''
  const photos = [...(data.photos || [])]
  const photoPaths = [...(data.photoPaths || [])]
  let coverPath = data.coverPath || ''

  if (files.cover) {
    const uploaded = await uploadImage(`profiles/${id}/cover.jpg`, files.cover)
    cover = uploaded.url
    coverPath = uploaded.path
  }
  if (files.wall?.length) {
    for (let i = 0; i < files.wall.length; i++) {
      const file = files.wall[i]
      const safe = String(file.name || 'photo').replace(/[^\w.\-]+/g, '_')
      const uploaded = await uploadImage(`profiles/${id}/wall/${Date.now()}_${i}_${safe}`, file)
      photos.push(uploaded.url)
      photoPaths.push(uploaded.path)
    }
  }
  if (cover && !photos.includes(cover)) photos.unshift(cover)
  if (!cover) throw new Error('請上傳封面相片')

  const skills = splitList(data.skills)
  const interests = splitList(data.interests)
  const tags = splitList(data.tags)
  const profile = {
    name: data.name.trim(),
    age: Number(data.age) || 0,
    city: data.city.trim(),
    occupation: data.occupation.trim(),
    tagline: data.tagline.trim(),
    bio: data.bio.trim(),
    cover,
    coverPath,
    photos,
    photoPaths,
    tags,
    verified: Boolean(data.verified),
    stats: { lifestyle: data.lifestyle || '簡約' },
    figure: {
      height: suffix(data.height, 'cm'),
      weight: suffix(data.weight, 'kg'),
      bust: suffix(data.bust, '吋'),
      waist: suffix(data.waist, '吋'),
      hip: suffix(data.hip, '吋'),
    },
    education: data.education.trim(),
    skills,
    interests,
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    source: data.source || 'cms',
  }
  await setDoc(doc(db, 'profiles', id), profile, { merge: true })
  return { id, ...profile }
}

export async function listReels(profileId) {
  assertFirebase()
  const snap = await getDocs(collection(getDb(), 'reels'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(r => !profileId || r.profileId === profileId)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export function captureVideoPoster(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url
    const done = (blob) => { URL.revokeObjectURL(url); resolve(blob) }
    video.onloadeddata = () => {
      try { video.currentTime = Math.min(0.25, (video.duration || 1) * 0.08) }
      catch { done(null) }
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 720
      canvas.height = video.videoHeight || 1280
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(b => done(b), 'image/jpeg', 0.8)
    }
    video.onerror = () => done(null)
  })
}

export async function saveReels(profileId, files, { caption, cover } = {}) {
  assertFirebase()
  if (!profileId) throw new Error('請先儲存 profile')
  const out = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.size > 80 * 1024 * 1024) throw new Error(`${file.name} 超過 80MB`)
    const id = `reel_${Date.now().toString(36)}_${i}`
    const video = await uploadImage(`reels/${id}/video.mp4`, file)
    const posterBlob = await captureVideoPoster(file)
    let poster = cover || ''
    let posterPath = ''
    if (posterBlob) {
      const shot = await uploadImage(
        `reels/${id}/poster.jpg`,
        new File([posterBlob], 'poster.jpg', { type: 'image/jpeg' }),
      )
      poster = shot.url
      posterPath = shot.path
    }
    const payload = {
      profileId,
      src: video.url,
      srcPath: video.path,
      poster,
      posterPath,
      caption: String(caption || '').trim(),
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(getDb(), 'reels', id), payload)
    out.push({ id, ...payload })
  }
  return out
}

export async function removeReel(id) {
  assertFirebase()
  await deleteDoc(doc(getDb(), 'reels', id))
}

export async function removeProfile(id) {
  assertFirebase()
  const related = await listReels(id)
  await Promise.all(related.map(r => deleteDoc(doc(getDb(), 'reels', r.id)).catch(() => {})))
  await deleteDoc(doc(getDb(), 'profiles', id))
}

async function urlToFile(url, name) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`讀取失敗 ${url}`)
  const blob = await res.blob()
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

export async function importBackviewProfiles(onProgress) {
  return importLocalProfiles(onProgress, (p) => /^p(9[7-9]|10[0-9]|11[0-1])$/.test(p.id))
}

export async function importLocalProfiles(onProgress, only) {
  assertFirebase()
  const { PROFILES } = await import('../data.js')
  const existing = new Set((await listProfiles()).map(p => p.id))
  const result = { imported: 0, skipped: 0, failed: [] }
  const rows = only ? PROFILES.filter(only) : PROFILES
  for (let i = 0; i < rows.length; i++) {
    const p = rows[i]
    onProgress?.({ current: i + 1, total: rows.length, name: p.name })
    if (existing.has(p.id)) {
      result.skipped += 1
      continue
    }
    try {
      const coverFile = await urlToFile(p.cover, `${p.id}.jpg`)
      const wall = []
      for (const url of (p.photos || [])) {
        if (!url || url === p.cover) continue
        try {
          const file = await urlToFile(url, url.split('/').pop() || `${p.id}-wall.jpg`)
          wall.push(file)
        } catch {}
      }
      const fig = p.figure || {}
      await saveProfile({
        id: p.id,
        name: p.name,
        age: p.age,
        city: p.city,
        occupation: p.occupation,
        tagline: p.tagline || '',
        bio: p.bio || '',
        tags: Array.isArray(p.tags) ? p.tags.join('、') : String(p.tags || ''),
        verified: Boolean(p.verified),
        lifestyle: p.stats?.lifestyle || '簡約',
        height: fig.height || '',
        weight: fig.weight || '',
        bust: fig.bust || '',
        waist: fig.waist || '',
        hip: fig.hip || '',
        education: p.education || '',
        skills: Array.isArray(p.skills) ? p.skills.join('、') : String(p.skills || ''),
        interests: Array.isArray(p.interests) ? p.interests.join('、') : String(p.interests || ''),
        photos: [],
        cover: '',
        source: only ? 'ai-backview' : 'local',
      }, { cover: coverFile, wall })
      existing.add(p.id)
      result.imported += 1
    } catch (ex) {
      result.failed.push({ id: p.id, name: p.name, error: ex.message || '失敗' })
    }
  }
  return result
}

function splitList(v) {
  return String(v || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean)
}

function suffix(v, unit) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.endsWith(unit) ? s : `${s}${unit}`
}
