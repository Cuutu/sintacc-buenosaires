import connectDB from "@/lib/mongodb"
import { getOrSetApiCache } from "@/lib/api-cache"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"

/**
 * Promedio, cantidad de reseñas y de reportes visibles de TODOS los lugares, en
 * una sola entrada de caché de 15 min. El mapa (/api/places) y las landings lo
 * consultan en memoria en vez de hacer dos aggregate por cada pedido.
 *
 * Se invalida al publicar o moderar reseñas y reportes
 * (invalidateApiCache([REVIEW_STATS_CACHE_KEY])). La ficha usa getPlaceLiveStats,
 * que es exacto y además cuenta safeFeeling.
 */
export const REVIEW_STATS_CACHE_KEY = "public:review-stats"
const TTL_MS = 15 * 60 * 1000

export type PlaceReviewStats = { avgRating: number; totalReviews: number; contaminationReportsCount: number }

/** placeId → [promedio sin redondear, reseñas, reportes]. Plano para que entre en la caché como JSON. */
type StatsIndex = Record<string, [number, number, number]>

async function loadIndex(): Promise<StatsIndex> {
  await connectDB()
  const [reviews, reports] = await Promise.all([
    Review.aggregate<{ _id: unknown; avg: number; n: number }>([
      { $match: { status: "visible" } },
      { $group: { _id: "$placeId", avg: { $avg: "$rating" }, n: { $sum: 1 } } },
    ]),
    ContaminationReport.aggregate<{ _id: unknown; n: number }>([
      { $match: { status: "visible" } },
      { $group: { _id: "$placeId", n: { $sum: 1 } } },
    ]),
  ])
  const index: StatsIndex = {}
  for (const r of reviews) index[String(r._id)] = [r.avg ?? 0, r.n, 0]
  for (const c of reports) {
    const key = String(c._id)
    index[key] = index[key] ? [index[key][0], index[key][1], c.n] : [0, 0, c.n]
  }
  return index
}

async function loadCachedIndex(): Promise<StatsIndex> {
  try {
    return await getOrSetApiCache(REVIEW_STATS_CACHE_KEY, TTL_MS, loadIndex)
  } catch (error) {
    // Fuera de Next (scripts, tests) unstable_cache no tiene dónde guardar.
    if (error instanceof Error && error.message.includes("incrementalCache missing")) return loadIndex()
    throw error
  }
}

export const EMPTY_PLACE_REVIEW_STATS: PlaceReviewStats = {
  avgRating: 0,
  totalReviews: 0,
  contaminationReportsCount: 0,
}

/** Stats de varios lugares (siempre devuelve una entrada por id, en 0 si no tiene). */
export async function getReviewStatsFor(placeIds: { toString(): string }[]): Promise<Map<string, PlaceReviewStats>> {
  const index = placeIds.length > 0 ? await loadCachedIndex() : {}
  const out = new Map<string, PlaceReviewStats>()
  for (const id of placeIds) {
    const key = id.toString()
    const row = index[key]
    out.set(
      key,
      row
        ? { avgRating: Math.round(row[0] * 10) / 10, totalReviews: row[1], contaminationReportsCount: row[2] }
        : { ...EMPTY_PLACE_REVIEW_STATS }
    )
  }
  return out
}

/**
 * Ids de los lugares con más reseñas visibles (al menos `min`), de mayor a menor. Para
 * sumar a los destacados de la home lugares con respaldo de la comunidad aunque tengan
 * pocas reseñas en Google.
 */
export async function getMostReviewedPlaceIds(min: number, limit: number): Promise<string[]> {
  const index = await loadCachedIndex()
  return Object.entries(index)
    .filter(([, row]) => row[1] >= min)
    .sort((a, b) => b[1][1] - a[1][1])
    .slice(0, limit)
    .map(([id]) => id)
}
