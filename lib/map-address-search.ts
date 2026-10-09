/**
 * Búsqueda por dirección en /mapa.
 *
 * El buscador del mapa filtra lugares por texto (nombre, dirección, barrio). Una
 * dirección donde no hay ningún lugar ("Corrientes 1234") daba 0 resultados y el
 * mapa no se movía. Si la búsqueda parece una dirección y el texto no matchea
 * nada, se geocodifica con Mapbox (token público, ya usado en el cliente) y el
 * mapa vuela ahí mostrando los lugares de alrededor.
 */
import { forwardGeocode, type ForwardGeocodeResult } from "@/lib/mapboxGeocode"
import { inferGeoSearchCountry } from "@/lib/geo-search-region"

export type MapSearchPin = {
  /** Búsqueda (trim) que originó el pin: si cambia, el pin deja de aplicar. */
  query: string
  lng: number
  lat: number
  label: string
}

/** Calle + altura: "Corrientes 1234", "Av. Santa Fe 3200, Palermo", "Calle 7 nro 850". */
export function looksLikeStreetAddress(query: string): boolean {
  const q = query.trim()
  if (q.length < 5 || q.length > 120) return false
  return /(^|[^\p{L}\p{N}])\d{1,5}([^\p{L}\p{N}]|$)/u.test(q) && /\p{L}{3,}/u.test(q)
}

const PIN_PLACE_TYPES = new Set(["address", "poi"])

/** Sólo resultados con precisión de calle: una ciudad o región no sirve como "cerca de". */
export function pickAddressResult(results: ForwardGeocodeResult[]): ForwardGeocodeResult | null {
  return (
    results.find(
      (r) =>
        Number.isFinite(r.lng) &&
        Number.isFinite(r.lat) &&
        (r.place_type ?? []).some((type) => PIN_PLACE_TYPES.has(type))
    ) ?? null
  )
}

/** Primer tramo legible del resultado ("Avenida Corrientes 1234"). */
export function shortAddressLabel(placeName: string, fallback: string): string {
  const first = placeName.split(",")[0]?.trim()
  return first || fallback.trim()
}

export async function geocodeMapSearchAddress(
  query: string,
  signal?: AbortSignal
): Promise<MapSearchPin | null> {
  const trimmed = query.trim()
  if (!looksLikeStreetAddress(trimmed)) return null
  const country = inferGeoSearchCountry(trimmed)
  const results = await forwardGeocode(trimmed, {
    country: country === "all" ? "ar" : country,
    limit: 3,
    signal,
  })
  const hit = pickAddressResult(results)
  if (!hit) return null
  return {
    query: trimmed,
    lng: hit.lng,
    lat: hit.lat,
    label: shortAddressLabel(hit.place_name, trimmed),
  }
}
