import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { VentureReview } from "@/models/VentureReview"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
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
      const matchingIds = await Venture.find({
        $or: [{ name: regex }, { zone: regex }],
      }).distinct("_id")
      query.$or = [{ comment: regex }, { ventureId: { $in: matchingIds } }]
    }

    const [reviews, total] = await Promise.all([
      VentureReview.find(query)
        .populate("userId", "name image email")
        .populate("ventureId", "name category zone slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VentureReview.countDocuments(query),
    ])

    return NextResponse.json({
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    logApiError("/api/admin/venture-reviews", error, { request })
    return NextResponse.json({ error: "Error al obtener reseñas" }, { status: 500 })
  }
}
