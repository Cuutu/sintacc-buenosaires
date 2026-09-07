import type { NextRequest } from "next/server"
import { sanitizeAnalyticsProps } from "@/lib/analytics-sanitize"
import { sanitizeAppVersion } from "@/lib/analytics-app-version"
import {
  ALLOWED_EVENT_PROP_KEYS,
  FIRST_PARTY_EVENTS,
  isAnalyticsEvent,
  type AnalyticsEvent,
} from "@/lib/analytics-catalog"

export const ANALYTICS_INGEST_MAX_BYTES = 8 * 1024
export const ANALYTICS_INGEST_MAX_EVENTS = 8

export type IngestedProductEvent = {
  name: AnalyticsEvent
  distinctId: string
  ts: Date
  platform: string
  authenticated: boolean
  source: string
  medium: string
  campaign: string
  referrerHost: string
  entryPath: string
  country: string
  region: string
  city: string
  device: string
  appVersion: string
  props: Record<string, string | number | boolean>
}

const PLATFORMS = new Set(["web", "pwa", "ios_native", "android_native"])

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

function parseTs(value: unknown, now: number): Date {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return new Date(now)
  if (Math.abs(now - n) > 2 * 60 * 60 * 1000) return new Date(now)
  return new Date(n)
}

function pickProps(
  raw: unknown
): Record<string, string | number | boolean> {
  if (!raw || typeof raw !== "object") return {}
  const input = raw as Record<string, unknown>
  const filtered: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_EVENT_PROP_KEYS.has(key)) continue
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      filtered[key] = typeof value === "string" ? value.slice(0, 120) : value
    }
  }
  return sanitizeAnalyticsProps(filtered) ?? {}
}

export function detectDeviceFromUa(ua: string): "mobile" | "tablet" | "desktop" | "" {
  const value = ua.toLowerCase()
  if (!value) return ""
  if (/ipad|tablet/.test(value)) return "tablet"
  if (/mobi|iphone|android/.test(value)) return "mobile"
  return "desktop"
}

export function geoFromRequest(request: NextRequest): {
  country: string
  region: string
  city: string
} {
  const decode = (header: string) => {
    const raw = request.headers.get(header) || ""
    try {
      return decodeURIComponent(raw).slice(0, 80)
    } catch {
      return raw.slice(0, 80)
    }
  }
  return {
    country: decode("x-vercel-ip-country"),
    region: decode("x-vercel-ip-country-region"),
    city: decode("x-vercel-ip-city"),
  }
}

export function parseAnalyticsIngestBody(
  body: unknown,
  now = Date.now()
): { events: Omit<IngestedProductEvent, "country" | "region" | "city" | "device">[] } | { error: string } {
  if (!body || typeof body !== "object") return { error: "invalid" }
  const eventsRaw = (body as { events?: unknown }).events
  if (!Array.isArray(eventsRaw) || eventsRaw.length === 0) return { error: "empty" }
  if (eventsRaw.length > ANALYTICS_INGEST_MAX_EVENTS) return { error: "too-many" }

  const events: Omit<IngestedProductEvent, "country" | "region" | "city" | "device">[] = []

  for (const item of eventsRaw) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    if (!isAnalyticsEvent(row.name) || !FIRST_PARTY_EVENTS.has(row.name)) continue
    const distinctId = clip(row.distinctId, 64)
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(distinctId)) continue
    const platform = clip(row.platform, 24)
    events.push({
      name: row.name,
      distinctId,
      ts: parseTs(row.ts, now),
      platform: PLATFORMS.has(platform) ? platform : "web",
      authenticated: row.authenticated === true,
      source: clip(row.source, 80) || "direct",
      medium: clip(row.medium, 80) || "none",
      campaign: clip(row.campaign, 80),
      referrerHost: clip(row.referrerHost, 80),
      entryPath: (clip(row.entryPath, 120) || "/").startsWith("/admin")
        ? "/"
        : clip(row.entryPath, 120) || "/",
      appVersion: sanitizeAppVersion(row.appVersion),
      props: pickProps(row.props),
    })
  }

  if (events.length === 0) return { error: "empty" }
  return { events }
}
