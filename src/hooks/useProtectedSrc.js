import { useEffect, useState } from 'react'
import { resolveProtectedSrc } from '../media/protectedSrc.js'

export function useProtectedSrc(src) {
  const [url, setUrl] = useState(src || '')

  useEffect(() => {
    if (!src) {
      setUrl('')
      return
    }
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setUrl(src)
      return
    }
    setUrl(src)
    let live = true
    resolveProtectedSrc(src)
      .then(next => { if (live && next) setUrl(next) })
      .catch(() => { if (live) setUrl(src) })
    return () => { live = false }
  }, [src])

  return url || src || ''
}
