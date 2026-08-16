import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import type { PlaceWithStats } from "@/components/featured/featured-utils"

function serialize(doc: {
  _id: { toString(): string }
  slug?: string | null
  name: string
  type?: string
  neighborhood?: string
  locality?: string
  photos?: string[]
  tags?: string[]
  safetyLevel?: PlaceWithStats["safetyLevel"]
  googlePlaceId?: string | null
  googleSnapshot?: { rating?: number; userRatingCount?: number } | null
}): PlaceWithStats {
  const neighborhood = doc.neighborhood?.trim() || doc.locality?.trim() || "Argentina"
  return {
    _id: doc._id.toString() as unknown as PlaceWithStats["_id"],
    slug: doc.slug ?? null,
    name: doc.name,
    type: doc.type || "restaurant",
    neighborhood,
    photos: doc.photos ?? [],
    tags: doc.tags ?? [],
    safetyLevel: doc.safetyLevel,
    googlePlaceId: doc.googlePlaceId ?? null,
    googleSnapshot: doc.googleSnapshot
      ? {
          rating: doc.googleSnapshot.rating,
          userRatingCount: doc.googleSnapshot.userRatingCount,
        }
      : null,
    stats: { avgRating: 0, totalReviews: 0, contaminationReportsCount: 0 },
  }
}

/** Hasta 3 lugares reales para el carrusel de home. [] si Mongo falla. */
export async function getHomeFeaturedPlaces(): Promise<PlaceWithStats[]> {
  try {
    await connectDB()
    const docs = await Place.find({ status: "approved" })
      .select(
        "name slug neighborhood locality type photos tags safetyLevel googlePlaceId featured featuredOrder googleSnapshot.rating googleSnapshot.userRatingCount"
      )
      .sort({ featured: -1, featuredOrder: 1, "googleSnapshot.userRatingCount": -1 })
      .limit(8)
      .lean()

    return (docs as Parameters<typeof serialize>[0][]).slice(0, 3).map(serialize)
  } catch (error) {
    console.error("[home] getHomeFeaturedPlaces failed:", error)
    return []
  }
}
