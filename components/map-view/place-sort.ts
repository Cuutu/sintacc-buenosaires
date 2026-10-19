import type { IPlace } from "@/models/Place"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { metersBetween, type UserLatLng } from "./geo"
import type { LocationStatus } from "./useUserLocation"

export type PlaceSortOption = "nearest" | "recommended" | "rating"

export const MAP_SORT_STORAGE_KEY = "celimap_map_place_sort"
export const LOCATION_SORT_CTA = "Usar mi ubicación para ordenar por cercanía"
export const LOCATION_SORT_FAIL = "No pudimos usar tu ubicación"

export function parseStoredSort(raw: string | null | undefined): PlaceSortOption | null {
  if (raw === "nearest" || raw === "recommended" || raw === "rating") return raw
  return null
}

export function defaultSortForLocation(
  status: LocationStatus,
  stored: PlaceSortOption | null
): PlaceSortOption {
  if (stored) return stored
  return status === "granted" ? "nearest" : "recommended"
}

export function shouldFallbackNearestToRecommended(options: {
  sort: PlaceSortOption
  status: LocationStatus
  hasCoords: boolean
}): boolean {
  if (options.sort !== "nearest") return false
  if (options.hasCoords) return false
  return (
    options.status === "denied" ||
    options.status === "error" ||
    options.status === "unavailable"
  )
}

export function shouldAskLocationForNearest(options: {
  sort: PlaceSortOption
  hasCoords: boolean
}): boolean {
  return options.sort === "nearest" && !options.hasCoords
}

export function shouldShowLocationCta(options: {
  sort: PlaceSortOption
  status: LocationStatus
  hasCoords: boolean
}): boolean {
  if (options.hasCoords) return false
  if (options.status === "denied" || options.status === "unavailable" || options.status === "error") {
    return false
  }
  return options.sort === "recommended" || options.sort === "nearest"
}

export type PlaceWithListStats = IPlace & {
  stats?: {
    avgRating?: number
    totalReviews?: number
    contaminationReportsCount?: number
  }
  googleSnapshot?: { rating?: number; userRatingCount?: number } | null
  createdAt?: Date | string
}

export function getRating(place: PlaceWithListStats): number {
  if ((place.stats?.totalReviews ?? 0) > 0) return place.stats?.avgRating ?? 0
  return place.googleSnapshot?.rating ?? 0
}

export function getReviewCount(place: PlaceWithListStats): number {
  if ((place.stats?.totalReviews ?? 0) > 0) return place.stats?.totalReviews ?? 0
  return place.googleSnapshot?.userRatingCount ?? 0
}

export function getSafetyRank(place: IPlace): number {
  const level = inferSafetyLevel(place)
  if (level === "dedicated_gf") return 3
  if (level === "gf_options") return 2
  if (level === "unknown") return 1
  return 0
}

/** Un solo Collator: `localeCompare` con locale crea uno nuevo en cada comparación. */
const NAME_COLLATOR = new Intl.Collator("es", { sensitivity: "base" })

export function listHasRatings(places: PlaceWithListStats[]): boolean {
  return places.some((place) => getRating(place) > 0)
}

type SortKeys<T> = {
  place: T
  name: string
  distance: number
  safety: number
  rating: number
  reviews: number
}

/**
 * Mismo orden de siempre, pero cada dato (distancia, seguridad, rating) se calcula una
 * vez por lugar y no en cada comparación: con 600 lugares eran ~10.000 haversines y
 * otras tantas lecturas de tags por orden.
 */
export function sortPlaces<T extends PlaceWithListStats>(
  places: T[],
  sort: PlaceSortOption,
  userLocation: UserLatLng | null
): T[] {
  const byDistance = sort === "nearest" && userLocation != null
  const keys: SortKeys<T>[] = places.map((place) => {
    let distance = Number.POSITIVE_INFINITY
    if (byDistance) {
      const lat = place.location?.lat
      const lng = place.location?.lng
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        distance = metersBetween(userLocation, { lat: lat as number, lng: lng as number })
      }
    }
    return {
      place,
      name: place.name,
      distance,
      safety: byDistance ? 0 : getSafetyRank(place),
      rating: sort === "rating" ? getRating(place) : 0,
      reviews: byDistance ? 0 : getReviewCount(place),
    }
  })
  const byName = (a: SortKeys<T>, b: SortKeys<T>) => NAME_COLLATOR.compare(a.name, b.name)

  if (byDistance) {
    keys.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance
      return byName(a, b)
    })
  } else if (sort === "rating") {
    keys.sort((a, b) => {
      const reviewDelta = Math.sign(b.reviews) - Math.sign(a.reviews)
      if (reviewDelta !== 0) return reviewDelta
      const ratingDelta = b.rating - a.rating
      if (ratingDelta !== 0) return ratingDelta
      const countDelta = b.reviews - a.reviews
      if (countDelta !== 0) return countDelta
      const safetyDelta = b.safety - a.safety
      if (safetyDelta !== 0) return safetyDelta
      return byName(a, b)
    })
  } else {
    keys.sort((a, b) => {
      const safetyDelta = b.safety - a.safety
      if (safetyDelta !== 0) return safetyDelta
      const reviewPresenceDelta = Math.sign(b.reviews) - Math.sign(a.reviews)
      if (reviewPresenceDelta !== 0) return reviewPresenceDelta
      return byName(a, b)
    })
  }
  return keys.map((entry) => entry.place)
}
