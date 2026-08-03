"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { isNativeApp } from "@/lib/native-app"

type MapboxStats = {
  activeInstances?: number
  peakActiveInstances?: number
  mountCount?: number
}

declare global {
  interface Window {
    __celimapMapboxStats?: MapboxStats
    __celimapLayoutDebugLast?: Record<string, unknown>
  }
}

function layoutDebugEnabled(): boolean {
  if (typeof window === "undefined") return false
  if (process.env.NODE_ENV === "production") {
    // Solo si flag público explícito en preview deploy (nunca default prod)
    return process.env.NEXT_PUBLIC_CELIMAP_LAYOUT_DEBUG === "1"
  }
  return (
    process.env.NEXT_PUBLIC_CELIMAP_LAYOUT_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_CELIMAP_LAYOUT_DEBUG === "true"
  )
}

function readInset(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "0px"
}

/**
 * Logs de layout para preview/dev. Sin PII / ubicación / session / input.
 * Deshabilitado en producción salvo NEXT_PUBLIC_CELIMAP_LAYOUT_DEBUG=1.
 */
export function NativeLayoutDebug() {
  const pathname = usePathname()

  useEffect(() => {
    if (!layoutDebugEnabled()) return

    const log = () => {
      const vv = window.visualViewport
      const nav = document.querySelector('nav[aria-label="Navegacion principal"]')
      const navRect = nav?.getBoundingClientRect()
      const stats = window.__celimapMapboxStats
      const payload = {
        t: "celimap-layout-debug",
        route: pathname,
        native: isNativeApp(),
        host: window.location.host,
        uaVariant: /CelimapNative/.test(navigator.userAgent)
          ? "capacitor"
          : (window.navigator as Navigator & { standalone?: boolean }).standalone
            ? "pwa"
            : "web",
        insetTop: readInset("--safe-area-top"),
        insetBottom: readInset("--safe-area-bottom"),
        insetLeft: readInset("--safe-area-left"),
        insetRight: readInset("--safe-area-right"),
        bottomNavClearance: readInset("--bottom-nav-clearance"),
        bottomNavHeight: readInset("--bottom-nav-height"),
        visualViewportH: vv?.height ?? null,
        innerH: window.innerHeight,
        bottomNavBoxH: navRect?.height ?? null,
        bottomNavBottom: navRect ? window.innerHeight - navRect.bottom : null,
        keyboardGuess:
          vv && vv.height < window.innerHeight * 0.75 ? "likely-open" : "likely-closed",
        mapboxActive: stats?.activeInstances ?? null,
        mapboxPeak: stats?.peakActiveInstances ?? null,
        mapboxMounts: stats?.mountCount ?? null,
      }
      window.__celimapLayoutDebugLast = payload
      // eslint-disable-next-line no-console
      console.info("[celimap-layout]", payload)
    }

    log()
    const onResize = () => log()
    window.addEventListener("resize", onResize)
    window.visualViewport?.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      window.visualViewport?.removeEventListener("resize", onResize)
    }
  }, [pathname])

  return null
}
