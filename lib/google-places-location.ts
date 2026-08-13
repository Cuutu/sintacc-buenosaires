import { findGooglePlaceFromMapsUrl } from "@/lib/google-places-enriched"
import {
  normalizeGoogleMapsUrl,
  resolveGoogleMapsUrl,
} from "@/lib/place-research/resolve-maps-url"

export type ResolvedMapsLocation = {
  address: string
  lat: number
  lng: number
  neighborhood?: string
  name?: string
}

export async function resolveMapsUrlToLocation(
  raw: string
): Promise<ResolvedMapsLocation | null> {
  const url = normalizeGoogleMapsUrl(raw)
  if (!url) return null

  const parsed = await resolveGoogleMapsUrl(url)
  if (!parsed) return null

  const enriched = await findGooglePlaceFromMapsUrl(url, parsed)
  if (
    enriched &&
    Number.isFinite(enriched.lat) &&
    Number.isFinite(enriched.lng) &&
    enriched.address
  ) {
    return {
      address: enriched.address,
      lat: enriched.lat,
      lng: enriched.lng,
      neighborhood: enriched.neighborhood,
      name: enriched.name,
    }
  }

  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) {
    return null
  }

  const address = parsed.placeName?.trim() || `${parsed.lat}, ${parsed.lng}`
  return {
    address,
    lat: parsed.lat as number,
    lng: parsed.lng as number,
    name: parsed.placeName,
  }
}
