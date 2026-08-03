/**
 * Observabilidad cliente sin PII.
 * Dedup 10s + rate limit local. POST /api/client-errors (prod incluido).
 * Nunca propaga fallos del reporter.
 */

import { getPublicBuildSha, getPublicDeploymentId } from "@/lib/build-id"
import { readDiag } from "@/lib/celimap-diag"
import {
  generateEventId,
  type ClientErrorEvent,
  type ClientErrorSource,
} from "@/lib/client-error-schema"
import { sanitizeMessage, sanitizeStack } from "@/lib/client-error-sanitize"
import {
  getAuthStatusProbe,
  getLastNavIntent,
  getPathnameContext,
} from "@/lib/nav-telemetry"

const CHUNK_RELOAD_KEY_PREFIX = "celimap_chunk_reload_v1:"

export type { ClientErrorSource }
export type ClientErrorReport = ClientErrorEvent
export type ClientErrorSink = (report: ClientErrorReport) => void

export { sanitizeMessage, sanitizeStack }

const DEDUPE_WINDOW_MS = 10_000
const RATE_WINDOW_MS = 8_000
const MAX_REPORTS_PER_WINDOW = 8

let sink: ClientErrorSink | null = null
let reporting = false
const recentKeys = new Map<string, number>()
let windowStart = 0
let windowCount = 0

export function setClientErrorSink(next: ClientErrorSink | null): void {
  sink = next
}

function safeRoute(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    return window.location.pathname.slice(0, 200)
  } catch {
    return undefined
  }
}

function detectEnvironment(): {
  environment: "web" | "native" | "unknown"
  platform: string
} {
  if (typeof window === "undefined") {
    return { environment: "unknown", platform: "ssr" }
  }
  const ua = window.navigator.userAgent || ""
  const native =
    ua.includes("CelimapNative") ||
    document.documentElement.classList.contains("plt-capacitor") ||
    document.documentElement.classList.contains("hybrid")
  let platform = "web"
  if (/iPhone|iPad|iPod/i.test(ua)) platform = "ios"
  else if (/Android/i.test(ua)) platform = "android"
  return { environment: native ? "native" : "web", platform }
}

function uaSummary(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    return sanitizeMessage((window.navigator.userAgent || "").slice(0, 140))
  } catch {
    return undefined
  }
}

function swControllerPresent(): boolean | undefined {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return undefined
  try {
    return Boolean(navigator.serviceWorker.controller)
  } catch {
    return undefined
  }
}

function nativeCleanupState(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith("celimap_native_sw_cleanup:")) {
        return String(localStorage.getItem(k) || "").slice(0, 32)
      }
    }
  } catch {
    /* ignore */
  }
  return undefined
}

function chunkReloadCount(): number | undefined {
  if (typeof window === "undefined") return undefined
  try {
    let n = 0
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(CHUNK_RELOAD_KEY_PREFIX)) {
        const v = sessionStorage.getItem(k)
        if (v && (v.includes("done") || v.includes("pending"))) n += 1
      }
    }
    return n
  } catch {
    return undefined
  }
}

function shouldDrop(key: string, now: number): boolean {
  if (now - windowStart > RATE_WINDOW_MS) {
    windowStart = now
    windowCount = 0
  }
  if (windowCount >= MAX_REPORTS_PER_WINDOW) return true
  const last = recentKeys.get(key)
  if (last != null && now - last < DEDUPE_WINDOW_MS) return true
  recentKeys.set(key, now)
  windowCount += 1
  if (recentKeys.size > 80) {
    const cutoff = now - DEDUPE_WINDOW_MS
    for (const [k, t] of recentKeys) {
      if (t < cutoff) recentKeys.delete(k)
    }
  }
  return false
}

function defaultConsoleSink(report: ClientErrorReport): void {
  if (process.env.NODE_ENV === "development") {
    console.error("[CelimapClientError]", JSON.stringify(report))
  }
}

export type ReportClientErrorInput = {
  source: ClientErrorSource
  error: unknown
  componentStack?: string | null
  route?: string
  digest?: string
}

/**
 * Reporta error. Devuelve eventId si se aceptó (o null si dedupe/rate/fail).
 * Compatible: reportClientError(error, legacySource) sigue funcionando.
 */
