import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { checkRateLimitByIp } from "@/lib/rate-limit"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { User } from "@/models/User"
import { aggregateReviewCounts } from "@/lib/stats/aggregate-reviews"

export const dynamic = "force-dynamic"

/** Stats: 120 req / 15 min por IP (público, sin auth) */
const STATS_IP_LIMIT = 120
const STATS_WINDOW_MINUTES = 15
const STATS_CACHE_TTL_MS = 60 * 1000

export type PublicStatsPayload = {
  placesCount: number
  usersCount: number
  /** Total = CeliMap visibles + suma Google userRatingCount (approved) */
  reviewsCount: number
  reviewsCountCelimap: number
  reviewsCountGoogle: number
}

let statsCache: {
  data: PublicStatsPayload
  expiresAt: number
} | null = null

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

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimitByIp(
      request,
      "stats",
      STATS_IP_LIMIT,
      STATS_WINDOW_MINUTES
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Volvé a intentar en unos minutos." },
        { status: 429 }
      )
    }

    const now = Date.now()
    // En tests evitamos cache in-memory entre casos.
    const cacheEnabled = process.env.NODE_ENV !== "test"
    if (cacheEnabled && statsCache && statsCache.expiresAt > now) {
      return NextResponse.json(statsCache.data, {
        headers: { "Cache-Control": "private, max-age=60" },
      })
    }

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

    const data: PublicStatsPayload = {
      placesCount,
      usersCount,
      reviewsCount: aggregated.total,
      reviewsCountCelimap: aggregated.celimap,
      reviewsCountGoogle: aggregated.google,
    }
    if (cacheEnabled) {
      statsCache = { data, expiresAt: now + STATS_CACHE_TTL_MS }
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (error) {
    const { logApiError } = await import("@/lib/logger")
    logApiError("/api/stats", error, { request })
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
}
