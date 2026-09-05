"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { animateSpring, FLICK_VELOCITY } from "./motion"

export type SheetSnap = "collapsed" | "half" | "full"

const SNAP_ORDER: SheetSnap[] = ["collapsed", "half", "full"]

const SNAP_RATIOS: Record<SheetSnap, number> = {
  collapsed: 0.2,
  half: 0.5,
  full: 0.9,
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
    return {
      collapsed: h * SNAP_RATIOS.collapsed,
      half: h * SNAP_RATIOS.half,
      full: h * SNAP_RATIOS.full,
    }
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
  const velocityRef = React.useRef(0)
  const lastMoveRef = React.useRef({ t: 0, h: 0 })
  const stopSpringRef = React.useRef<(() => void) | null>(null)
  const onSnapChangeRef = React.useRef(onSnapChange)
  onSnapChangeRef.current = onSnapChange
  const reduceMotionRef = React.useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion

  const stopSpring = React.useCallback(() => {
    stopSpringRef.current?.()
    stopSpringRef.current = null
  }, [])

  React.useEffect(() => {
    const onResize = () => setSnapHeights(getHeights())
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      stopSpring()
    }
  }, [stopSpring])

  const applySnap = React.useCallback(
    (snap: SheetSnap, velocity = 0) => {
      const target = getHeights()[snap]
      setCurrentSnap(snap)
      onSnapChangeRef.current?.(snap)
      stopSpring()
      if (reduceMotionRef.current || Math.abs(currentHeightRef.current - target) < 0.5) {
        currentHeightRef.current = target
        setHeightPx(target)
        return
      }
      stopSpringRef.current = animateSpring({
        from: currentHeightRef.current,
        to: target,
        velocity,
        reduceMotion: false,
        onUpdate: (value) => {
          currentHeightRef.current = value
          setHeightPx(value)
        },
        onComplete: () => {
          stopSpringRef.current = null
        },
      })
    },
    [stopSpring]
  )

  React.useEffect(() => {
    applySnap(initialSnap, 0)
  }, [initialSnap, applySnap])

  const getClosestSnap = (h: number): SheetSnap => {
    const dist = (Object.entries(snapHeights) as [SheetSnap, number][]).map(
      ([snap, val]) => ({ snap, dist: Math.abs(val - h) })
    )
    dist.sort((a, b) => a.dist - b.dist)
    return dist[0].snap
  }

  const pickSnap = (h: number, velocity: number): SheetSnap => {
    const projected = h + velocity * 0.18
    if (Math.abs(velocity) < FLICK_VELOCITY) {
      return getClosestSnap(projected)
    }
    const idx = SNAP_ORDER.indexOf(getClosestSnap(h))
    if (velocity > 0) return SNAP_ORDER[Math.min(idx + 1, SNAP_ORDER.length - 1)]
    return SNAP_ORDER[Math.max(idx - 1, 0)]
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scrollLock) return
    stopSpring()
    setIsDragging(true)
    startY.current = e.clientY
    startHeight.current = currentHeightRef.current
    velocityRef.current = 0
    lastMoveRef.current = { t: performance.now(), h: currentHeightRef.current }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const delta = startY.current - e.clientY
    let newH = startHeight.current + delta
    newH = Math.max(snapHeights.collapsed, Math.min(snapHeights.full, newH))
    const now = performance.now()
    const dt = (now - lastMoveRef.current.t) / 1000
    if (dt > 0 && dt < 0.08) {
      velocityRef.current = (newH - lastMoveRef.current.h) / dt
    }
    lastMoveRef.current = { t: now, h: newH }
    currentHeightRef.current = newH
    setHeightPx(newH)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    const stale = performance.now() - lastMoveRef.current.t > 80
    const velocity = stale ? 0 : velocityRef.current
    applySnap(pickSnap(currentHeightRef.current, velocity), velocity)
  }

  const handleListScroll = () => {
    const el = listRef.current
    if (!el) return
    setScrollLock(el.scrollTop > 0)
  }

  return (
    <div
      className={cn(
        "map-paper fixed inset-x-0 bottom-[var(--bottom-nav-clearance)] z-20 overflow-hidden rounded-t-[24px] border border-[var(--map-paper-border)] border-b-0",
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
        <div className="map-handle" aria-hidden />
      </div>

      <div
        ref={listRef}
        onScroll={handleListScroll}
        className="h-[calc(100%-3.5rem)] overflow-y-auto overscroll-contain touch-pan-y pb-4"
      >
        {children}
      </div>
    </div>
  )
}
