import {
  extractLocalityFromGoogle,
  getGoogleMapsApiKey,
  type GooglePlaceDetails,
} from "@/lib/google-places"
import { resolveGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"

const GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1/places"

const ENRICHED_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "addressComponents",
  "websiteUri",
  "nationalPhoneNumber",
  "googleMapsUri",
  "rating",
  "userRatingCount",
  "reviews",
  "editorialSummary",
  "primaryType",
  "regularOpeningHours",
].join(",")

export type GooglePlaceEnriched = GooglePlaceDetails & {
  websiteUri?: string
  phone?: string
  googleMapsUri?: string
  rating?: number
  userRatingCount?: number
  editorialSummary?: string
  primaryType?: string
  openingHoursText?: string
  reviewSnippets: string[]
}

interface GoogleReview {
  text?: { text?: string }
  rating?: number
}

interface GooglePlaceEnrichedResponse {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>
  websiteUri?: string
  nationalPhoneNumber?: string
  googleMapsUri?: string
  rating?: number
  userRatingCount?: number
  editorialSummary?: { text?: string }
  primaryType?: string
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  reviews?: GoogleReview[]
}

export function mapGooglePrimaryType(primaryType?: string): string {
  if (!primaryType) return "other"
  const map: Record<string, string> = {
    restaurant: "restaurant",
    cafe: "cafe",
    coffee_shop: "cafe",
    bakery: "bakery",
    ice_cream_shop: "icecream",
    bar: "bar",
    meal_takeaway: "restaurant",
    meal_delivery: "restaurant",
    grocery_store: "store",
    supermarket: "store",
    food_store: "store",
  }
  return map[primaryType] ?? "other"
}

export function normalizeGooglePlaceEnriched(
  place: GooglePlaceEnrichedResponse
): GooglePlaceEnriched | null {
  const lat = place.location?.latitude
  const lng = place.location?.longitude
  const address = place.formattedAddress
  const placeId = place.id

  if (!placeId || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  const reviewSnippets = (place.reviews ?? [])
    .map((r) => r.text?.text?.trim())
    .filter((t): t is string => Boolean(t))
    .slice(0, 5)

  const openingHoursText = place.regularOpeningHours?.weekdayDescriptions?.join("; ")

  return {
    placeId,
    name: place.displayName?.text,
    address,
    lat: lat as number,
    lng: lng as number,
    neighborhood: extractLocalityFromGoogle(place.addressComponents, address),
    websiteUri: place.websiteUri,
    phone: place.nationalPhoneNumber,
    googleMapsUri: place.googleMapsUri,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    editorialSummary: place.editorialSummary?.text,
    primaryType: place.primaryType,
    openingHoursText,
    reviewSnippets,
  }
}

export async function searchGooglePlaceByText(
  textQuery: string,
  opts?: { lat?: number; lng?: number; radius?: number }
): Promise<{ placeId: string; name?: string; address?: string } | null> {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey || !textQuery.trim()) return null

  const hasCoords =
    Number.isFinite(opts?.lat) && Number.isFinite(opts?.lng)
  const center = hasCoords
    ? { latitude: opts!.lat as number, longitude: opts!.lng as number }
    : { latitude: -34.6037, longitude: -58.3816 }
  const radius = hasCoords ? (opts?.radius ?? 300) : 50000

  const res = await fetch(`${GOOGLE_PLACES_BASE_URL}:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: textQuery.trim(),
      languageCode: "es-419",
      regionCode: "AR",
      locationBias: {
        circle: {
          center,
          radius,
        },
      },
      maxResultCount: 3,
    }),
  })

  if (!res.ok) return null

  const data = (await res.json()) as {
    places?: Array<{
      id?: string
      displayName?: { text?: string }
      formattedAddress?: string
    }>
  }

  const first = data.places?.[0]
  if (!first?.id) return null

  return {
    placeId: first.id,
    name: first.displayName?.text,
    address: first.formattedAddress,
  }
}

export async function fetchGooglePlaceEnriched(
  placeId: string
): Promise<GooglePlaceEnriched | null> {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) return null

  const params = new URLSearchParams({ languageCode: "es-419" })
  const res = await fetch(
    `${GOOGLE_PLACES_BASE_URL}/${encodeURIComponent(placeId)}?${params}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": ENRICHED_FIELD_MASK,
      },
    }
  )

  if (!res.ok) return null

  const data = (await res.json()) as GooglePlaceEnrichedResponse
  return normalizeGooglePlaceEnriched(data)
}

export async function findGooglePlaceFromMapsUrl(
  mapsUrl: string
): Promise<GooglePlaceEnriched | null> {
  const resolved = await resolveGoogleMapsUrl(mapsUrl)
  if (!resolved) return null

  if (resolved.placeId?.startsWith("ChIJ")) {
    return fetchGooglePlaceEnriched(resolved.placeId)
  }

  const query = resolved.placeName?.trim()
  if (!query) return null

  const hit = await searchGooglePlaceByText(
    query,
    Number.isFinite(resolved.lat) && Number.isFinite(resolved.lng)
      ? { lat: resolved.lat, lng: resolved.lng, radius: 250 }
      : undefined
  )
  if (!hit?.placeId) return null

  return fetchGooglePlaceEnriched(hit.placeId)
}
