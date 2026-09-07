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

function compareName(a: IPlace, b: IPlace): number {
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" })
}

export function listHasRatings(places: PlaceWithListStats[]): boolean {
  return places.some((place) => getRating(place) > 0)
}

export function sortPlaces<T extends PlaceWithListStats>(
  places: T[],
  sort: PlaceSortOption,
  userLocation: UserLatLng | null
): T[] {
  const list = [...places]

  if (sort === "nearest" && userLocation) {
    return list.sort((a, b) => {
      const aLat = a.location?.lat
      const aLng = a.location?.lng
      const bLat = b.location?.lat
      const bLng = b.location?.lng
      const da =
        Number.isFinite(aLat) && Number.isFinite(aLng)
          ? metersBetween(userLocation, { lat: aLat as number, lng: aLng as number })
          : Number.POSITIVE_INFINITY
      const db =
        Number.isFinite(bLat) && Number.isFinite(bLng)
          ? metersBetween(userLocation, { lat: bLat as number, lng: bLng as number })
          : Number.POSITIVE_INFINITY
      if (da !== db) return da - db
      return compareName(a, b)
    })
  }

  if (sort === "rating") {
    return list.sort((a, b) => {
      const reviewDelta = Math.sign(getReviewCount(b)) - Math.sign(getReviewCount(a))
      if (reviewDelta !== 0) return reviewDelta
      const ratingDelta = getRating(b) - getRating(a)
      if (ratingDelta !== 0) return ratingDelta
      const countDelta = getReviewCount(b) - getReviewCount(a)
      if (countDelta !== 0) return countDelta
      const safetyDelta = getSafetyRank(b) - getSafetyRank(a)
      if (safetyDelta !== 0) return safetyDelta
      return compareName(a, b)
    })
  }

  return list.sort((a, b) => {
    const safetyDelta = getSafetyRank(b) - getSafetyRank(a)
    if (safetyDelta !== 0) return safetyDelta
    const reviewPresenceDelta = Math.sign(getReviewCount(b)) - Math.sign(getReviewCount(a))
    if (reviewPresenceDelta !== 0) return reviewPresenceDelta
    return compareName(a, b)
  })
}
