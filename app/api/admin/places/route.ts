import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { getOrSetApiCache } from "@/lib/api-cache"
import { isPlaceInformationIncomplete } from "@/lib/place-incomplete"
import { placeCompleteness } from "@/lib/place-completeness"
import {
  MISSING_ANY_QUALITY,
  MISSING_COORDS,
  MISSING_DESCRIPTION,
  MISSING_HOURS,
  MISSING_INSTAGRAM,
  MISSING_PHONE,
  MISSING_PHOTO,
  MISSING_TACC,
  MISSING_WEB,
  parsePlaceMissing,
} from "@/lib/place-missing-query"

const ADMIN_PLACES_CACHE_TTL_MS = 45 * 1000

function pushAnd(query: Record<string, unknown>, clause: object) {
  const andClauses = (query.$and as object[]) || []
  andClauses.push(clause)
  query.$and = andClauses
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") // "approved" | "pending" | omit for all
    const search = searchParams.get("search")?.trim()
    const type = searchParams.get("type")
    const neighborhood = searchParams.get("neighborhood")
    const province = searchParams.get("province")
    const locality = searchParams.get("locality")
    const missingInfo = searchParams.get("missingInfo") === "1"
    const missingBadge = searchParams.get("missingBadge") === "1"
    const incompleteOnly = searchParams.get("incompleteOnly") === "1"
    const noPhoto = searchParams.get("noPhoto") === "1"
    const noHours = searchParams.get("noHours") === "1"
    const noCoords = searchParams.get("noCoords") === "1"
    const noPhone = searchParams.get("noPhone") === "1"
    const noWeb = searchParams.get("noWeb") === "1"
    const noDescription = searchParams.get("noDescription") === "1"
    const noTacc = searchParams.get("noTacc") === "1"
    const incompleteFicha = searchParams.get("incompleteFicha") === "1"
    const featuredOnly = searchParams.get("featured") === "1"
    const popularOnly = searchParams.get("popular") === "1"
    const missing = parsePlaceMissing(searchParams.get("missing"))
    const sort = searchParams.get("sort") || "recent"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit
    const needsMemorySort = sort === "completeness" || sort === "priority"

    const query: Record<string, unknown> = {}
    if (status === "approved" || status === "pending") {
      query.status = status
    }
    if (type) {
      query.type = type
    }
    if (neighborhood) {
      query.neighborhood = neighborhood
    }
    if (province) {
      query.province = province
    }
    if (locality) {
      query.locality = locality
    }
    if (featuredOnly) {
      query.featured = true
    }
    if (popularOnly) {
      query["googleSnapshot.userRatingCount"] = { $gte: 10 }
    }
    if (noPhoto || missing === "photo") pushAnd(query, MISSING_PHOTO)
    if (noHours || missing === "hours") pushAnd(query, MISSING_HOURS)
    if (noCoords || missing === "coords") pushAnd(query, MISSING_COORDS)
    if (missingInfo || missing === "instagram") pushAnd(query, MISSING_INSTAGRAM)
    if (noPhone || missing === "phone") pushAnd(query, MISSING_PHONE)
    if (noWeb || missing === "web") pushAnd(query, MISSING_WEB)
    if (noDescription || missing === "description") pushAnd(query, MISSING_DESCRIPTION)
    if (noTacc || missing === "incomplete") pushAnd(query, MISSING_TACC)
    if (incompleteFicha) pushAnd(query, MISSING_ANY_QUALITY)
    // Sin badge = excluir lugares que tienen safetyLevel o tags que infieren badge
    if (missingBadge) {
      const hasBadgeConditions = [
        { safetyLevel: { $in: ["dedicated_gf", "gf_options", "cross_contamination_risk"] } },
        { tags: "100_gf" },
        { tags: "certificado_sin_tacc" },
        { tags: "opciones_sin_tacc" },
      ]
      const andClauses = (query.$and as object[]) || []
      andClauses.push({ $nor: hasBadgeConditions })
      query.$and = andClauses
    }
    if (search && search.length >= 2) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      pushAnd(query, {
        $or: [
          { name: regex },
          { address: regex },
          { neighborhood: regex },
          { locality: regex },
          { province: regex },
        ],
      })
    }

    const cacheKey = `admin:places:${searchParams.toString()}`
    const data = await getOrSetApiCache(cacheKey, ADMIN_PLACES_CACHE_TTL_MS, async () => {
      const fetchLimit = incompleteOnly || needsMemorySort ? 500 : limit
      const fetchSkip = incompleteOnly || needsMemorySort ? 0 : skip
      const sortSpec: Record<string, 1 | -1> =
        sort === "oldest" ? { createdAt: 1 } : sort === "name" ? { name: 1 } : { createdAt: -1 }

      let places = await Place.find(query)
        .sort(sortSpec)
        .skip(fetchSkip)
        .limit(fetchLimit)
        .lean()

      if (incompleteOnly) {
        places = places.filter((place) => isPlaceInformationIncomplete(place))
      }
      if (needsMemorySort) {
        places = [...places].sort((a, b) => {
          const aPct = placeCompleteness(a)
          const bPct = placeCompleteness(b)
          if (sort === "priority") {
            const aBoost = Number(a.googleSnapshot?.userRatingCount || 0)
            const bBoost = Number(b.googleSnapshot?.userRatingCount || 0)
            return 100 - bPct + bBoost / 20 - (100 - aPct + aBoost / 20)
          }
          return aPct - bPct
        })
      }
      if (incompleteOnly || needsMemorySort) {
        const total = places.length
        places = places.slice(skip, skip + limit)
        const placeIds = places.map((p: { _id: unknown }) => p._id)
        let reviewStats: Array<{ _id: unknown; avgRating: number; count: number }> = []
        if (placeIds.length > 0) {
          reviewStats = await Review.aggregate([
            { $match: { placeId: { $in: placeIds }, status: "visible" } },
            { $group: { _id: "$placeId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
          ])
        }
        const statsMap = new Map(
          reviewStats.map((s) => [
            String(s._id),
            { avgRating: Math.round(s.avgRating * 10) / 10, totalReviews: s.count },
          ])
        )
        const placesWithStats = places.map((p: Record<string, unknown>) => ({
          ...p,
          stats: statsMap.get(String(p._id)) || { avgRating: 0, totalReviews: 0 },
        }))
        return {
          places: placesWithStats,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        }
      }

      const total = await Place.countDocuments(query)
      const placeIds = places.map((p: any) => p._id)
      let reviewStats: any[] = []
      if (placeIds.length > 0) {
        reviewStats = await Review.aggregate([
          { $match: { placeId: { $in: placeIds }, status: "visible" } },
          { $group: { _id: "$placeId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
        ])
      }
      const statsMap = new Map(
        reviewStats.map((s: any) => [
          s._id.toString(),
          { avgRating: Math.round(s.avgRating * 10) / 10, totalReviews: s.count },
        ])
      )

      const placesWithStats = places.map((p: any) => ({
        ...p,
        stats: statsMap.get(p._id.toString()) || { avgRating: 0, totalReviews: 0 },
      }))

      return {
        places: placesWithStats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }
    })

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=30" },
    })
  } catch (error) {
    logApiError("/api/admin/places", error, { request })
    return NextResponse.json(
      { error: "Error al obtener lugares" },
      { status: 500 }
    )
  }
}
