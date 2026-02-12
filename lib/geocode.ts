import { LOCALITIES } from "./constants"

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
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token || !address.trim()) return null

  try {
    const encoded = encodeURIComponent(address.trim())
    const params = new URLSearchParams({
      access_token: token,
      country: "AR",
      limit: "1",
      proximity: "-58.3816,-34.6037",
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
