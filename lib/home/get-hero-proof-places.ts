import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { getPlacePath } from "@/lib/place-url"
import {
  resolvePrimarySafety,
  type PlaceWithStats,
} from "@/components/featured/featured-utils"

export type HeroProofPlace = {
  id: string
  href: string
  name: string
  location: string
  rating: number | null
  safety: "dedicated_gf" | "gf_options" | "unknown"
}

function toRating(place: {
  googleSnapshot?: { rating?: number } | null
}): number | null {
  const rating = place.googleSnapshot?.rating
  if (typeof rating === "number" && Number.isFinite(rating) && rating > 0) {
    return Math.round(rating * 10) / 10
  }
  return null
}

function mapHeroSafety(
  safety: ReturnType<typeof resolvePrimarySafety>
): HeroProofPlace["safety"] {
  if (safety === "dedicated_gf" || safety === "gf_options") return safety
  return "unknown"
}

function toLocation(place: { neighborhood?: string; locality?: string }): string {
  const neighborhood = place.neighborhood?.trim()
  if (neighborhood) return neighborhood
  const locality = place.locality?.trim()
  if (locality) return locality
  return "Argentina"
}

function mapPlace(place: {
  _id: { toString(): string }
  slug?: string | null
  name: string
  neighborhood?: string
  locality?: string
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
  googleSnapshot?: { rating?: number } | null
}): HeroProofPlace {
  return {
    id: place._id.toString(),
    href: getPlacePath(place),
    name: place.name,
    location: toLocation(place),
    rating: toRating(place),
    safety: mapHeroSafety(resolvePrimarySafety(place)),
  }
}

/** 3 lugares reales para prueba social del hero. Best-effort: [] si Mongo falla. */
export async function getHeroProofPlaces(): Promise<HeroProofPlace[]> {
  try {
    await connectDB()
    const docs = await Place.find({ status: "approved" })
      .select(
        "name slug neighborhood locality safetyLevel tags featured featuredOrder googleSnapshot.rating googleSnapshot.userRatingCount"
      )
      .sort({ featured: -1, featuredOrder: 1, "googleSnapshot.userRatingCount": -1 })
      .limit(12)
      .lean()

    const mapped = (docs as Parameters<typeof mapPlace>[0][]).map(mapPlace)
    const withRating = mapped.filter((place) => place.rating != null)
    const chosen = (withRating.length >= 3 ? withRating : mapped).slice(0, 3)
    return chosen
  } catch (error) {
    console.error("[home] getHeroProofPlaces failed:", error)
    return []
  }
}
