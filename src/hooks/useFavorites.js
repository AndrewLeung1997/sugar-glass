import { useState, useEffect, useCallback } from 'react'

const KEY = 'velvet-favorites'

// 收藏功能 — 用 localStorage 持久化
export function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY)
      return new Set(saved ? JSON.parse(saved) : [])
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...favorites]))
    } catch {}
  }, [favorites])

  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isFavorite = useCallback((id) => favorites.has(id), [favorites])

  return { favorites, toggleFavorite, isFavorite }
}
