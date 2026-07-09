const REDIRECT_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 8

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

export function isGoogleMapsUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase()
    return (
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "maps.google.com" ||
      host.endsWith(".google.com") ||
      host.endsWith(".google.com.ar")
    )
  } catch {
    return false
  }
}

function isAllowedGoogleMapsHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "maps.google.com" ||
    host.endsWith(".google.com") ||
    host.endsWith(".google.com.ar")
  )
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
      resolution.placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "))
    }

    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) {
      resolution.lat = Number(atMatch[1])
      resolution.lng = Number(atMatch[2])
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
          "User-Agent": "CelimapResearchBot/1.0 (+https://celimap.com.ar)",
          Accept: "text/html,application/xhtml+xml",
        },
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location")
        if (!location) return current
        current = new URL(location, current).toString()
        continue
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
  const finalUrl = await followGoogleMapsRedirects(rawUrl)
  if (!finalUrl) return null
  return parseGoogleMapsUrl(finalUrl)
}
