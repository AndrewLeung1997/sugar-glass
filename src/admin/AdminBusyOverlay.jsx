import { useEffect } from 'react'

export default function AdminBusyOverlay({ show, text = '處理中，請稍候…' }) {
  useEffect(() => {
    if (!show) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const block = (e) => { e.preventDefault(); e.stopPropagation() }
    window.addEventListener('keydown', block, true)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', block, true)
    }
  }, [show])

  if (!show) return null
  return (
    <div className="admin-busy" role="alertdialog" aria-modal="true" aria-busy="true" aria-label={text}>
      <div className="admin-busy-card glass">
        <div className="admin-busy-spin" />
        <p>{text}</p>
      </div>
    </div>
  )
}
