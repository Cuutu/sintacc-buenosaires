"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BottomNav } from "@/components/nav/BottomNav"
import { AppErrorBoundary } from "@/components/AppErrorBoundary"
import { useIsMobile } from "@/components/map-view/useMediaQuery"
import { cn } from "@/lib/utils"

interface LayoutChromeProps {
  children: React.ReactNode
}

/**
 * LayoutChrome: chrome por breakpoint + safe areas (política B edge-to-edge).
 * - null (sin medir): sin Navbar/Footer/BottomNav → evita flash desktop en phone
 * - Mobile: BottomNav; pt safe-top salvo /mapa (full-bleed); pb = --bottom-nav-clearance
 * - Desktop: Navbar + Footer; sin paddings móviles
 * Fondos pueden ir edge-to-edge; inset solo en flujo de contenido interactivo.
 */
export function LayoutChrome({ children }: LayoutChromeProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const isMapRoute = pathname === "/mapa" || pathname.startsWith("/mapa?")
  const showDesktopChrome = isMobile === false
  const showMobileChrome = isMobile === true

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
        <AppErrorBoundary key={pathname}>{children}</AppErrorBoundary>
      </main>

      {showDesktopChrome && <Footer />}

      {showMobileChrome && (
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      )}
    </>
  )
}
