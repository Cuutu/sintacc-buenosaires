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
import { cn } from "@/lib/utils"

interface LayoutChromeProps {
  children: React.ReactNode
}

/**
 * Solo e2e: si window.__CELIMAP_E2E_FORCE_BOUNDARY__ coincide, fuerza throw.
 * Poll corta para re-render cuando el test setea el flag tras mount.
 */
function E2EBoundaryProbe({ target }: { target: "page" | "chrome" }) {
  const [explode, setExplode] = useState(false)

  useEffect(() => {
    const arm = () => {
      const w = window as Window & {
        __CELIMAP_E2E__?: boolean
        __CELIMAP_E2E_FORCE_BOUNDARY__?: string | null
      }
      if (w.__CELIMAP_E2E__ && w.__CELIMAP_E2E_FORCE_BOUNDARY__ === target) {
        // Limpiar flag al armar: explode en state mantiene el throw hasta unmount.
        // Si no, Reintentar re-arma al instante vía interval.
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

  // explode queda true → cada render tira hasta que el boundary desmonte el child.
  if (explode) {
    throw new Error(`E2E forced ${target} boundary error`)
  }
  return <span data-testid={`e2e-probe-${target}`} hidden aria-hidden />
}

/**
 * LayoutChrome: chrome por breakpoint + safe areas.
 * Page boundary: resetKey={pathname} (sin key).
 * BottomNav: boundary chrome estable (sin resetKey por ruta).
 */
export function LayoutChrome({ children }: LayoutChromeProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const isMapRoute = pathname === "/mapa" || pathname.startsWith("/mapa?")
  const showDesktopChrome = isMobile === false
  const showMobileChrome = isMobile === true
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
          showMobileChrome && !isMapRoute && "pt-[var(--safe-area-top)]"
        )}
      >
        <AppErrorBoundary resetKey={routeKey} source="page-boundary">
          <E2EBoundaryProbe target="page" />
          {children}
        </AppErrorBoundary>
      </main>

      {showDesktopChrome && <Footer />}

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
