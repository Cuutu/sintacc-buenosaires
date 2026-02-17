import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") // "visible" | "hidden" | omit for all
    const search = searchParams.get("search")?.trim()
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {}
    if (status === "visible" || status === "hidden") {
      query.status = status
    }
    if (search && search.length >= 2) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      const matchingPlaceIds = await Place.find({
        $or: [{ name: regex }, { address: regex }, { neighborhood: regex }],
      }).distinct("_id")
      query.$or = [
        { comment: regex },
        { placeId: { $in: matchingPlaceIds } },
      ]
    }

    const reviews = await Review.find(query)
      .populate("userId", "name image email")
      .populate("placeId", "name address neighborhood type")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Review.countDocuments(query)

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logApiError("/api/admin/reviews", error, { request })
    return NextResponse.json(
      { error: "Error al obtener reseñas" },
      { status: 500 }
    )
  }
}
