import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext.jsx'
import { firebaseReady, getDb } from '../firebase.js'

const KEY = 'velvet-favorites'

function readLocal() {
  try {
    const saved = localStorage.getItem(KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeLocal(ids) {
  try { localStorage.setItem(KEY, JSON.stringify([...ids])) } catch {}
}

export function useFavorites() {
  const { user, profile } = useAuth() || {}
  const [favorites, setFavorites] = useState(readLocal)
  const skipRemoteWrite = useRef(true)

  useEffect(() => {
    const remote = Array.isArray(profile?.favorites) ? profile.favorites.filter(Boolean) : []
    if (!user?.uid || !remote.length) {
      skipRemoteWrite.current = false
      return
    }
    setFavorites((prev) => {
      const next = new Set(prev)
      let changed = false
      remote.forEach((id) => {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      })
      return changed ? next : prev
    })
    skipRemoteWrite.current = false
  }, [user?.uid, profile?.favorites])

  useEffect(() => {
    writeLocal(favorites)
    if (skipRemoteWrite.current || !firebaseReady || !user?.uid) return
    updateDoc(doc(getDb(), 'users', user.uid), { favorites: [...favorites] }).catch(() => {})
  }, [favorites, user?.uid])

  const toggleFavorite = useCallback((id) => {
    if (!id) return
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isFavorite = useCallback((id) => favorites.has(id), [favorites])

  return { favorites, toggleFavorite, isFavorite }
}
