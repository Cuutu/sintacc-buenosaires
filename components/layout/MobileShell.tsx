"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useIsMobile } from "@/components/map-view/useMediaQuery"

const MOBILE_DEFAULT_ROUTE = "/mapa"
const MOBILE_ROUTES = ["/mapa", "/favoritos", "/sugerir", "/explorar", "/perfil", "/login"]

/**
 * MobileShell: wrapper para lógica móvil.
 * - Redirige "/" a /mapa cuando es mobile (<=768px)
 * - La ocultación de Navbar/Footer la maneja LayoutChrome
 */
export function MobileShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const router = useRouter()

  // En mobile, "/" redirige a Mapa (tab por defecto)
  useEffect(() => {
    if (!isMobile) return
    if (pathname === "/") {
      router.replace(MOBILE_DEFAULT_ROUTE)
    }
  }, [isMobile, pathname, router])

  return <>{children}</>
}

/** Indica si la ruta actual es una de las rutas principales del bottom nav móvil */
export function isMobileNavRoute(pathname: string): boolean {
  return MOBILE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}
