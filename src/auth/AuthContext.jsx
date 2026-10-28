import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { firebaseReady, getDb, getFirebaseAuth } from '../firebase.js'
import {
  clearKickedFlag,
  clearLocalSession,
  clearLoginPending,
  getLocalSession,
  isLoginPending,
  markKicked,
  peekKicked,
  rotateAuthSession,
  writeAuthSession,
} from './session.js'
import { enforceAccountAccess } from './accountAccess.js'

const BOOTSTRAP_ADMIN_UID = 'MVd50jqSlQWPB6pndoMURXs1qf42'
const BOOTSTRAP_ADMIN_EMAIL = 'admin@velvet.app'

function isBootstrapAdmin(user) {
  return Boolean(user && (user.uid === BOOTSTRAP_ADMIN_UID || user.email === BOOTSTRAP_ADMIN_EMAIL))
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(!firebaseReady)
  const [kicked, setKicked] = useState(() => peekKicked())
  const kicking = useRef(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) return
    return onAuthStateChanged(auth, async (next) => {
      setUser(next)
      if (!next) {
        setProfile(null)
        setIsAdmin(false)
        setReady(true)
        return
      }
      const db = getDb()
      const bootstrap = isBootstrapAdmin(next)
      try {
        const [adminSnap, userSnap] = await Promise.all([
          getDoc(doc(db, 'admins', next.uid)),
          getDoc(doc(db, 'users', next.uid)),
        ])
        const admin = adminSnap.exists() || bootstrap
        setIsAdmin(admin)
        setProfile(userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null)
        if (bootstrap && !adminSnap.exists()) {
          await setDoc(doc(db, 'admins', next.uid), {
            role: 'admin',
            email: next.email || BOOTSTRAP_ADMIN_EMAIL,
          }).catch(() => {})
        }
      } catch {
        setIsAdmin(bootstrap)
        setProfile(null)
      }
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!user || !firebaseReady || isBootstrapAdmin(user)) return
    const ref = doc(getDb(), 'users', user.uid)
    return onSnapshot(ref, async (snap) => {
      if (!snap.exists()) return
      const next = await enforceAccountAccess(user.uid, { id: snap.id, ...snap.data() })
      setProfile(next)
      if (next.disabled) {
        clearLocalSession()
        const auth = getFirebaseAuth()
        if (auth) await signOut(auth).catch(() => {})
      }
    })
  }, [user])

  useEffect(() => {
    if (!user || !firebaseReady) return
    if (isBootstrapAdmin(user) || isAdmin) return
    const ref = doc(getDb(), 'authSessions', user.uid)
    kicking.current = false
    const unsub = onSnapshot(ref, async (snap) => {
      if (kicking.current || isLoginPending()) return
      const remote = snap.data()?.sessionId || ''
      const local = getLocalSession()
      if (local && remote && local === remote) return
      // 密碼已過、SMS 未完成時本機仲未有 session。舊 remote 唔可以當「其他裝置」踢走自己。
      if (!local) return
      if (!remote) {
        await writeAuthSession(user.uid, local).catch(() => {})
        return
      }
      kicking.current = true
      markKicked()
      setKicked(true)
      clearLocalSession()
      clearLoginPending()
      const auth = getFirebaseAuth()
      if (auth) await signOut(auth).catch(() => {})
    })
    return () => unsub()
  }, [user, isAdmin])

  const value = useMemo(() => ({
    user,
    profile,
    isAdmin,
    ready,
    firebaseReady,
    kicked,
    clearKicked: () => {
      clearKickedFlag()
      setKicked(false)
    },
    logout: async () => {
      clearLocalSession()
      clearLoginPending()
      clearKickedFlag()
      setKicked(false)
      const auth = getFirebaseAuth()
      if (auth) await signOut(auth)
    },
  }), [user, profile, isAdmin, ready, kicked])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext) || {
    user: null, profile: null, isAdmin: false, ready: true, firebaseReady, kicked: false,
    clearKicked: () => {}, logout: async () => {},
  }
}
