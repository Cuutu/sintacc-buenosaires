const REDIRECT_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 8
const HTML_SNIFF_LIMIT = 200_000
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

export type GoogleMapsUrlResolution = {
  finalUrl: string
  placeName?: string
  lat?: number
  lng?: number
  placeId?: string
  cid?: string
  featureId?: string
  kgId?: string
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[),.;!?]+$/g, "")
}

function isMapsShortHost(host: string): boolean {
  return host === "maps.app.goo.gl" || host === "goo.gl"
}

function isGoogleMapsWebHost(host: string): boolean {
  return (
    host === "maps.google.com" ||
    host === "google.com" ||
    host === "google.com.ar" ||
    host.endsWith(".google.com") ||
    host.endsWith(".google.com.ar")
  )
}

export function isAllowedGoogleMapsHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === "consent.google.com" || host === "accounts.google.com") return false
  return isMapsShortHost(host) || isGoogleMapsWebHost(host)
}

function looksLikeGoogleMapsUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  if (isMapsShortHost(host) || host === "maps.google.com" || host.startsWith("maps.google.")) {
    return true
  }
  if (!isGoogleMapsWebHost(host)) return false
  return (
    url.pathname.includes("/maps") ||
    url.searchParams.has("cid") ||
    url.searchParams.has("place_id") ||
    url.searchParams.has("query_place_id")
  )
}

export function isGoogleMapsUrl(raw: string): boolean {
  try {
    return looksLikeGoogleMapsUrl(new URL(raw))
  } catch {
    return false
  }
}

export function isUsableMapsPlaceName(name?: string | null): boolean {
  const text = String(name ?? "").trim()
  if (text.length < 2) return false
  if (/^data=/i.test(text)) return false
  if (/^0x[a-f0-9]+/i.test(text)) return false
  if (/^ChIJ[a-zA-Z0-9_-]+$/.test(text)) return false
  return true
}

export function normalizeGoogleMapsUrl(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null

  const whole = /^https?:\/\//i.test(text) ? text : `https://${text}`
  const wholeClean = stripTrailingPunctuation(whole)
  if (isGoogleMapsUrl(wholeClean)) return wholeClean

  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? []
  for (const match of matches) {
    const candidate = stripTrailingPunctuation(match)
    if (isGoogleMapsUrl(candidate)) return candidate
  }

  const short = text.match(/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/[^\s<>"']+/i)
  if (short) {
    const candidate = `https://${stripTrailingPunctuation(short[0])}`
    if (isGoogleMapsUrl(candidate)) return candidate
  }

  return null
}

function parseLatLngPair(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null
  const match = value.trim().match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export function parseGoogleMapsUrl(finalUrl: string): GoogleMapsUrlResolution {
  const resolution: GoogleMapsUrlResolution = { finalUrl }

  try {
    const url = new URL(finalUrl)

    const placeId =
      url.searchParams.get("place_id") ?? url.searchParams.get("query_place_id")
    if (placeId) resolution.placeId = placeId

    const cid = url.searchParams.get("cid")
    if (cid) resolution.cid = cid

    const placeMatch = url.pathname.match(/\/place\/([^/@]+)/)
    if (placeMatch) {
      const name = decodeURIComponent(placeMatch[1].replace(/\+/g, " "))
      if (isUsableMapsPlaceName(name)) resolution.placeName = name
    }

    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) {
      resolution.lat = Number(atMatch[1])
      resolution.lng = Number(atMatch[2])
    }

    const q = url.searchParams.get("q") ?? url.searchParams.get("query")
    const qCoords = parseLatLngPair(q)
    if (qCoords) {
      resolution.lat = qCoords.lat
      resolution.lng = qCoords.lng
    } else if (q && !resolution.placeName && isUsableMapsPlaceName(q)) {
      resolution.placeName = q
    }

    const ll =
      parseLatLngPair(url.searchParams.get("ll")) ??
      parseLatLngPair(url.searchParams.get("center"))
    if (ll && resolution.lat == null) {
      resolution.lat = ll.lat
      resolution.lng = ll.lng
    }

    const precise = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    if (precise) {
      resolution.lat = Number(precise[1])
      resolution.lng = Number(precise[2])
    }

    const feature = finalUrl.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+|ChIJ[a-zA-Z0-9_-]+)/i)
    if (feature) resolution.featureId = feature[1]

    const kg =
      finalUrl.match(/%2Fg%2F([a-z0-9_]+)/i) ?? finalUrl.match(/\/g\/([a-z0-9_]+)/i)
    if (kg) resolution.kgId = kg[1]
  } catch {
    // keep partial resolution
  }

  return resolution
}

export function extractMapsRedirectFromHtml(html: string, baseUrl: string): string | null {
  const sniff = html.slice(0, HTML_SNIFF_LIMIT)
  const patterns = [
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=["']?([^"'>\s]+)/i,
    /window\.location(?:\.replace)?\(["'](https:[^"']+)["']\)/i,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  ]

  for (const pattern of patterns) {
    const match = sniff.match(pattern)
    if (!match?.[1]) continue
    try {
      const abs = new URL(match[1].replace(/&amp;/g, "&"), baseUrl).toString()
      if (isGoogleMapsUrl(abs) && abs !== baseUrl) return abs
    } catch {
      // skip bad candidate
    }
  }

  return null
}

async function followGoogleMapsRedirects(rawUrl: string): Promise<string | null> {
  if (!isGoogleMapsUrl(rawUrl)) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REDIRECT_TIMEOUT_MS)

  try {
    let current = rawUrl.trim()

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      let parsed: URL
      try {
        parsed = new URL(current)
      } catch {
        return null
      }

      if (!isAllowedGoogleMapsHost(parsed.hostname)) return null

      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml",
        },
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location")
        if (!location) return current
        current = new URL(location, current).toString()
        continue
      }

      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("text/html")) {
        const html = await res.text()
        const extracted = extractMapsRedirectFromHtml(html, current)
        if (extracted) {
          current = extracted
          continue
        }
      }

      return current
    }

    return current
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function resolveGoogleMapsUrl(
  rawUrl: string
): Promise<GoogleMapsUrlResolution | null> {
  const normalized = normalizeGoogleMapsUrl(rawUrl) ?? rawUrl
  const finalUrl = await followGoogleMapsRedirects(normalized)
  if (!finalUrl) return null
  return parseGoogleMapsUrl(finalUrl)
}
