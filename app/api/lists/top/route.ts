import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import { logApiError } from "@/lib/logger"

/** GET: Top listas públicas por likes (sin auth) */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "6", 10),
      20
    )

    const lists = await List.find({ isPublic: true })
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit)
      .populate("createdBy", "name image")
      .populate({
        path: "placeIds",
        select: "name neighborhood photos type",
        options: { limit: 4 },
      })
      .lean()

    return NextResponse.json({ lists })
  } catch (error) {
    logApiError("/api/lists/top GET", error, { request })
    return NextResponse.json(
      { error: "Error al obtener listas destacadas" },
      { status: 500 }
    )
  }
}
