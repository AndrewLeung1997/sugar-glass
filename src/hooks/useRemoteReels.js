import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { firebaseReady, getDb } from '../firebase.js'

export function useRemoteReels() {
  const [reels, setReels] = useState([])
  const [ready, setReady] = useState(!firebaseReady)

  useEffect(() => {
    if (!firebaseReady) return
    const unsub = onSnapshot(
      collection(getDb(), 'reels'),
      snap => {
        const rows = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.src)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setReels(rows)
        setReady(true)
      },
      () => {
        setReels([])
        setReady(true)
      },
    )
    return unsub
  }, [])

  return { reels, ready }
}
