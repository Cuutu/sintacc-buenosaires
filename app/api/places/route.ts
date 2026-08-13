import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"
import { requireAdmin } from "@/lib/middleware"
import { placeSchema, parsePublicPlacesSearchParams } from "@/lib/validations"
import { buildPublicPlacesMongoQuery, filterPlacesByBbox } from "@/lib/places-public-query"
import { PUBLIC_PLACE_SELECT } from "@/lib/places-public-select"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { getOrSetApiCache, invalidateApiCache } from "@/lib/api-cache"
import { generateUniquePlaceSlug } from "@/lib/place-slugs"

// Lugares casi estáticos: TTL largo. Escrituras invalidan tag `public:places`.
const PUBLIC_PLACES_CACHE_TTL_MS = 15 * 60 * 1000
/** Listados grandes (mapa): no agregar reviews/contaminación — 2 aggregations × miles de IDs. */
const SKIP_STATS_LIMIT = 100

function publicPlacesCacheKey(parsed: ReturnType<typeof parsePublicPlacesSearchParams>): string {
  const { bbox: _bbox, ...rest } = parsed
  return `public:places:${JSON.stringify(rest)}`
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let parsed
    try {
      parsed = parsePublicPlacesSearchParams(searchParams)
    } catch (error: unknown) {
      if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
        return NextResponse.json(
          { error: "Parámetros de búsqueda inválidos" },
          { status: 400 }
        )
      }
      throw error
    }
    const { page, limit, bbox } = parsed
    const skip = (page - 1) * limit
    // bbox NO va a Mongo ni a la cache key: cada pan del mapa era un miss + 17s.
    const query = buildPublicPlacesMongoQuery(parsed)

    const cacheKey = publicPlacesCacheKey(parsed)
    const data = await getOrSetApiCache(cacheKey, PUBLIC_PLACES_CACHE_TTL_MS, async () => {
      await connectDB()

      const sort: Record<string, 1 | -1> =
        parsed.featured === true
          ? { featuredOrder: 1, createdAt: -1 }
          : { createdAt: -1 }

      const places = await Place.find(query)
        .select(PUBLIC_PLACE_SELECT)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()

      const total =
        page === 1 && places.length < limit
          ? places.length
          : await Place.countDocuments(query)

      const includeStats = limit < SKIP_STATS_LIMIT
      const placeIds = includeStats ? places.map((p: any) => p._id) : []
      let reviewStats: any[] = []
      let contaminationCounts: any[] = []
      if (placeIds.length > 0) {
        ;[reviewStats, contaminationCounts] = await Promise.all([
          Review.aggregate([
            { $match: { placeId: { $in: placeIds }, status: "visible" } },
            { $group: { _id: "$placeId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
          ]),
          ContaminationReport.aggregate([
            { $match: { placeId: { $in: placeIds }, status: "visible" } },
            { $group: { _id: "$placeId", count: { $sum: 1 } } },
          ]),
        ])
      }

      const statsMap = new Map<string, { avgRating: number; totalReviews: number; contaminationReportsCount: number }>()
      if (includeStats) {
        placeIds.forEach((id: any) => {
          statsMap.set(id.toString(), { avgRating: 0, totalReviews: 0, contaminationReportsCount: 0 })
        })
        reviewStats.forEach((s: any) => {
          const entry = statsMap.get(s._id.toString())!
          entry.avgRating = Math.round(s.avgRating * 10) / 10
          entry.totalReviews = s.count
        })
        contaminationCounts.forEach((c: any) => {
          const entry = statsMap.get(c._id.toString())
          if (entry) entry.contaminationReportsCount = c.count
        })
      }

      const placesWithStats = places.map((p: any) => ({
        ...p,
        stats: includeStats
          ? statsMap.get(p._id.toString()) || {
              avgRating: 0,
              totalReviews: 0,
              contaminationReportsCount: 0,
            }
          : {
              avgRating: 0,
              totalReviews: 0,
              contaminationReportsCount: 0,
            },
      }))

      return {
        places: placesWithStats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 0,
        },
      }
    })

    const places = bbox ? filterPlacesByBbox(data.places, bbox) : data.places

    return NextResponse.json(
      {
        ...data,
        places,
        pagination: bbox
          ? { ...data.pagination, total: places.length, pages: 1 }
          : data.pagination,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    logApiError("/api/places", error, { request })
    return NextResponse.json(
      { error: "Error al obtener lugares" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    
    await connectDB()
    
    const body = await request.json()
    const validated = placeSchema.parse(body)
    
    const place = new Place({
      ...validated,
      slug: await generateUniquePlaceSlug(validated.name, validated.neighborhood),
      status: "approved",
    })
    
    await place.save()
    invalidateApiCache(["public:places:", "admin:places:", "admin:counts", "seo:province:"])
    
    return NextResponse.json(place, { status: 201 })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    logApiError("/api/places", error, { request })
    return NextResponse.json(
      { error: "Error al crear lugar" },
      { status: 500 }
    )
  }
}
