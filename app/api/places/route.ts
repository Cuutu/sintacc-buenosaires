import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"
import { requireAdmin } from "@/lib/middleware"
import { placeSchema, parsePublicPlacesSearchParams } from "@/lib/validations"
import { buildPublicPlacesMongoQuery } from "@/lib/places-public-query"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { getOrSetApiCache, invalidateApiCache } from "@/lib/api-cache"

const PUBLIC_PLACES_CACHE_TTL_MS = 60 * 1000

export async function GET(request: NextRequest) {
  try {
    await connectDB()

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
    const { page, limit } = parsed
    const skip = (page - 1) * limit
    const query = buildPublicPlacesMongoQuery(parsed)

    const cacheKey = `public:places:${searchParams.toString()}`
    const data = await getOrSetApiCache(cacheKey, PUBLIC_PLACES_CACHE_TTL_MS, async () => {
      const places = await Place.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
      
      const total = await Place.countDocuments(query)
      
      const placeIds = places.map((p: any) => p._id)
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

      const placesWithStats = places.map((p: any) => ({
        ...p,
        stats: statsMap.get(p._id.toString()) || {
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
          pages: Math.ceil(total / limit),
        },
      }
    })

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    })
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
      status: "approved",
    })
    
    await place.save()
    invalidateApiCache(["public:places:", "admin:places:", "admin:counts"])
    
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
