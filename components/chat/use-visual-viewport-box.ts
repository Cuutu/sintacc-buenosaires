"use client"

import { useEffect, useState } from "react"

const DESKTOP = "(min-width: 768px)"

function isDesktop(): boolean {
  return window.matchMedia(DESKTOP).matches
}

type ViewportBox = {
  top: number
  height: number
  keyboard: boolean
}

function readBox(): ViewportBox | undefined {
  if (typeof window === "undefined") return undefined
  if (isDesktop()) return undefined
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

/** Traba el scroll de la landing en mobile sin saltar al top. Desktop no se toca. */
export function useMobileBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (isDesktop()) return

    const html = document.documentElement
    const body = document.body
    const scrollY = window.scrollY
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      overflow: body.style.overflow,
      overscroll: body.style.overscrollBehavior,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    }

    html.style.overflow = "hidden"
    html.style.overscrollBehavior = "none"
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target as Node | null
      const scroller = document.querySelector(".celimap-chat-map")
      if (scroller && target && scroller.contains(target)) return
      event.preventDefault()
    }
    document.addEventListener("touchmove", onTouchMove, { passive: false })

    return () => {
      document.removeEventListener("touchmove", onTouchMove)
      html.style.overflow = prev.htmlOverflow
      html.style.overscrollBehavior = prev.htmlOverscroll
      body.style.overflow = prev.overflow
      body.style.overscrollBehavior = prev.overscroll
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [active])
}
