import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { inferSafetyLevel, type PlaceWithStats } from "@/components/featured/featured-utils"
import { DISPLAY_DEDICATED_MATCH } from "@/lib/safety-match"
import { getMostReviewedPlaceIds, getReviewStatsFor } from "@/lib/review-stats-index"
import { getOrSetApiCache } from "@/lib/api-cache"
import { uniqueByBrand } from "@/lib/place-brand"
import { FEATURED_TRUST, rankFeaturedCandidates, type FeaturedCandidate } from "@/lib/home/featured-trust"

const SHOW = 6
/** Los más reseñados en Google (y los elegidos en el admin): de acá sale casi todo. */
const GOOGLE_POOL = 60
/** Los más reseñados en CeliMap, aunque tengan pocas reseñas en Google. */
const CELIMAP_POOL = 40
const TTL_MS = 15 * 60 * 1000

const SELECT =
  "name slug neighborhood locality type photos tags safetyLevel googlePlaceId featured featuredOrder googleSnapshot.rating googleSnapshot.userRatingCount"

type PlaceDoc = {
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
  featured?: boolean
  featuredOrder?: number | null
}

function serialize(doc: PlaceDoc): FeaturedCandidate {
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
    featured: Boolean(doc.featured),
    featuredOrder: doc.featuredOrder ?? null,
  }
}

async function loadHomeFeaturedPlaces(): Promise<PlaceWithStats[]> {
  await connectDB()
  const reviewedIds = (await getMostReviewedPlaceIds(FEATURED_TRUST.minCelimapReviews, CELIMAP_POOL)).filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  )
  const base = { status: "approved", ...DISPLAY_DEDICATED_MATCH }
  const [byGoogle, byCelimap] = (await Promise.all([
    Place.find(base)
      .select(SELECT)
      .sort({ featured: -1, featuredOrder: 1, "googleSnapshot.userRatingCount": -1 })
      .limit(GOOGLE_POOL)
      .lean(),
    reviewedIds.length
      ? Place.find({ ...base, _id: { $in: reviewedIds } }).select(SELECT).lean()
      : Promise.resolve([]),
  ])) as [PlaceDoc[], PlaceDoc[]]

  const seen = new Set<string>()
  const pool = [...byGoogle, ...byCelimap]
    .filter((doc) => {
      const id = doc._id.toString()
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map(serialize)

  const stats = await getReviewStatsFor(pool.map((place) => place._id))
  const withStats = pool.map((place) => ({ ...place, stats: stats.get(place._id.toString()) ?? place.stats }))

  // Una sucursal por marca: dos Churros El Topo seguidos parecían un error.
  return uniqueByBrand(rankFeaturedCandidates(withStats))
    .slice(0, SHOW)
    .map(({ featured: _featured, featuredOrder: _order, ...place }) => place)
}

/**
 * Hasta 6 lugares para el carrusel de home. Solo 100% sin TACC: al lado de "con
 * confianza" no se recomiendan lugares con opciones (decisión de Cutu, 20/10). Van
 * primero los que tienen respaldo (3+ reseñas en CeliMap o 50+ en Google, puntaje 4 o
 * más); nunca los que tienen reportes de contaminación. Ver lib/home/featured-trust.ts.
 * Una sola sucursal por marca. Caché de 15 min (se invalida al editar lugares). [] si
 * Mongo falla.
 */
export async function getHomeFeaturedPlaces(): Promise<PlaceWithStats[]> {
  try {
    return await getOrSetApiCache("public:places:home-featured", TTL_MS, loadHomeFeaturedPlaces)
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
