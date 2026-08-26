import type { AnalyticsPlatform } from "@/lib/analytics-platform"

/** Primera instalación / browser profile — persiste entre sesiones y actualizaciones de app. */
export const ANALYTICS_FIRST_OPEN_KEY = "celimap_first_open_done"

/** Última apertura lógica (ms) — timeout de sesión anónimo. */
export const ANALYTICS_LAST_ACTIVITY_KEY = "celimap_analytics_last_activity"

/** Evita doble cold start en la misma pestaña (React Strict Mode). */
export const ANALYTICS_COLD_START_KEY = "celimap_analytics_cold_start"

/** Evita app_open duplicado en cold start + foreground nativo casi simultáneo. */
export const ANALYTICS_OPEN_DEBOUNCE_KEY = "celimap_analytics_last_open_ms"

/** Inactividad > 30 min → nueva sesión lógica. */
export const ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000

/** Ventana mínima entre dos app_open consecutivos. */
export const ANALYTICS_OPEN_DEBOUNCE_MS = 2_000

export type AnalyticsLifecycleReason = "cold_start" | "foreground" | "visibility"

export type AnalyticsLifecycleStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type AnalyticsLifecycleTrack = (
  event: "first_open" | "app_open" | "session_start",
  properties: { platform: AnalyticsPlatform }
) => void

function safeGetNumber(value: string | null): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Una apertura lógica de la app (cold start, foreground nativo o tab visible).
 *
 * Regla de sesión:
 * - `session_start` solo si no hay timestamp previo o pasaron > 30 min desde el último `app_open`.
 * - Siempre actualiza el timestamp tras procesar (éxito parcial de storage no bloquea eventos).
 *
 * `first_open` solo la primera vez por perfil local (localStorage).
 */
export function runAnalyticsLifecycleOpen(opts: {
  storage: AnalyticsLifecycleStorage
  track: AnalyticsLifecycleTrack
  platform: AnalyticsPlatform
  reason: AnalyticsLifecycleReason
  now?: number
}): void {
  const now = opts.now ?? Date.now()
  const { storage, track, platform, reason } = opts

  if (reason === "cold_start") {
    try {
      if (storage.getItem(ANALYTICS_COLD_START_KEY) === "1") return
      storage.setItem(ANALYTICS_COLD_START_KEY, "1")
    } catch {
      // Seguir — mejor un posible duplicado que perder métricas.
    }
  }

  try {
    const lastOpen = safeGetNumber(storage.getItem(ANALYTICS_OPEN_DEBOUNCE_KEY))
    if (lastOpen != null && now - lastOpen < ANALYTICS_OPEN_DEBOUNCE_MS) {
      return
    }
    storage.setItem(ANALYTICS_OPEN_DEBOUNCE_KEY, String(now))
  } catch {
    // Sin debounce si sessionStorage falla.
  }

  try {
    if (storage.getItem(ANALYTICS_FIRST_OPEN_KEY) !== "1") {
      track("first_open", { platform })
      storage.setItem(ANALYTICS_FIRST_OPEN_KEY, "1")
    }
  } catch {
    try {
      track("first_open", { platform })
    } catch {
      // Analytics no debe romper UX.
    }
  }

  try {
    track("app_open", { platform })
  } catch {
    // ignore
  }

  let isNewSession = true
  try {
    const lastActivity = safeGetNumber(storage.getItem(ANALYTICS_LAST_ACTIVITY_KEY))
    isNewSession =
      lastActivity == null || now - lastActivity > ANALYTICS_SESSION_TIMEOUT_MS
  } catch {
    isNewSession = true
  }

  if (isNewSession) {
    try {
      track("session_start", { platform })
    } catch {
      // ignore
    }
  }

  try {
    storage.setItem(ANALYTICS_LAST_ACTIVITY_KEY, String(now))
  } catch {
    // ignore
  }
}
