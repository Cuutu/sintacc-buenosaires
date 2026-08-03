/**
 * Telemetría de navegación en memoria (sin historial persistente, sin PII).
 */

export type AuthStatusProbe = "loading" | "authenticated" | "unauthenticated"

export type NavIntent = {
  from: string
  to: string
  slot: string
  timestamp: number
}

let lastIntent: NavIntent | null = null
let previousPathname: string | null = null
let currentPathname: string | null = null
let authStatus: AuthStatusProbe = "loading"

function cleanPath(path: string): string {
  try {
    if (path.startsWith("http")) {
      return new URL(path).pathname.slice(0, 200)
    }
    const q = path.indexOf("?")
    return (q >= 0 ? path.slice(0, q) : path).slice(0, 200) || "/"
  } catch {
    return "/"
  }
}

/** Registrar intent BottomNav antes del cambio de ruta. */
export function recordBottomNavIntent(from: string, to: string, slot: string): void {
  lastIntent = {
    from: cleanPath(from),
    to: cleanPath(to),
    slot: String(slot || "").slice(0, 40),
    timestamp: Date.now(),
  }
}

export function getLastNavIntent(): NavIntent | null {
  return lastIntent
}

/** Actualizar pathname actual / anterior (LayoutChrome). */
export function notePathname(pathname: string): void {
  const next = cleanPath(pathname || "/")
  if (currentPathname && currentPathname !== next) {
    previousPathname = currentPathname
  }
  currentPathname = next
}

export function getPathnameContext(): {
  route: string | null
  previousPathname: string | null
} {
  return {
    route: currentPathname,
    previousPathname,
  }
}

export function setAuthStatusProbe(status: AuthStatusProbe): void {
  if (
    status === "loading" ||
    status === "authenticated" ||
    status === "unauthenticated"
  ) {
    authStatus = status
  }
}

export function getAuthStatusProbe(): AuthStatusProbe {
  return authStatus
}

/** Test helpers */
export function __resetNavTelemetryForTests(): void {
  lastIntent = null
  previousPathname = null
  currentPathname = null
  authStatus = "loading"
}
