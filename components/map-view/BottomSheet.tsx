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

/**
 * Hoja de la lista del mapa. Se mueve con `transform` (no con `height`): cambiar la
 * altura en cada cuadro obligaba a recalcular el layout de toda la lista mientras se
 * arrastraba. La hoja mide siempre lo de "full" y se corre hacia abajo; el contenedor
 * de afuera recorta lo que queda debajo de la barra. Durante el arrastre y el resorte
 * se escribe el transform directo en el DOM, sin renders de React.
 */
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
  // Altura en la que quedó quieta: define el relleno de abajo de la lista (para poder
  // llegar a las últimas tarjetas). Cambia una vez por snap, no en cada cuadro.
  const [settledHeight, setSettledHeight] = React.useState(() => getHeights()[initialSnap])
  const [currentSnap, setCurrentSnap] = React.useState<SheetSnap>(initialSnap)
  const [isDragging, setIsDragging] = React.useState(false)
  const [scrollLock, setScrollLock] = React.useState(false)
  const startY = React.useRef(0)
  const startHeight = React.useRef(0)
  const currentHeightRef = React.useRef(settledHeight)
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const fullHeightRef = React.useRef(snapHeights.full)
  fullHeightRef.current = snapHeights.full
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

  /** Altura visible de la hoja, directo en el DOM (sin render). */
  const setVisualHeight = React.useCallback((height: number) => {
    currentHeightRef.current = height
    const el = sheetRef.current
    if (!el) return
    el.style.transform = `translate3d(0, ${Math.max(0, fullHeightRef.current - height)}px, 0)`
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
        setVisualHeight(target)
        setSettledHeight(target)
        return
      }
      stopSpringRef.current = animateSpring({
        from: currentHeightRef.current,
        to: target,
        velocity,
        reduceMotion: false,
        onUpdate: setVisualHeight,
        onComplete: () => {
          stopSpringRef.current = null
          setSettledHeight(target)
        },
      })
    },
    [stopSpring, setVisualHeight]
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
    setVisualHeight(newH)
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
      className="pointer-events-none fixed inset-x-0 top-0 bottom-[var(--bottom-nav-clearance)] z-20 overflow-hidden"
      data-map-list-sheet=""
    >
    <div
      ref={sheetRef}
      className={cn(
        "map-paper pointer-events-auto absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[24px] border border-[var(--map-paper-border)] border-b-0 will-change-transform",
        className
      )}
      style={{
        height: snapHeights.full,
        transform: `translate3d(0, ${Math.max(0, snapHeights.full - settledHeight)}px, 0)`,
      }}
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
        {/* Lo que la hoja tiene escondido abajo: sin esto las últimas tarjetas no se ven. */}
        <div aria-hidden style={{ height: Math.max(0, snapHeights.full - settledHeight) }} />
      </div>
    </div>
    </div>
  )
}
