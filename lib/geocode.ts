import { LOCALITIES } from "./constants"
import { mapboxProximityParam } from "./geo-search-region"
import { normalizeGoogleMapsUrl } from "./place-research/resolve-maps-url"
import { parseFormCoords } from "./place-research/maps-location"

export interface GeocodeResult {
  address: string
  lat: number
  lng: number
  neighborhood?: string
}

/** Extrae la localidad (barrio o ciudad) del resultado de Mapbox */
export function extractLocality(
  placeName: string,
  context?: Array<{ id: string; text: string }>
): string | undefined {
  const searchText = placeName.toLowerCase()
  const contextText = context?.map((c) => c.text.toLowerCase()).join(" ") || ""

  // 1. Matchear contra nuestra lista de localidades (CABA + ciudades Argentina)
  for (const loc of LOCALITIES) {
    const locLower = loc.toLowerCase()
    if (searchText.includes(locLower) || contextText.includes(locLower)) {
      return loc
    }
  }

  // 2. Extraer de Mapbox context: neighborhood, locality o place
  if (context?.length) {
    const priority = ["neighborhood", "locality", "place"]
    for (const type of priority) {
      const item = context.find((c) => c.id.startsWith(`${type}.`))
      if (item?.text?.trim()) return item.text.trim()
    }
  }

  return undefined
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const mapsUrl = normalizeGoogleMapsUrl(address)
  if (mapsUrl) {
    const fromMaps = await geocodeMapsUrl(mapsUrl)
    if (fromMaps) return fromMaps
  }

  const googleResult = await geocodeAddressWithGoogle(address)
  if (googleResult) return googleResult

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token || !address.trim()) return null

  try {
    const encoded = encodeURIComponent(address.trim())
    const params = new URLSearchParams({
      access_token: token,
      limit: "1",
      proximity: mapboxProximityParam(address),
      types: "address,place,locality,neighborhood",
      language: "es",
    })

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?${params}`
    )
    const data = await res.json()

    const feature = data.features?.[0]
    if (!feature?.center) return null

    const [lng, lat] = feature.center
    const neighborhood = extractLocality(feature.place_name, feature.context)

    return {
      address: feature.place_name,
      lat,
      lng,
      neighborhood,
    }
  } catch {
    return null
  }
}

async function geocodeMapsUrl(url: string): Promise<GeocodeResult | null> {
  if (typeof window === "undefined") return null
  try {
    const params = new URLSearchParams({ url })
    const res = await fetch(`/api/google-places/resolve-maps?${params}`)
    if (!res.ok) return null
    const data: { result?: GeocodeResult | null } = await res.json()
    return data.result ?? null
  } catch {
    return null
  }
}

async function geocodeAddressWithGoogle(address: string): Promise<GeocodeResult | null> {
  if (typeof window === "undefined" || !address.trim()) return null

  try {
    const params = new URLSearchParams({ address: address.trim() })
    const res = await fetch(`/api/google-places/geocode?${params}`)
    if (!res.ok) return null

    const data: { result?: GeocodeResult | null } = await res.json()
    return data.result ?? null
  } catch {
    return null
  }
}

export async function resolveFormLocation(input: {
  address: string
  lat?: string
  lng?: string
  neighborhood?: string
  mapsUrl?: string
}): Promise<GeocodeResult | null> {
  const mapsSource = normalizeGoogleMapsUrl(input.address) || normalizeGoogleMapsUrl(input.mapsUrl ?? "")
  if (mapsSource) {
    const fromMaps = await geocodeAddress(mapsSource)
    if (fromMaps) return fromMaps
  }

  const existing = parseFormCoords(input.lat, input.lng)
  if (existing) {
    return {
      address: input.address.trim(),
      lat: existing.lat,
      lng: existing.lng,
      neighborhood: input.neighborhood?.trim() || undefined,
    }
  }

  return geocodeAddress(input.address)
}

export function applyGeoToForm<T extends {
  address: string
  lat: string
  lng: string
  neighborhood: string
}>(prev: T, geo: GeocodeResult): T {
  const addressIncomplete =
    !prev.address.trim() || /a completar/i.test(prev.address)
  const neighborhoodIncomplete =
    !prev.neighborhood.trim() || /a completar/i.test(prev.neighborhood)
  return {
    ...prev,
    lat: String(geo.lat),
    lng: String(geo.lng),
    address: addressIncomplete ? geo.address : prev.address,
    neighborhood: neighborhoodIncomplete
      ? geo.neighborhood || prev.neighborhood || "Otro"
      : prev.neighborhood,
  }
}

/** Reverse geocode: obtiene dirección a partir de lat/lng (para mapa pin) */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null

  try {
    const params = new URLSearchParams({
      access_token: token,
      types: "address,place,locality,neighborhood",
      language: "es",
    })

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`
    )
    const data = await res.json()

    const feature = data.features?.[0]
    if (!feature?.center) return null

    const [lngRes, latRes] = feature.center
    const neighborhood = extractLocality(feature.place_name, feature.context)

    return {
      address: feature.place_name,
      lat: latRes,
      lng: lngRes,
      neighborhood,
    }
  } catch {
    return null
  }
}
