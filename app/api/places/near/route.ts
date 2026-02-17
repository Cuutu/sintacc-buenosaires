import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { logApiError } from "@/lib/logger"
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
    const radiusRaw = parseFloat(searchParams.get("radius") || "5000")
    const radius = Math.min(50000, Math.max(100, isNaN(radiusRaw) ? 5000 : radiusRaw)) // 100m a 50km
    
    if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "lat y lng son requeridos y deben ser coordenadas válidas (-90 a 90, -180 a 180)" },
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
    logApiError("/api/places/near", error, { request })
    return NextResponse.json(
      { error: "Error al obtener lugares cercanos" },
      { status: 500 }
    )
  }
}
