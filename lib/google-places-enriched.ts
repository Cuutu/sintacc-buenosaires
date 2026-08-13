import {
  extractLocalityFromGoogle,
  getGoogleMapsApiKey,
  type GooglePlaceDetails,
} from "@/lib/google-places"
import { resolveGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"
import { isLikelyArgentinaCoords } from "@/lib/place-research/maps-location"
import {
  googleTextSearchCenter,
  googleTextSearchRegionCode,
} from "@/lib/geo-search-region"

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
  "generativeSummary",
  "reviewSummary",
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
  generativeOverview?: string
  generativeDescription?: string
  reviewSummaryText?: string
  primaryType?: string
  openingHoursText?: string
  reviewSnippets: string[]
  reviews: Array<{
    text: string
    rating?: number
    authorName?: string
    relativeTime?: string
  }>
}

interface GoogleReview {
  text?: { text?: string }
  rating?: number
  relativePublishTimeDescription?: string
  authorAttribution?: { displayName?: string }
}

interface GoogleGenerativeSummary {
  overview?: { text?: string }
  description?: { text?: string }
}

interface GoogleReviewSummary {
  text?: { text?: string }
  overview?: { text?: string }
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
  generativeSummary?: GoogleGenerativeSummary
  reviewSummary?: GoogleReviewSummary
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

  const reviews = (place.reviews ?? [])
    .map((r) => {
      const text = r.text?.text?.trim()
      if (!text) return null
      return {
        text,
        rating: r.rating,
        authorName: r.authorAttribution?.displayName?.trim() || undefined,
        relativeTime: r.relativePublishTimeDescription?.trim() || undefined,
      }
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r))

  const reviewSnippets = reviews.map((r) => r.text)

  const openingHoursText = place.regularOpeningHours?.weekdayDescriptions?.join("; ")
  const generativeOverview = place.generativeSummary?.overview?.text?.trim()
  const generativeDescription = place.generativeSummary?.description?.text?.trim()
  const reviewSummaryText =
    place.reviewSummary?.overview?.text?.trim() ||
    place.reviewSummary?.text?.text?.trim()

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
    generativeOverview,
    generativeDescription,
    reviewSummaryText,
    primaryType: place.primaryType,
    openingHoursText,
    reviewSnippets,
    reviews,
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
  const inferredRegion = googleTextSearchRegionCode(textQuery)
  const center = hasCoords
    ? { latitude: opts!.lat as number, longitude: opts!.lng as number }
    : googleTextSearchCenter(textQuery)
  const radius = hasCoords ? (opts?.radius ?? 300) : inferredRegion ? 600_000 : 50_000
  const biasInArgentina =
    hasCoords && isLikelyArgentinaCoords(opts!.lat as number, opts!.lng as number)

  const body: Record<string, unknown> = {
    textQuery: textQuery.trim(),
    languageCode: "es-419",
    locationBias: {
      circle: {
        center,
        radius,
      },
    },
    maxResultCount: 3,
  }
  // regionCode AR + bias CABA tira lugares de Brasil/Uruguay a cualquier lado.
  if (inferredRegion) body.regionCode = inferredRegion
  else if (biasInArgentina) body.regionCode = "AR"

  const res = await fetch(`${GOOGLE_PLACES_BASE_URL}:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify(body),
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

function approxKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng) * 111
}

export async function findGooglePlaceFromMapsUrl(
  mapsUrl: string,
  alreadyResolved?: Awaited<ReturnType<typeof resolveGoogleMapsUrl>>
): Promise<GooglePlaceEnriched | null> {
  const resolved = alreadyResolved ?? (await resolveGoogleMapsUrl(mapsUrl))
  if (!resolved) return null

  let enriched: GooglePlaceEnriched | null = null

  if (resolved.placeId?.startsWith("ChIJ")) {
    enriched = await fetchGooglePlaceEnriched(resolved.placeId)
  } else {
    const query = resolved.placeName?.trim()
    if (query) {
      const hit = await searchGooglePlaceByText(
        query,
        Number.isFinite(resolved.lat) && Number.isFinite(resolved.lng)
          ? { lat: resolved.lat, lng: resolved.lng, radius: 1500 }
          : undefined
      )
      if (hit?.placeId) enriched = await fetchGooglePlaceEnriched(hit.placeId)
    }
  }

  if (
    enriched &&
    Number.isFinite(resolved.lat) &&
    Number.isFinite(resolved.lng) &&
    approxKm(enriched, { lat: resolved.lat as number, lng: resolved.lng as number }) > 25
  ) {
    return {
      ...enriched,
      lat: resolved.lat as number,
      lng: resolved.lng as number,
    }
  }

  return enriched
}

/** Búsqueda extra orientada a sin TACC / celíaco (resumen Gemini de Google). */
export async function fetchGoogleGlutenContextSearch(input: {
  name: string
  address?: string
  lat?: number
  lng?: number
}): Promise<{ overview?: string; description?: string } | null> {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey || !input.name.trim()) return null

  const addressParts = input.address?.split(",").map((p) => p.trim()).filter(Boolean) ?? []
  const cityHint = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : ""
  const textQuery = [input.name, cityHint, "sin TACC celíaco"].filter(Boolean).join(" ")

  const hasCoords = Number.isFinite(input.lat) && Number.isFinite(input.lng)
  const inferredRegion = googleTextSearchRegionCode(textQuery)
  const center = hasCoords
    ? { latitude: input.lat as number, longitude: input.lng as number }
    : googleTextSearchCenter(textQuery)

  const glutenBody: Record<string, unknown> = {
    textQuery,
    languageCode: "es-419",
    locationBias: {
      circle: {
        center,
        radius: hasCoords ? 8000 : inferredRegion ? 600_000 : 50_000,
      },
    },
    maxResultCount: 3,
  }
  if (inferredRegion) glutenBody.regionCode = inferredRegion
  else if (
    hasCoords &&
    isLikelyArgentinaCoords(input.lat as number, input.lng as number)
  ) {
    glutenBody.regionCode = "AR"
  }

  const res = await fetch(`${GOOGLE_PLACES_BASE_URL}:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.generativeSummary",
    },
    body: JSON.stringify(glutenBody),
  })

  if (!res.ok) return null

  const data = (await res.json()) as {
    places?: Array<{
      displayName?: { text?: string }
      generativeSummary?: GoogleGenerativeSummary
    }>
  }

  const normalizedName = input.name.trim().toLowerCase()
  const match =
    data.places?.find((place) =>
      place.displayName?.text?.trim().toLowerCase().includes(normalizedName.slice(0, 12))
    ) ?? data.places?.[0]

  if (!match?.generativeSummary) return null

  return {
    overview: match.generativeSummary.overview?.text?.trim(),
    description: match.generativeSummary.description?.text?.trim(),
  }
}
