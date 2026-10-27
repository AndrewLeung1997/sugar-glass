import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { firebaseReady, getDb } from '../firebase.js'

export function normalizeProfile(p) {
  const photos = (Array.isArray(p.photos) ? p.photos : []).filter(Boolean)
  const cover = p.cover || photos[0] || ''
  return {
    ...p,
    name: p.name || '',
    age: p.age || '',
    city: p.city || '',
    occupation: p.occupation || '',
    tagline: p.tagline || '',
    bio: p.bio || '',
    cover,
    photos: photos.length ? photos : (cover ? [cover] : []),
    tags: Array.isArray(p.tags) ? p.tags : [],
    skills: Array.isArray(p.skills) ? p.skills : [],
    interests: Array.isArray(p.interests) ? p.interests : [],
    verified: Boolean(p.verified),
    stats: { lifestyle: p.stats?.lifestyle || '簡約' },
    figure: p.figure || {},
    education: p.education || '',
  }
}

export function useRemoteProfiles() {
  const [remote, setRemote] = useState([])
  const [ready, setReady] = useState(!firebaseReady)

  useEffect(() => {
    if (!firebaseReady) return
    const unsub = onSnapshot(
      collection(getDb(), 'profiles'),
      snap => {
        const rows = snap.docs
          .map(d => normalizeProfile({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setRemote(rows)
        setReady(true)
      },
      () => {
        setRemote([])
        setReady(true)
      },
    )
    return unsub
  }, [])

  return { profiles: remote, ready }
}