export function reportClientError(
  errorOrInput: unknown | ReportClientErrorInput,
  legacySource?: string,
  extra?: { digest?: string; componentStack?: string }
): string | null {
  if (reporting) return null
  reporting = true
  try {
    let source: ClientErrorSource
    let error: unknown
    let componentStack: string | undefined
    let routeOverride: string | undefined
    let digest: string | undefined

    if (
      errorOrInput &&
      typeof errorOrInput === "object" &&
      "source" in (errorOrInput as object) &&
      "error" in (errorOrInput as object)
    ) {
      const input = errorOrInput as ReportClientErrorInput
      source = input.source
      error = input.error
      componentStack = input.componentStack || undefined
      routeOverride = input.route
      digest = input.digest
    } else {
      error = errorOrInput
      source = mapLegacySource(legacySource)
      digest = extra?.digest
      componentStack = extra?.componentStack
    }

    const err = error instanceof Error ? error : new Error(String(error))
    const now = Date.now()
    const message = sanitizeMessage(err.message || "Unknown error")
    const pathCtx = getPathnameContext()
    const route = (routeOverride || pathCtx.route || safeRoute() || "").slice(0, 200)
    const key = `${source}|${err.name}|${message}|${route}`
    if (shouldDrop(key, now)) return null

    const { environment, platform } = detectEnvironment()
    const intent = getLastNavIntent()
    const diag = readDiag()
    const mapStats =
      typeof window !== "undefined"
        ? (
            window as Window & {
              __celimapMapboxStats?: { peakActive?: number; active?: number }
            }
          ).__celimapMapboxStats
        : undefined

    const eventId = generateEventId()
    const payload: ClientErrorReport = {
      eventId,
      source,
      message,
      name: err.name,
      stack: sanitizeStack(err.stack),
      componentStack: sanitizeStack(componentStack),
      digest: digest?.slice(0, 64),
      route: route || undefined,
      previousPathname: pathCtx.previousPathname || undefined,
      navigation: intent
        ? {
            from: intent.from,
            to: intent.to,
            slot: intent.slot,
            timestamp: intent.timestamp,
          }
        : undefined,
      authStatus: getAuthStatusProbe(),
      environment,
      platform,
      uaSummary: uaSummary(),
      build: getPublicBuildSha(),
      deploymentId: getPublicDeploymentId(),
      swController: swControllerPresent(),
      nativeCleanupState: nativeCleanupState(),
      chunkReloadCount: chunkReloadCount(),
      diag: {
        layoutChromeMounts: diag?.layoutChromeMounts,
        clientErrorListenerMounts: diag?.clientErrorListenerMounts,
        listenerAttachCycles: diag?.listenerAttachCycles,
        mapboxPeakActive: mapStats?.peakActive,
        mapboxActive: mapStats?.active,
      },
      ts: now,
    }

    const activeSink = sink ?? defaultConsoleSink
    try {
      activeSink(payload)
    } catch {
      /* sink never breaks UI */
    }

    // Ingest productivo siempre (además del sink); fallos ignorados
    void postClientError(payload)

    if (typeof window !== "undefined") {
      const w = window as Window & {
        __celimapLastError?: ClientErrorReport
        __celimapLastEventId?: string
      }
      w.__celimapLastError = payload
      w.__celimapLastEventId = eventId
    }

    return eventId
  } catch {
    return null
  } finally {
    reporting = false
  }
}

function mapLegacySource(legacy?: string): ClientErrorSource {
  switch (legacy) {
    case "boundary":
      return "page-boundary"
    case "error-tsx":
      return "next-route-error"
    case "global-error":
      return "global-error"
    case "window.onerror":
      return "window-error"
    case "unhandledrejection":
      return "unhandled-rejection"
    case "page-boundary":
    case "bottom-nav-boundary":
    case "next-route-error":
    case "window-error":
    case "unhandled-rejection":
    case "map-cleanup":
    case "native-oauth-start":
    case "native-oauth-browser-opened":
    case "native-oauth-sdk-ok":
    case "native-oauth-return":
    case "native-oauth-session-ready":
    case "native-oauth-error":
      return legacy
    default:
      return "window-error"
  }
}

async function postClientError(payload: ClientErrorReport): Promise<void> {
  if (typeof window === "undefined" || typeof fetch !== "function") return
  try {
    await fetch("/api/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    /* never throw */
  }
}

export function __resetClientErrorReporterForTests() {
  recentKeys.clear()
  windowStart = 0
  windowCount = 0
  reporting = false
  sink = null
}
