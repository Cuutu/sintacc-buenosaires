"use client"

import { useEffect, useRef, useState } from "react"
import { AtlasFlora, AtlasPlaces, AtlasStreets } from "@/components/home/CeliMapAtlas"

const LAYER =
  "pointer-events-none absolute inset-0 h-full w-full will-change-transform transition-transform duration-200 ease-out"

export function HeroBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)")
    if (motion.matches || !hover.matches) return

    let raf = 0
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2
      if (raf) return
      raf = requestAnimationFrame(() => {
        setOffset({ x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) })
        raf = 0
      })
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const far = {
    transform: `translate3d(${offset.x * 3}px, ${offset.y * 3}px, 0)`,
  }
  const mid = {
    transform: `translate3d(${offset.x * 4}px, ${offset.y * 4}px, 0)`,
  }
  const near = {
    transform: `translate3d(${offset.x * 5}px, ${offset.y * 5}px, 0)`,
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="celimap-hero-mesh" />
      <AtlasStreets className={`${LAYER} opacity-70 md:opacity-100`} style={far} />
      <AtlasFlora className={`${LAYER} opacity-35 md:opacity-100`} style={mid} />
      <AtlasPlaces className={LAYER} style={near} />
      <div className="celimap-hero-paper" />
      <div className="celimap-hero-vignette" />
    </div>
  )
}
