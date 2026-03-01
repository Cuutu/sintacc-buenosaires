"use client"

const MOBILE_ROUTES = ["/mapa", "/favoritos", "/sugerir", "/explorar", "/perfil", "/login"]

/**
 * MobileShell: wrapper para lógica móvil.
 * - La ocultación de Navbar/Footer la maneja LayoutChrome
 * - Mobile y desktop ven la landing en "/" por igual
 */
export function MobileShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/** Indica si la ruta actual es una de las rutas principales del bottom nav móvil */
export function isMobileNavRoute(pathname: string): boolean {
  return MOBILE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}
