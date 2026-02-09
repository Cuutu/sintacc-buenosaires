import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "pending"
    
    const suggestions = await Suggestion.find({ status })
      .populate("suggestedByUserId", "name email")
      .sort({ createdAt: -1 })
      .lean()
    
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Error fetching suggestions:", error)
    return NextResponse.json(
      { error: "Error al obtener sugerencias" },
      { status: 500 }
    )
  }
}
