/**
 * Schema allowlist + sanitización server/client compartida (sin PII).
 */

import { sanitizeMessage, sanitizeStack } from "@/lib/client-error-sanitize"

export const CLIENT_ERROR_SOURCES = [
  "page-boundary",
  "bottom-nav-boundary",
  "next-route-error",
  "global-error",
  "window-error",
  "unhandled-rejection",
  "map-cleanup",
  "native-oauth-start",
  "native-oauth-browser-opened",
  "native-oauth-return",
  "native-oauth-session-ready",
  "native-oauth-error",
] as const

export type ClientErrorSource = (typeof CLIENT_ERROR_SOURCES)[number]

export const CLIENT_ERROR_MAX_BYTES = 16 * 1024

export type ClientErrorNavigation = {
  from?: string
  to?: string
  slot?: string
  timestamp?: number
}

export type ClientErrorDiag = {
  layoutChromeMounts?: number
  clientErrorListenerMounts?: number
  listenerAttachCycles?: number
  mapboxPeakActive?: number
  mapboxActive?: number
}

export type ClientErrorEvent = {
  eventId: string
  source: ClientErrorSource
  message: string
  name?: string
  stack?: string
  componentStack?: string
  digest?: string
  route?: string
  previousPathname?: string
  navigation?: ClientErrorNavigation
  authStatus?: "loading" | "authenticated" | "unauthenticated"
  environment?: "web" | "native" | "unknown"
  platform?: string
  uaSummary?: string
  build?: string
  deploymentId?: string
  swController?: boolean
  nativeCleanupState?: string
  chunkReloadCount?: number
  diag?: ClientErrorDiag
  ts: number
}

const ALLOWED_KEYS = new Set([
  "eventId",
  "source",
  "message",
  "name",
  "stack",
  "componentStack",
  "digest",
  "route",
  "previousPathname",
  "navigation",
  "authStatus",
  "environment",
  "platform",
  "uaSummary",
  "build",
  "deploymentId",
  "swController",
  "nativeCleanupState",
  "chunkReloadCount",
  "diag",
  "ts",
  // legacy preview fields ignored if present
  "host",
  "native",
  "release",
])

function isSource(v: unknown): v is ClientErrorSource {
  return typeof v === "string" && (CLIENT_ERROR_SOURCES as readonly string[]).includes(v)
}

function cleanPath(v: unknown): string | undefined {
  if (typeof v !== "string" || !v) return undefined
  try {
    if (v.startsWith("http")) return new URL(v).pathname.slice(0, 200)
    const q = v.indexOf("?")
    const path = q >= 0 ? v.slice(0, q) : v
    // Drop sensitive query entirely — never keep search params
    return path.slice(0, 200)
  } catch {
    return undefined
  }
}

function cleanNav(raw: unknown): ClientErrorNavigation | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const n = raw as Record<string, unknown>
  const out: ClientErrorNavigation = {}
  const from = cleanPath(n.from)
  const to = cleanPath(n.to)
  if (from) out.from = from
  if (to) out.to = to
  if (typeof n.slot === "string") out.slot = n.slot.slice(0, 40)
  if (typeof n.timestamp === "number" && Number.isFinite(n.timestamp)) {
    out.timestamp = n.timestamp
  }
  return Object.keys(out).length ? out : undefined
}

function cleanDiag(raw: unknown): ClientErrorDiag | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const d = raw as Record<string, unknown>
  const out: ClientErrorDiag = {}
  for (const k of [
    "layoutChromeMounts",
    "clientErrorListenerMounts",
    "listenerAttachCycles",
    "mapboxPeakActive",
    "mapboxActive",
  ] as const) {
    const v = d[k]
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e6) {
      out[k] = Math.floor(v)
    }
  }
  return Object.keys(out).length ? out : undefined
}

export function generateEventId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  const cryptoObj = typeof crypto !== "undefined" ? crypto : null
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint8Array(6)
    cryptoObj.getRandomValues(buf)
    for (let i = 0; i < 6; i++) out += alphabet[buf[i]! % alphabet.length]
    return out
  }
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

/** Parse + sanitize body. Rejects unexpected shapes. */
export function parseClientErrorBody(body: unknown): ClientErrorEvent | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "invalid" }
  }
  const raw = body as Record<string, unknown>
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) {
      // Strip unknown keys silently rather than hard-fail (avoid breaking older clients)
      delete raw[key]
    }
  }

  if (!isSource(raw.source)) return { error: "source" }
  if (typeof raw.message !== "string" || !raw.message.trim()) return { error: "message" }

  const eventId =
    typeof raw.eventId === "string" && /^[A-Z0-9]{4,12}$/i.test(raw.eventId)
      ? raw.eventId.toUpperCase().slice(0, 12)
      : generateEventId()

  const auth =
    raw.authStatus === "loading" ||
    raw.authStatus === "authenticated" ||
    raw.authStatus === "unauthenticated"
      ? raw.authStatus
      : undefined

  const environment =
    raw.environment === "web" || raw.environment === "native" || raw.environment === "unknown"
      ? raw.environment
      : undefined

  const event: ClientErrorEvent = {
    eventId,
    source: raw.source,
    message: sanitizeMessage(raw.message),
    name: typeof raw.name === "string" ? raw.name.slice(0, 80) : undefined,
    stack: sanitizeStack(typeof raw.stack === "string" ? raw.stack : undefined),
    componentStack: sanitizeStack(
      typeof raw.componentStack === "string" ? raw.componentStack : undefined
    ),
    digest: typeof raw.digest === "string" ? raw.digest.slice(0, 64) : undefined,
    route: cleanPath(raw.route),
    previousPathname: cleanPath(raw.previousPathname),
    navigation: cleanNav(raw.navigation),
    authStatus: auth,
    environment,
    platform: typeof raw.platform === "string" ? raw.platform.slice(0, 32) : undefined,
    uaSummary:
      typeof raw.uaSummary === "string"
        ? sanitizeMessage(raw.uaSummary).slice(0, 120)
        : undefined,
    build: typeof raw.build === "string" ? raw.build.slice(0, 16) : undefined,
    deploymentId:
      typeof raw.deploymentId === "string" ? raw.deploymentId.slice(0, 64) : undefined,
    swController: typeof raw.swController === "boolean" ? raw.swController : undefined,
    nativeCleanupState:
      typeof raw.nativeCleanupState === "string"
        ? raw.nativeCleanupState.slice(0, 32)
        : undefined,
    chunkReloadCount:
      typeof raw.chunkReloadCount === "number" && Number.isFinite(raw.chunkReloadCount)
        ? Math.max(0, Math.min(10, Math.floor(raw.chunkReloadCount)))
        : undefined,
    diag: cleanDiag(raw.diag),
    ts: typeof raw.ts === "number" && Number.isFinite(raw.ts) ? raw.ts : Date.now(),
  }

  return event
}
