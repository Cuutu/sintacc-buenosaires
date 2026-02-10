import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { requireAdmin } from "@/lib/middleware"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") // "approved" | "pending" | omit for all
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {}
    if (status === "approved" || status === "pending") {
      query.status = status
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
    console.error("Error fetching admin places:", error)
    return NextResponse.json(
      { error: "Error al obtener lugares" },
      { status: 500 }
    )
  }
}
