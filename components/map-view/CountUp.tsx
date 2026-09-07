"use client"

import * as React from "react"
import { MOTION_MS, easeOutUnit } from "./motion"

export function CountUp({
  value,
  reduceMotion,
}: {
  value: number
  reduceMotion: boolean
}) {
  const [shown, setShown] = React.useState(value)
  const shownRef = React.useRef(value)
  shownRef.current = shown

  React.useEffect(() => {
    if (reduceMotion || value === shownRef.current) {
      shownRef.current = value
      setShown(value)
      return
    }
    const from = shownRef.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / MOTION_MS.base)
      const next = Math.round(from + (value - from) * easeOutUnit(progress))
      shownRef.current = next
      setShown(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, reduceMotion])

  return <>{shown}</>
}
