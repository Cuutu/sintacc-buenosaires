import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, resolve } from "path"
import { reverseGeocode as reverseGeocodeMapbox } from "@/lib/mapboxGeocode"
import {
  extractLocalityFromGoogle,
  getGoogleMapsApiKey,
} from "@/lib/google-places"

export type KmlGeocodeEntry = {
  lat: number
  lng: number
  address: string
  addressText: string
  neighborhood?: string
  provider: "mapbox" | "google" | "none"
  needsUserInput?: boolean
  error?: string
  fetchedAt: string
}

export type KmlGeocodeCache = {
  version: 1
  updatedAt: string
  entries: Record<string, KmlGeocodeEntry>
}

const DEFAULT_CACHE_PATH = "data/kml-geocode-cache.json"

export function coordsCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

export function loadGeocodeCache(path = DEFAULT_CACHE_PATH): KmlGeocodeCache {
  const full = resolve(process.cwd(), path)
  if (!existsSync(full)) {
    return { version: 1, updatedAt: new Date().toISOString(), entries: {} }
  }
  try {
    const raw = JSON.parse(readFileSync(full, "utf8")) as KmlGeocodeCache
    if (!raw?.entries || typeof raw.entries !== "object") {
      return { version: 1, updatedAt: new Date().toISOString(), entries: {} }
    }
    return raw
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), entries: {} }
  }
}

export function saveGeocodeCache(
  cache: KmlGeocodeCache,
  path = DEFAULT_CACHE_PATH
): void {
  const full = resolve(process.cwd(), path)
  mkdirSync(dirname(full), { recursive: true })
  cache.updatedAt = new Date().toISOString()
  writeFileSync(full, JSON.stringify(cache, null, 2), "utf8")
}

export async function reverseGeocodeCached(
  lat: number,
  lng: number,
  cache: KmlGeocodeCache
): Promise<KmlGeocodeEntry> {
  const key = coordsCacheKey(lat, lng)
  const hit = cache.entries[key]
  if (hit && hit.provider !== "none" && hit.address) return hit

  const mapbox = await tryMapbox(lat, lng)
  if (mapbox) {
    cache.entries[key] = mapbox
    return mapbox
  }

  const google = await tryGoogle(lat, lng)
  if (google) {
    cache.entries[key] = google
    return google
  }

  const empty: KmlGeocodeEntry = {
    lat,
    lng,
    address: "",
    addressText: "",
    provider: "none",
    needsUserInput: true,
    error: "mapbox+google fallaron o sin API key",
    fetchedAt: new Date().toISOString(),
  }
  cache.entries[key] = empty
  return empty
}

async function tryMapbox(lat: number, lng: number): Promise<KmlGeocodeEntry | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
  // token Mapbox real suele ser pk.eyJ... > 60 chars
  if (!token || token.length < 40) return null

  const result = await reverseGeocodeMapbox(lat, lng)
  if (!result?.address && !result?.addressText) return null

  return {
    lat,
    lng,
    address: result.address || result.addressText,
    addressText: result.addressText || result.address,
    neighborhood: result.neighborhood,
    provider: "mapbox",
    needsUserInput: result.needsUserInput,
    fetchedAt: new Date().toISOString(),
  }
}

async function tryGoogle(lat: number, lng: number): Promise<KmlGeocodeEntry | null> {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      language: "es",
      result_type: "street_address|route|premise",
      key: apiKey,
    })
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      status?: string
      results?: Array<{
        formatted_address?: string
        address_components?: Array<{
          long_name?: string
          short_name?: string
          types?: string[]
        }>
      }>
    }
    if (data.status !== "OK" || !data.results?.[0]?.formatted_address) {
      // retry sin result_type (más permisivo)
      const params2 = new URLSearchParams({
        latlng: `${lat},${lng}`,
        language: "es",
        key: apiKey,
      })
      const res2 = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params2}`
      )
      if (!res2.ok) return null
      const data2 = (await res2.json()) as typeof data
      if (data2.status !== "OK" || !data2.results?.[0]?.formatted_address) return null
      return entryFromGoogle(lat, lng, data2.results[0])
    }

    return entryFromGoogle(lat, lng, data.results[0])
  } catch {
    return null
  }
}

function entryFromGoogle(
  lat: number,
  lng: number,
  first: {
    formatted_address?: string
    address_components?: Array<{
      long_name?: string
      short_name?: string
      types?: string[]
    }>
  }
): KmlGeocodeEntry {
  const components =
    first.address_components?.map((c) => ({
      longText: c.long_name,
      shortText: c.short_name,
      types: c.types,
    })) ?? []

  const address = first.formatted_address || ""
  return {
    lat,
    lng,
    address,
    addressText: address,
    neighborhood: extractLocalityFromGoogle(components, address),
    provider: "google",
    needsUserInput: false,
    fetchedAt: new Date().toISOString(),
  }
}

/** Enriquecer drafts in-place con address/barrio del cache/API. */
export async function enrichDraftsWithGeocode<
  T extends {
    location: { lat: number; lng: number }
    address: string
    neighborhood: string
    addressText?: string
  },
>(
  drafts: T[],
  opts: {
    cachePath?: string
    concurrency?: number
    force?: boolean
    onProgress?: (done: number, total: number) => void
  } = {}
): Promise<{
  cache: KmlGeocodeCache
  geocoded: number
  failed: number
  fromCache: number
}> {
  const cache = loadGeocodeCache(opts.cachePath)
  const concurrency = opts.concurrency ?? 4
  let geocoded = 0
  let failed = 0
  let fromCache = 0
  let done = 0

  const queue = [...drafts.entries()]

  async function worker() {
    while (queue.length) {
      const item = queue.shift()
      if (!item) break
      const [, draft] = item
      const key = coordsCacheKey(draft.location.lat, draft.location.lng)
      const cached = cache.entries[key]
      const usable =
        !opts.force &&
        cached &&
        cached.provider !== "none" &&
        Boolean(cached.address)

      let entry: KmlGeocodeEntry
      if (usable && cached) {
        entry = cached
        fromCache += 1
      } else {
        entry = await reverseGeocodeCached(
          draft.location.lat,
          draft.location.lng,
          cache
        )
        if (entry.provider === "none") failed += 1
        else geocoded += 1
      }

      if (entry.address) {
        draft.address = entry.address
        draft.addressText = entry.addressText || entry.address
        if (entry.neighborhood) draft.neighborhood = entry.neighborhood
      }

      done += 1
      opts.onProgress?.(done, drafts.length)

      if (!usable) await sleep(80)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  saveGeocodeCache(cache, opts.cachePath)
  return { cache, geocoded, failed, fromCache }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
