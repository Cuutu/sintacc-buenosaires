import { LOCALITIES } from "@/lib/constants"

export interface GooglePlacePrediction {
  placeId: string
  text: string
  mainText?: string
  secondaryText?: string
}

export interface GooglePlaceDetails {
  placeId: string
  name?: string
  address: string
  lat: number
  lng: number
  neighborhood?: string
}

interface GoogleAddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

interface GoogleAutocompleteSuggestion {
  placePrediction?: {
    placeId?: string
    text?: { text?: string }
    structuredFormat?: {
      mainText?: { text?: string }
      secondaryText?: { text?: string }
    }
  }
}

interface GooglePlaceDetailsResponse {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  addressComponents?: GoogleAddressComponent[]
}

export function getGoogleMapsApiKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    null
  )
}

export function normalizeGooglePredictions(
  suggestions: GoogleAutocompleteSuggestion[] = []
): GooglePlacePrediction[] {
  return suggestions.reduce<GooglePlacePrediction[]>((items, suggestion) => {
    const prediction = suggestion.placePrediction
    const placeId = prediction?.placeId
    const text = prediction?.text?.text
    if (!placeId || !text) return items

    items.push({
      placeId,
      text,
      mainText: prediction.structuredFormat?.mainText?.text,
      secondaryText: prediction.structuredFormat?.secondaryText?.text,
    })
    return items
  }, [])
}

export function normalizeGooglePlaceDetails(
  place: GooglePlaceDetailsResponse
): GooglePlaceDetails | null {
  const lat = place.location?.latitude
  const lng = place.location?.longitude
  const address = place.formattedAddress
  const placeId = place.id

  if (!placeId || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return {
    placeId,
    name: place.displayName?.text,
    address,
    lat: lat as number,
    lng: lng as number,
    neighborhood: extractLocalityFromGoogle(place.addressComponents, address),
  }
}

export function extractLocalityFromGoogle(
  components: GoogleAddressComponent[] = [],
  fallbackText = ""
): string | undefined {
  const joinedText = [
    fallbackText,
    ...components.flatMap((component) => [component.longText, component.shortText]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  for (const locality of LOCALITIES) {
    if (joinedText.includes(locality.toLowerCase())) return locality
  }

  const priorityTypes = [
    "neighborhood",
    "sublocality",
    "sublocality_level_1",
    "locality",
    "administrative_area_level_2",
    "administrative_area_level_1",
  ]

  for (const type of priorityTypes) {
    const component = components.find((item) => item.types?.includes(type))
    const text = component?.longText?.trim()
    if (text) return text
  }

  return undefined
}
