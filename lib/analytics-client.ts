import { getAnalyticsPlatform } from "@/lib/analytics-platform"
import { captureAnalyticsAttribution, getAnalyticsAttribution } from "@/lib/analytics-attribution"
import { getAnalyticsAppVersion } from "@/lib/analytics-app-version"
import {
  FIRST_PARTY_EVENTS,
  type AnalyticsEvent,
} from "@/lib/analytics-catalog"

const DISTINCT_KEY = "celimap_aid"
const FLUSH_MS = 2000
const MAX_BATCH = 8

export type FirstPartyEventPayload = {
  name: AnalyticsEvent
  props?: Record<string, string | number | boolean>
  distinctId: string
  platform: string
  authenticated: boolean
  ts: number
  source: string
  medium: string
  campaign: string
  referrerHost: string
  entryPath: string
  appVersion: string
}

let authenticated = false
let queue: FirstPartyEventPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

export function setAnalyticsAuthenticated(value: boolean): void {
  authenticated = value
}

export function getAnalyticsAuthenticated(): boolean {
  return authenticated
}

export function getAnalyticsDistinctId(): string {
  if (typeof window === "undefined") return ""
  try {
    const existing = window.localStorage.getItem(DISTINCT_KEY)
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 32)
        : `id${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(DISTINCT_KEY, id)
    return id
  } catch {
    return ""
  }
}

function shouldSkipPath(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.location.pathname.startsWith("/admin")
  } catch {
    return true
  }
}

function bindFlushListeners(): void {
  if (listenersBound || typeof window === "undefined") return
  listenersBound = true
  const flush = () => flushFirstPartyQueue(true)
  window.addEventListener("pagehide", flush)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush()
  })
}

function scheduleFlush(): void {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushFirstPartyQueue(false)
  }, FLUSH_MS)
}

export function enqueueFirstPartyEvent(
  name: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return
  if (process.env.NODE_ENV === "test") return
  if (!FIRST_PARTY_EVENTS.has(name)) return
  if (shouldSkipPath()) return

  const distinctId = getAnalyticsDistinctId()
  if (!distinctId) return

  try {
    captureAnalyticsAttribution()
  } catch {
    /* ignore */
  }
  const attr = getAnalyticsAttribution()

  queue.push({
    name,
    props: properties,
    distinctId,
    platform: getAnalyticsPlatform(),
    authenticated,
    ts: Date.now(),
    source: attr.source,
    medium: attr.medium,
    campaign: attr.campaign,
    referrerHost: attr.referrerHost,
    entryPath: attr.entryPath,
    appVersion: getAnalyticsAppVersion(),
  })

  if (queue.length >= MAX_BATCH) {
    flushFirstPartyQueue(false)
    return
  }
  bindFlushListeners()
  scheduleFlush()
}

export function flushFirstPartyQueue(keepalive: boolean): void {
  if (typeof window === "undefined") return
  if (queue.length === 0) return
  const batch = queue.splice(0, MAX_BATCH)
  const body = JSON.stringify({ events: batch })

  try {
    if (keepalive && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" })
      navigator.sendBeacon("/api/analytics/events", blob)
      return
    }
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    /* analytics nunca rompe UX */
  }
}

export function __resetAnalyticsClientForTests(): void {
  authenticated = false
  queue = []
  if (flushTimer != null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}
