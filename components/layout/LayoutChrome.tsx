"use client"

import { Suspense, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BottomNav } from "@/components/nav/BottomNav"
import { AppErrorBoundary } from "@/components/AppErrorBoundary"
import { useIsMobile } from "@/components/map-view/useMediaQuery"
import { bumpDiag } from "@/lib/celimap-diag"
import { cn } from "@/lib/utils"

interface LayoutChromeProps {
  children: React.ReactNode
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
        <AppErrorBoundary resetKey={routeKey}>{children}</AppErrorBoundary>
      </main>

      {showDesktopChrome && <Footer />}

      {showMobileChrome && (
        <Suspense fallback={null}>
          <AppErrorBoundary variant="chrome">
            <BottomNav />
          </AppErrorBoundary>
        </Suspense>
      )}
    </>
  )
}
