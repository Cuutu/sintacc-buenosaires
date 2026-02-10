"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type SheetSnap = "collapsed" | "half" | "full"

const SNAP_RATIOS: Record<SheetSnap, number> = {
  collapsed: 0.18,
  half: 0.5,
  full: 0.85,
}

interface BottomSheetProps {
  children: React.ReactNode
  initialSnap?: SheetSnap
  onSnapChange?: (snap: SheetSnap) => void
  className?: string
  reduceMotion?: boolean
}

export function MapBottomSheet({
  children,
  initialSnap = "half",
  onSnapChange,
  className,
  reduceMotion = false,
}: BottomSheetProps) {
  const getHeights = () => {
    const h = typeof window !== "undefined" ? window.innerHeight : 600
    return { collapsed: h * 0.18, half: h * 0.5, full: h * 0.85 }
  }
  const [snapHeights, setSnapHeights] = React.useState(getHeights)
  const [heightPx, setHeightPx] = React.useState(() => getHeights()[initialSnap])
  const [currentSnap, setCurrentSnap] = React.useState<SheetSnap>(initialSnap)
  const [isDragging, setIsDragging] = React.useState(false)
  const [scrollLock, setScrollLock] = React.useState(false)
  const startY = React.useRef(0)
  const startHeight = React.useRef(0)
  const currentHeightRef = React.useRef(heightPx)
  currentHeightRef.current = heightPx
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const onResize = () => setSnapHeights(getHeights())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const applySnap = React.useCallback(
    (snap: SheetSnap) => {
      const sh = getHeights()
      setHeightPx(sh[snap])
      setCurrentSnap(snap)
      onSnapChange?.(snap)
    },
    [onSnapChange]
  )

  React.useEffect(() => {
    applySnap(initialSnap)
  }, [initialSnap])

  const getClosestSnap = (h: number): SheetSnap => {
    const dist = (Object.entries(snapHeights) as [SheetSnap, number][]).map(
      ([snap, val]) => ({ snap, dist: Math.abs(val - h) })
    )
    dist.sort((a, b) => a.dist - b.dist)
    return dist[0].snap
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scrollLock) return
    setIsDragging(true)
    startY.current = e.clientY
    startHeight.current = heightPx
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const delta = startY.current - e.clientY
    let newH = startHeight.current + delta
    newH = Math.max(snapHeights.collapsed, Math.min(snapHeights.full, newH))
    currentHeightRef.current = newH
    setHeightPx(newH)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    const snap = getClosestSnap(currentHeightRef.current)
    applySnap(snap)
  }

  const handleListScroll = () => {
    const el = listRef.current
    if (!el) return
    setScrollLock(el.scrollTop > 0)
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20 bg-black/70 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl",
        !reduceMotion && !isDragging && "transition-[height] duration-300 ease-out",
        className
      )}
      style={{ height: heightPx }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex justify-center w-full py-3 cursor-grab active:cursor-grabbing touch-none min-h-[44px] select-none"
        role="button"
        tabIndex={0}
        aria-label="Arrastrar para cambiar altura"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            const next: SheetSnap =
              currentSnap === "collapsed" ? "half" : currentSnap === "half" ? "full" : "collapsed"
            applySnap(next)
          }
        }}
      >
        <div className="w-12 h-1.5 bg-white/40 rounded-full" aria-hidden />
      </div>

      <div
        ref={listRef}
        onScroll={handleListScroll}
        className="overflow-y-auto overscroll-contain h-[calc(100%-3.5rem)] pb-[env(safe-area-inset-bottom)] touch-pan-y"
      >
        {children}
      </div>
    </div>
  )
}
