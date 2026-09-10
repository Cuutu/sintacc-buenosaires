import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { parseVenturesSearchParams } from "@/lib/validations"
import { buildVentureSearchFilter } from "@/lib/venture-search"
import { argentinaVentureMongoFilter } from "@/lib/venture-argentina"
import { dedicatedVentureMongoFilter } from "@/lib/venture-constants"
import { logApiError } from "@/lib/logger"
import { getOrSetApiCache } from "@/lib/api-cache"
import { getVentureReviewStatsMap } from "@/lib/venture-review-stats"
import {
  PUBLIC_VENTURE_LIST_SELECT,
  toPublicVentureListItem,
} from "@/lib/ventures-public-select"
import { enforcePublicReadRateLimit } from "@/lib/public-read-limit"
import mongoose from "mongoose"

const CACHE_TTL_MS = 15 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const limited = await enforcePublicReadRateLimit(request, "list")
    if (limited) return limited

    const searchParams = request.nextUrl.searchParams
    let parsed
    try {
      parsed = parseVenturesSearchParams(searchParams)
    } catch {
      return NextResponse.json(
        { error: "Parámetros de búsqueda inválidos" },
        { status: 400 }
      )
    }

    const { page, limit, category, search } = parsed
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {
      status: "approved",
      ...argentinaVentureMongoFilter(),
      ...dedicatedVentureMongoFilter(),
    }
    if (category) query.category = category
    const searchFilter = search ? buildVentureSearchFilter(search) : null
    if (searchFilter) {
      Object.assign(query, searchFilter)
    }

    const cacheKey = `public:ventures:${searchParams.toString()}`
    const data = await getOrSetApiCache(cacheKey, CACHE_TTL_MS, async () => {
      await connectDB()
      const ventures = await Venture.find(query)
        .select(PUBLIC_VENTURE_LIST_SELECT)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
      const total = await Venture.countDocuments(query)
      const ids = ventures.map((v) => v._id as mongoose.Types.ObjectId)
      const statsMap = await getVentureReviewStatsMap(ids)
      const emptyStats = { avgRating: 0, totalReviews: 0 }
      const venturesWithStats = ventures.map((v) =>
        toPublicVentureListItem(
          v,
          statsMap.get(v._id.toString()) ?? emptyStats
        )
      )
      return { ventures: venturesWithStats, total, page, pages: Math.ceil(total / limit) }
    })

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    logApiError("/api/ventures", error, { request })
    return NextResponse.json({ error: "Error al obtener emprendimientos" }, { status: 500 })
  }
}
