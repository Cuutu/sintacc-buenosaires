"use client"

import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BottomNav } from "@/components/nav/BottomNav"
import { useIsMobile } from "@/components/map-view/useMediaQuery"

interface LayoutChromeProps {
  children: React.ReactNode
}

/**
 * LayoutChrome: decide qué chrome mostrar según breakpoint.
 * - Mobile (<=768px): sin Navbar, sin Footer, con BottomNav
 * - Desktop: Navbar + Footer, sin BottomNav
 */
export function LayoutChrome({ children }: LayoutChromeProps) {
  const isMobile = useIsMobile()

  return (
    <>
      {/* Navbar: solo desktop */}
      {!isMobile && <Navbar />}

      {/* Main: padding inferior para bottom nav en mobile */}
      <main
        className={
          isMobile
            ? "min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))]"
            : "min-h-screen"
        }
      >
        {children}
      </main>

      {/* Footer: solo desktop */}
      {!isMobile && <Footer />}

      {/* BottomNav: solo mobile (Suspense por useSearchParams) */}
      {isMobile && (
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      )}
    </>
  )
}
