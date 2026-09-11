"use client"

import { useEffect, useState } from "react"

const DESKTOP = "(min-width: 768px)"

type ViewportBox = {
  top: number
  height: number
  keyboard: boolean
}

function readBox(): ViewportBox | undefined {
  if (typeof window === "undefined") return undefined
  if (window.matchMedia(DESKTOP).matches) return undefined
  const vv = window.visualViewport
  const height = Math.round(vv?.height ?? window.innerHeight)
  const top = Math.round(vv?.offsetTop ?? 0)
  const keyboard = height < window.innerHeight * 0.75
  return { top, height, keyboard }
}

export function useVisualViewportBox(active: boolean): ViewportBox | undefined {
  const [box, setBox] = useState<ViewportBox | undefined>(() =>
    active ? readBox() : undefined
  )

  useEffect(() => {
    if (!active) {
      setBox(undefined)
      return
    }

    const apply = () => setBox(readBox())
    apply()
    const vv = window.visualViewport
    vv?.addEventListener("resize", apply)
    vv?.addEventListener("scroll", apply)
    window.addEventListener("resize", apply)
    return () => {
      vv?.removeEventListener("resize", apply)
      vv?.removeEventListener("scroll", apply)
      window.removeEventListener("resize", apply)
    }
  }, [active])

  return active ? box : undefined
}
