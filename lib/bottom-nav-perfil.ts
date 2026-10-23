/**
 * Destino Perfil en BottomNav según status de sesión.
 * loading → /perfil estable (sin hop /login).
 */
export function resolveBottomNavPerfilHref(
  status: "loading" | "authenticated" | "unauthenticated"
): "/perfil" | "/login" {
  if (status === "unauthenticated") return "/login"
  return "/perfil"
}

/** Siempre los mismos cinco y en este orden (revisión 23/10). */
export const BOTTOM_NAV_SLOT_KEYS = [
  "inicio",
  "mapa",
  "favoritos",
  "emprendimientos",
  "perfil",
] as const

export type BottomNavSlotKey = (typeof BOTTOM_NAV_SLOT_KEYS)[number]

/** ¿Esta pestaña es la de la página actual? */
export function isBottomNavItemActive(slot: BottomNavSlotKey, pathname: string): boolean {
  switch (slot) {
    case "inicio":
      return pathname === "/"
    case "mapa":
      return pathname === "/mapa"
    case "favoritos":
      // Las listas viven en Guardados.
      return pathname === "/favoritos" || pathname === "/listas" || pathname.startsWith("/listas/")
    case "emprendimientos":
      return pathname === "/emprendimientos" || pathname.startsWith("/emprendimientos/")
    case "perfil":
      return pathname === "/perfil" || pathname === "/login"
  }
}

