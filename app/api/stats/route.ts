import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"

export async function GET() {
  try {
    await connectDB()
    
    const [placesCount, reviewsCount] = await Promise.all([
      Place.countDocuments({ status: "approved" }),
      Review.countDocuments({ status: "visible" }),
    ])
    
    return NextResponse.json({
      placesCount,
      reviewsCount,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
}
