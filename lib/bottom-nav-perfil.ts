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

export const BOTTOM_NAV_SLOT_KEYS = [
  "sugerir",
  "favoritos",
  "home-map",
  "explorar",
  "perfil",
] as const

export type BottomNavSlotKey = (typeof BOTTOM_NAV_SLOT_KEYS)[number]
