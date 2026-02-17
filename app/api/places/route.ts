import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"
import { requireAdmin } from "@/lib/middleware"
import { placeSchema } from "@/lib/validations"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const type = searchParams.get("type")
    const neighborhood = searchParams.get("neighborhood")
    const tags = searchParams.get("tags")?.split(",").filter(Boolean)
    const safetyLevel = searchParams.get("safetyLevel")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit
    
    const query: any = { status: "approved" }
    
    // Búsqueda por nombre, dirección o barrio (cada palabra debe coincidir en algún campo)
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/).filter(Boolean)
      const regexes = words.map((w) => ({
        $or: [
          { name: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { address: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { neighborhood: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ],
      }))
      query.$and = regexes
    }
    
    if (type) {
      query.type = type
    }
    
    if (neighborhood) {
      query.neighborhood = neighborhood
    }
    
    if (tags && tags.length > 0) {
      query.tags = { $in: tags }
    }

    if (safetyLevel) {
      query.safetyLevel = safetyLevel
    }
    
    const places = await Place.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    
    const total = await Place.countDocuments(query)
    
    const placeIds = places.map((p: any) => p._id)
    const reviewStats = await Review.aggregate([
      { $match: { placeId: { $in: placeIds }, status: "visible" } },
      { $group: { _id: "$placeId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    const contaminationCounts = await ContaminationReport.aggregate([
      { $match: { placeId: { $in: placeIds }, status: "visible" } },
      { $group: { _id: "$placeId", count: { $sum: 1 } } },
    ])

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
    
    return NextResponse.json({
      places: placesWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
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
