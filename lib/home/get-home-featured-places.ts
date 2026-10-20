import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { inferSafetyLevel, type PlaceWithStats } from "@/components/featured/featured-utils"
import { DISPLAY_DEDICATED_MATCH } from "@/lib/safety-match"
import { getReviewStatsFor } from "@/lib/review-stats-index"

const SHOW = 6
/** Se piden más para poder priorizar los que tienen foto. */
const CANDIDATES = 18

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

/**
 * Hasta 6 lugares para el carrusel de home. Solo 100% sin TACC: al lado de "con
 * confianza" no se recomiendan lugares con opciones (decisión de Cutu, 20/10). Primero
 * los destacados por el admin, en su orden; después los que tienen foto. [] si Mongo falla.
 */
export async function getHomeFeaturedPlaces(): Promise<PlaceWithStats[]> {
  try {
    await connectDB()
    const docs = (await Place.find({ status: "approved", ...DISPLAY_DEDICATED_MATCH })
      .select(
        "name slug neighborhood locality type photos tags safetyLevel googlePlaceId featured featuredOrder googleSnapshot.rating googleSnapshot.userRatingCount"
      )
      .sort({ featured: -1, featuredOrder: 1, "googleSnapshot.userRatingCount": -1 })
      .limit(CANDIDATES)
      .lean()) as (Parameters<typeof serialize>[0] & { featured?: boolean })[]

    const picked = docs
      .filter((doc) => isHomeFeaturable(doc))
      .map((doc, index) => ({ doc, index }))
      .sort((a, b) => featuredRank(a.doc) - featuredRank(b.doc) || a.index - b.index)
      .slice(0, SHOW)
      .map(({ doc }) => doc)

    const stats = await getReviewStatsFor(picked.map((doc) => doc._id))
    return picked.map((doc) => ({
      ...serialize(doc),
      stats: stats.get(doc._id.toString()) ?? serialize(doc).stats,
    }))
  } catch (error) {
    console.error("[home] getHomeFeaturedPlaces failed:", error)
    return []
  }
}

/** Lo mismo que muestra la tarjeta: tags primero (opciones gana sobre 100%). */
export function isHomeFeaturable(place: {
  tags?: string[]
  safetyLevel?: PlaceWithStats["safetyLevel"] | null
}): boolean {
  return inferSafetyLevel(place) === "dedicated_gf"
}

/** 0: destacado por el admin · 1: con foto · 2: sin foto. */
function featuredRank(doc: { featured?: boolean; photos?: string[] }): number {
  if (doc.featured) return 0
  return doc.photos?.length ? 1 : 2
}
