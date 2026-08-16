"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BottomNav } from "@/components/nav/BottomNav"
import { AppErrorBoundary } from "@/components/AppErrorBoundary"
import { useIsMobile } from "@/components/map-view/useMediaQuery"
import { bumpDiag } from "@/lib/celimap-diag"
import { notePathname } from "@/lib/nav-telemetry"
import { isPrivateListPath } from "@/lib/lists/is-private-list-path"
import { cn } from "@/lib/utils"

interface LayoutChromeProps {
  children: React.ReactNode
}

function E2EBoundaryProbe({ target }: { target: "page" | "chrome" }) {
  const [explode, setExplode] = useState(false)

  useEffect(() => {
    const arm = () => {
      const w = window as Window & {
        __CELIMAP_E2E__?: boolean
        __CELIMAP_E2E_FORCE_BOUNDARY__?: string | null
      }
      if (w.__CELIMAP_E2E__ && w.__CELIMAP_E2E_FORCE_BOUNDARY__ === target) {
        w.__CELIMAP_E2E_FORCE_BOUNDARY__ = null
        setExplode(true)
      }
    }
    window.addEventListener("celimap-e2e-force-boundary", arm)
    const id = window.setInterval(arm, 50)
    return () => {
      window.removeEventListener("celimap-e2e-force-boundary", arm)
      window.clearInterval(id)
    }
  }, [target])

  if (explode) {
    throw new Error(`E2E forced ${target} boundary error`)
  }
  return <span data-testid={`e2e-probe-${target}`} hidden aria-hidden />
}

/**
 * LayoutChrome: chrome por breakpoint + safe areas.
 * /listas/privadas/* → shell enfocado (sin Navbar/Footer/BottomNav).
 */
export function LayoutChrome({ children }: LayoutChromeProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const isPrivateList = isPrivateListPath(pathname)
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")
  const isMapRoute = pathname === "/mapa" || pathname.startsWith("/mapa?")
  const hidePublicChrome = isPrivateList || isAdminRoute
  const showDesktopChrome = isMobile === false && !hidePublicChrome
  const showMobileChrome = isMobile === true && !hidePublicChrome
  const routeKey = pathname || "/"

  useEffect(() => {
    bumpDiag("layoutChromeMounts")
  }, [])

  useEffect(() => {
    notePathname(routeKey)
  }, [routeKey])

  return (
    <>
      {showDesktopChrome && <Navbar />}

      <main
        className={cn(
          "min-h-screen",
          showMobileChrome && "pb-[var(--bottom-nav-clearance)]",
          showMobileChrome && !isMapRoute && "pt-[var(--safe-area-top)]",
          hidePublicChrome && "pt-[var(--safe-area-top)] pb-[var(--safe-area-bottom)]"
        )}
        data-private-list-shell={isPrivateList ? "true" : undefined}
      >
        <AppErrorBoundary resetKey={routeKey} source="page-boundary">
          <E2EBoundaryProbe target="page" />
          {children}
        </AppErrorBoundary>
      </main>

      {!hidePublicChrome && !isMapRoute && <Footer />}

      {showMobileChrome && (
        <Suspense fallback={null}>
          <AppErrorBoundary variant="chrome" source="bottom-nav-boundary">
            <E2EBoundaryProbe target="chrome" />
            <BottomNav />
          </AppErrorBoundary>
        </Suspense>
      )}
    </>
  )
}
