/** Placeholder de sugerencia rápida: Obelisco. No es ubicación real. */
export const PLACEHOLDER_CABA_LOCATION = {
  lat: -34.6037,
  lng: -58.3816,
} as const

const EPS = 1e-5

export function isPlaceholderCabaLocation(loc?: {
  lat?: number
  lng?: number
} | null): boolean {
  const lat = loc?.lat
  const lng = loc?.lng
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return true
  }
  return (
    Math.abs(lat - PLACEHOLDER_CABA_LOCATION.lat) < EPS &&
    Math.abs(lng - PLACEHOLDER_CABA_LOCATION.lng) < EPS
  )
}

/** Caja aproximada de Argentina (sin Islas Malvinas). */
export function isLikelyArgentinaCoords(lat: number, lng: number): boolean {
  return lat <= -21 && lat >= -55.2 && lng <= -53.2 && lng >= -73.6
}

export function isCountryOnlyAddress(address?: string | null): boolean {
  const text = String(address ?? "")
    .trim()
    .toLowerCase()
  return (
    text === "argentina" ||
    text === "brasil" ||
    text === "brazil" ||
    text === "uruguay"
  )
}

export function shouldReplaceDraftLocation(current?: {
  lat?: number
  lng?: number
} | null): boolean {
  return isPlaceholderCabaLocation(current)
}

export function parseFormCoords(
  lat?: string | number | null,
  lng?: string | number | null
): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null
  if (typeof lat === "string" && !lat.trim()) return null
  if (typeof lng === "string" && !lng.trim()) return null
  const parsedLat = typeof lat === "number" ? lat : Number(String(lat).trim())
  const parsedLng = typeof lng === "number" ? lng : Number(String(lng).trim())
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null
  if (isPlaceholderCabaLocation({ lat: parsedLat, lng: parsedLng })) return null
  return { lat: parsedLat, lng: parsedLng }
}

/** Lee `{ lat, lng }` o GeoJSON Point `{ coordinates: [lng, lat] }`. */
export function readPlaceCoords(location: unknown): { lat: number; lng: number } | null {
  if (!location || typeof location !== "object") return null
  const loc = location as { lat?: unknown; lng?: unknown; coordinates?: unknown }
  let lat: number | undefined
  let lng: number | undefined
  if (typeof loc.lat === "number" && typeof loc.lng === "number") {
    lat = loc.lat
    lng = loc.lng
  } else if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    const [c0, c1] = loc.coordinates
    if (typeof c0 === "number" && typeof c1 === "number") {
      lng = c0
      lat = c1
    }
  }
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}
