import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { checkRateLimitByIp } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { User } from "@/models/User"

/** Stats: 120 req / 15 min por IP (público, sin auth) */
const STATS_IP_LIMIT = 120
const STATS_WINDOW_MINUTES = 15
const STATS_CACHE_TTL_MS = 60 * 1000

let statsCache: {
  data: { placesCount: number; reviewsCount: number; usersCount: number }
  expiresAt: number
} | null = null

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
    if (statsCache && statsCache.expiresAt > now) {
      return NextResponse.json(statsCache.data, {
        headers: { "Cache-Control": "private, max-age=60" },
      })
    }

    await connectDB()

    const [placesCount, reviewsCount, usersCount] = await Promise.all([
      Place.countDocuments({ status: "approved" }),
      Review.countDocuments({ status: "visible" }),
      User.countDocuments(),
    ])

    const data = { placesCount, reviewsCount, usersCount }
    statsCache = { data, expiresAt: now + STATS_CACHE_TTL_MS }

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
