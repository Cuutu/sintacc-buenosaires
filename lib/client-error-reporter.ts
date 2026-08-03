/**
 * Observabilidad cliente sin PII.
 * Sink pluggable (Sentry futuro). Por defecto: console estructurada.
 */

export type ClientErrorReport = {
  message: string
  name?: string
  stack?: string
  digest?: string
  route?: string
  platform?: string
  native?: boolean
  release?: string
  source: "boundary" | "error-tsx" | "global-error" | "window.onerror" | "unhandledrejection"
  ts: number
}

export type ClientErrorSink = (report: ClientErrorReport) => void

const RATE_LIMIT_MS = 2000
const DEDUPE_WINDOW_MS = 5000
const MAX_REPORTS_PER_WINDOW = 8

let sink: ClientErrorSink | null = null
let reporting = false
const recentKeys = new Map<string, number>()
let windowStart = 0
let windowCount = 0

/** Conectar Sentry u otro backend aquí. */
export function setClientErrorSink(next: ClientErrorSink | null): void {
  sink = next
}

function safeRoute(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    // Solo path+query tipada; sin hash con tokens
    return window.location.pathname
  } catch {
    return undefined
  }
}

function detectPlatform(): { platform: string; native: boolean } {
  if (typeof window === "undefined") return { platform: "ssr", native: false }
  const ua = window.navigator.userAgent || ""
  const native =
    ua.includes("CelimapNative") ||
    document.documentElement.classList.contains("plt-capacitor") ||
    document.documentElement.classList.contains("hybrid")
  let platform = "web"
  if (/iPhone|iPad|iPod/i.test(ua)) platform = "ios"
  else if (/Android/i.test(ua)) platform = "android"
  return { platform, native }
}

export function sanitizeMessage(raw: string): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/pk\.[A-Za-z0-9.\-_]+/g, "pk.[redacted]")
    .replace(/[-+]?\d{1,3}\.\d{4,}/g, "[coord]")
    .slice(0, 500)
}

export function sanitizeStack(stack?: string): string | undefined {
  if (!stack) return undefined
  return stack
    .split("\n")
    .slice(0, 12)
    .map((line) =>
      line
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
        .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
        .slice(0, 240)
    )
    .join("\n")
}

function shouldDrop(key: string, now: number): boolean {
  if (now - windowStart > RATE_LIMIT_MS * 4) {
    windowStart = now
    windowCount = 0
  }
  if (windowCount >= MAX_REPORTS_PER_WINDOW) return true
  const last = recentKeys.get(key)
  if (last != null && now - last < DEDUPE_WINDOW_MS) return true
  recentKeys.set(key, now)
  windowCount += 1
  // Evitar crecimiento infinito
  if (recentKeys.size > 50) {
    const cutoff = now - DEDUPE_WINDOW_MS
    for (const [k, t] of recentKeys) {
      if (t < cutoff) recentKeys.delete(k)
    }
  }
  return false
}

function defaultSink(report: ClientErrorReport): void {
  console.error("[CelimapClientError]", JSON.stringify(report))
}

/** Reporta error a sink seguro (console / futuro Sentry). */
export function reportClientError(
  error: unknown,
  source: ClientErrorReport["source"],
  extra?: { digest?: string }
): void {
  if (reporting) return
  reporting = true
  try {
    const err = error instanceof Error ? error : new Error(String(error))
    const now = Date.now()
    const message = sanitizeMessage(err.message || "Unknown error")
    const key = `${source}|${err.name}|${message}|${safeRoute() ?? ""}`
    if (shouldDrop(key, now)) return

    const { platform, native } = detectPlatform()
    const payload: ClientErrorReport = {
      message,
      name: err.name,
      stack: sanitizeStack(err.stack),
      digest: extra?.digest,
      route: safeRoute(),
      platform,
      native,
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
      source,
      ts: now,
    }

    const activeSink = sink ?? defaultSink
    activeSink(payload)

    if (typeof window !== "undefined") {
      const w = window as Window & { __celimapLastError?: ClientErrorReport }
      w.__celimapLastError = payload
    }
  } catch {
    // Nunca propagar fallos del reporter
  } finally {
    reporting = false
  }
}

/** Test helpers */
export function __resetClientErrorReporterForTests() {
  recentKeys.clear()
  windowStart = 0
  windowCount = 0
  reporting = false
  sink = null
}
