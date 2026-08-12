import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { User } from "@/models/User"
import { aggregateReviewCounts } from "@/lib/stats/aggregate-reviews"
import { getOrSetApiCache } from "@/lib/api-cache"

export type PublicStatsPayload = {
  placesCount: number
  usersCount: number
  /** Total = CeliMap visibles + suma Google userRatingCount (approved) */
  reviewsCount: number
  reviewsCountCelimap: number
  reviewsCountGoogle: number
}

const STATS_CACHE_TTL_MS = 60 * 1000

async function sumGoogleReviewCounts(): Promise<number> {
  const rows = await Place.aggregate<{ total: number }>([
    {
      $match: {
        status: "approved",
        "googleSnapshot.userRatingCount": { $type: "number", $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$googleSnapshot.userRatingCount" },
      },
    },
  ])
  const total = rows[0]?.total
  return typeof total === "number" && Number.isFinite(total) && total > 0
    ? Math.floor(total)
    : 0
}

async function loadPublicStatsFromDb(): Promise<PublicStatsPayload> {
  await connectDB()

  const [placesCount, reviewsCountCelimap, usersCount, reviewsCountGoogle] =
    await Promise.all([
      Place.countDocuments({ status: "approved" }),
      Review.countDocuments({ status: "visible" }),
      User.countDocuments(),
      sumGoogleReviewCounts(),
    ])

  const aggregated = aggregateReviewCounts({
    celimapCount: reviewsCountCelimap,
    googleCount: reviewsCountGoogle,
  })

  return {
    placesCount,
    usersCount,
    reviewsCount: aggregated.total,
    reviewsCountCelimap: aggregated.celimap,
    reviewsCountGoogle: aggregated.google,
  }
}

/** Stats públicos con cache corto (home SSR + /api/stats). */
export async function getPublicStats(): Promise<PublicStatsPayload> {
  return getOrSetApiCache("public:stats", STATS_CACHE_TTL_MS, loadPublicStatsFromDb)
}

/** Best-effort para no tumbar la home si Mongo falla. */
export async function getPublicStatsSafe(): Promise<PublicStatsPayload | null> {
  try {
    return await getPublicStats()
  } catch (error) {
    console.error("[stats] getPublicStatsSafe failed:", error)
    return null
  }
}
