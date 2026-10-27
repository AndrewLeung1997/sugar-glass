import { useEffect, useRef, useState } from 'react'
import { useProtectedSrc } from '../hooks/useProtectedSrc.js'

const FALLBACK = [{ cx: 50, cy: 24, rx: 18, ry: 15 }]

function parsePos(str) {
  const parts = String(str || 'center center').trim().split(/\s+/)
  const named = { left: 0, center: 0.5, right: 1, top: 0, bottom: 1 }
  const num = (v, fallback) => {
    if (v == null) return fallback
    if (named[v] != null) return named[v]
    if (String(v).endsWith('%')) return parseFloat(v) / 100
    return fallback
  }
  return { x: num(parts[0], 0.5), y: num(parts[1], 0.5) }
}

function toBoxPercent(box, nw, nh, dw, dh, posX, posY) {
  const scale = Math.max(dw / nw, dh / nh)
  const ox = (dw - nw * scale) * posX
  const oy = (dh - nh * scale) * posY
  const padX = box.width * 0.08
  const padY = box.height * 0.12
  const x = box.x - padX
  const y = box.y - padY
  const w = box.width + padX * 2
  const h = box.height + padY * 2
  const cx = (x + w / 2) * scale + ox
  const cy = (y + h / 2) * scale + oy
  return {
    cx: (cx / dw) * 100,
    cy: (cy / dh) * 100,
    rx: Math.max(10, ((w * scale) / 2 / dw) * 100),
    ry: Math.max(9, ((h * scale) / 2 / dh) * 100),
  }
}

async function detectBoxes(img) {
  try {
    if (!('FaceDetector' in window)) return []
    const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 4 })
    const faces = await fd.detect(img)
    return faces.map(f => f.boundingBox).filter(b => b.width > 8 && b.height > 8)
  } catch {
    return []
  }
}

export default function FaceBlurFill({ src, className = '', position = 'center top', fit = 'cover' }) {
  const local = useProtectedSrc(src) || src
  const ref = useRef(null)
  const [faces, setFaces] = useState([])

  useEffect(() => {
    if (!local) return
    let live = true
    setFaces([])
    const img = new Image()
    img.onload = async () => {
      const el = ref.current
      if (!el || !live) return
      const pos = parsePos(position)
      const canDetect = 'FaceDetector' in window
      const boxes = await detectBoxes(img)
      if (!live || !ref.current) return
      if (!boxes.length) {
        setFaces(canDetect ? [] : FALLBACK)
        return
      }
      const dw = ref.current.clientWidth || 1
      const dh = ref.current.clientHeight || 1
      setFaces(boxes.map(b => toBoxPercent(b, img.naturalWidth, img.naturalHeight, dw, dh, pos.x, pos.y)))
    }
    img.src = local
    return () => { live = false }
  }, [local, position])

  if (!local) return <div ref={ref} className={`face-blur-fill ${className}`.trim()} />

  return (
    <div
      ref={ref}
      className={`face-blur-fill ${className}`.trim()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="face-blur-base" style={{ backgroundImage: `url(${local})`, backgroundPosition: position, backgroundSize: fit }} />
      {faces.map((f, i) => (
        <div
          key={i}
          className="face-blur-layer"
          style={{
            backgroundImage: `url(${local})`,
            backgroundPosition: position,
            backgroundSize: fit,
            WebkitMaskImage: `radial-gradient(ellipse ${f.rx}% ${f.ry}% at ${f.cx}% ${f.cy}%, #000 0%, #000 42%, rgba(0,0,0,.45) 68%, transparent 100%)`,
            maskImage: `radial-gradient(ellipse ${f.rx}% ${f.ry}% at ${f.cx}% ${f.cy}%, #000 0%, #000 42%, rgba(0,0,0,.45) 68%, transparent 100%)`,
          }}
        />
      ))}
    </div>
  )
}
