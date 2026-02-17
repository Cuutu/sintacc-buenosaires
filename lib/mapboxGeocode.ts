/**
 * Mapbox Geocoding API helpers.
 *
 * Configuración:
 * - Agregar NEXT_PUBLIC_MAPBOX_TOKEN en .env.local (token público de Mapbox)
 * - Obtener en: mapbox.com → Account → Access tokens
 * - En Mapbox Studio, configurar Allowed URLs para tu dominio
 *
 * https://docs.mapbox.com/api/search/geocoding/
 */

const MAPBOX_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places"
const CABA_PROXIMITY = "-58.3816,-34.6037"

export interface ForwardGeocodeResult {
  address: string
  lat: number
  lng: number
  neighborhood?: string
  place_name: string
  place_type?: string[]
  center: [number, number]
}

export interface ReverseGeocodeResult {
  address: string
  lat: number
  lng: number
  neighborhood?: string
  addressText: string
  /** Si Mapbox no devolvió dirección útil */
  needsUserInput: boolean
}

/** Feature raw de Mapbox Geocoding */
export interface MapboxFeature {
  id: string
  place_name: string
  center: [number, number]
  place_type?: string[]
  context?: Array<{ id: string; text: string }>
  address?: string
  text?: string
}

function getToken(): string | null {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || null
}

/**
 * Forward geocode: busca por texto.
 * @param signal AbortController.signal para cancelar
 */
export async function forwardGeocode(
  query: string,
  opts: {
    country?: string
    proximity?: [number, number]
    limit?: number
    signal?: AbortSignal
  } = {}
): Promise<ForwardGeocodeResult[]> {
  const token = getToken()
  if (!token || !query.trim()) return []

  const params = new URLSearchParams({
    access_token: token,
    country: opts.country ?? "AR",
    limit: String(opts.limit ?? 5),
    types: "address,poi,place,locality,neighborhood",
    language: "es",
  })
  if (opts.proximity) {
    params.set("proximity", `${opts.proximity[0]},${opts.proximity[1]}`)
  } else {
    params.set("proximity", CABA_PROXIMITY)
  }

  const res = await fetch(
    `${MAPBOX_BASE}/${encodeURIComponent(query.trim())}.json?${params}`,
    { signal: opts.signal }
  )
  const data = await res.json()
  const features: MapboxFeature[] = data.features ?? []

  return features.map((f) => {
    const [lng, lat] = f.center
    const neighborhood = extractNeighborhoodFromContext(f.context)
    return {
      address: f.place_name,
      lat,
      lng,
      neighborhood,
      place_name: f.place_name,
      place_type: f.place_type,
      center: f.center,
    }
  })
}

function extractNeighborhoodFromContext(
  context?: Array<{ id: string; text: string }>
): string | undefined {
  if (!context?.length) return undefined
  const priority = ["neighborhood", "locality", "place"]
  for (const type of priority) {
    const item = context.find((c) => c.id.startsWith(`${type}.`))
    if (item?.text?.trim()) return item.text.trim()
  }
  return undefined
}

/**
 * Parsea un feature de Mapbox reverse geocode a addressText humano.
 * Prioridad: 1) address 2) poi+place 3) neighborhood+locality 4) place
 */
export function formatAddressTextFromFeature(feature: MapboxFeature | null): {
  addressText: string
  needsUserInput: boolean
} {
  if (!feature?.place_name) {
    return { addressText: "", needsUserInput: true }
  }

  const types = feature.place_type ?? []
  const context = feature.context ?? []
  const placeName = feature.place_name.trim()
  const neighborhood = context.find((c) => c.id.startsWith("neighborhood."))?.text?.trim()
  const locality = context.find((c) => c.id.startsWith("locality."))?.text?.trim()
  const place = context.find((c) => c.id.startsWith("place."))?.text?.trim()

  if (types.includes("address")) {
    return { addressText: placeName, needsUserInput: false }
  }

  if (types.includes("poi")) {
    const poiPart = feature.text ?? placeName.split(",")[0]?.trim() ?? placeName
    const locPart = neighborhood || locality || place
    const text = locPart ? `Cerca de ${poiPart}, ${locPart}` : `Cerca de ${poiPart}`
    return { addressText: text, needsUserInput: false }
  }

  if (types.includes("neighborhood") || types.includes("locality")) {
    const locPart = neighborhood || locality || placeName.split(",")[0]
    return { addressText: locPart ?? placeName, needsUserInput: false }
  }

  if (types.includes("place")) {
    return { addressText: placeName, needsUserInput: false }
  }

  if (placeName.length > 5) {
    return { addressText: placeName, needsUserInput: false }
  }

  return { addressText: "", needsUserInput: true }
}

/**
 * Reverse geocode: coords → dirección.
 * @param signal AbortController.signal para cancelar
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  opts: { signal?: AbortSignal } = {}
): Promise<ReverseGeocodeResult | null> {
  const token = getToken()
  if (!token) return null

  try {
    const params = new URLSearchParams({
      access_token: token,
      types: "address,poi,place,locality,neighborhood",
      language: "es",
    })

    const res = await fetch(
      `${MAPBOX_BASE}/${lng},${lat}.json?${params}`,
      { signal: opts.signal }
    )
    const data = await res.json()
    const feature: MapboxFeature | null = data.features?.[0] ?? null

    const { addressText, needsUserInput } = formatAddressTextFromFeature(feature)
    const neighborhood = feature
      ? extractNeighborhoodFromContext(feature.context)
      : undefined
    const address = feature?.place_name ?? ""

    return {
      address: address || (needsUserInput ? "" : "Ubicación seleccionada"),
      lat,
      lng,
      neighborhood,
      addressText: addressText || (needsUserInput ? "" : "Ubicación seleccionada (sin dirección)"),
      needsUserInput,
    }
  } catch {
    return null
  }
}
