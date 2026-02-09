import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { features } from "@/lib/features"

export async function GET(request: NextRequest) {
  if (!features.nearMe) {
    return NextResponse.json(
      { error: "Feature no disponible en esta fase" },
      { status: 403 }
    )
  }
  
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const lat = parseFloat(searchParams.get("lat") || "0")
    const lng = parseFloat(searchParams.get("lng") || "0")
    const radius = parseFloat(searchParams.get("radius") || "5000") // meters
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: "lat y lng son requeridos" },
        { status: 400 }
      )
    }
    
    const places = await Place.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: radius,
          spherical: true,
          query: { status: "approved" },
        },
      },
      {
        $limit: 50,
      },
    ])
    
    return NextResponse.json({ places })
  } catch (error) {
    console.error("Error fetching nearby places:", error)
    return NextResponse.json(
      { error: "Error al obtener lugares cercanos" },
      { status: 500 }
    )
  }
}
