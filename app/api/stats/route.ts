import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"

export const dynamic = "force-dynamic"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { User } from "@/models/User"

export async function GET() {
  try {
    await connectDB()
    
    const [placesCount, reviewsCount, usersCount] = await Promise.all([
      Place.countDocuments({ status: "approved" }),
      Review.countDocuments({ status: "visible" }),
      User.countDocuments(),
    ])
    
    return NextResponse.json(
      { placesCount, reviewsCount, usersCount },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
}
