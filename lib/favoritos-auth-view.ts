export type FavoritosAuthView =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "session_error"; message: string }
  | { kind: "ready" }

/**
 * Deriva UI de favoritos sin side-effects.
 * Nunca "vacío negro": loading / unauth / error / ready.
 */
export function resolveFavoritosAuthView(input: {
  status: "loading" | "authenticated" | "unauthenticated"
  hasSessionUser: boolean
  sessionError?: string | null
}): FavoritosAuthView {
  if (input.sessionError) {
    return { kind: "session_error", message: input.sessionError }
  }
  if (input.status === "loading") return { kind: "loading" }
  if (input.status === "unauthenticated") return { kind: "unauthenticated" }
  if (input.status === "authenticated" && !input.hasSessionUser) {
    return { kind: "session_error", message: "No pudimos leer tu sesión" }
  }
  return { kind: "ready" }
}
