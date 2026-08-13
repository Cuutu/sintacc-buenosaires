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
