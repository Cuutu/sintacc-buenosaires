import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { logApiError } from "@/lib/logger"
import { features } from "@/lib/features"
import { toPublicPlaceListItem } from "@/lib/places-public-select"
import { enforcePublicReadRateLimit } from "@/lib/public-read-limit"

const NEAR_MAX_RESULTS = 50
const emptyStats = {
  avgRating: 0,
  totalReviews: 0,
  contaminationReportsCount: 0,
}

export async function GET(request: NextRequest) {
  if (!features.nearMe) {
    return NextResponse.json(
      { error: "Feature no disponible en esta fase" },
      { status: 403 }
    )
  }
  
  try {
    const limited = await enforcePublicReadRateLimit(request, "list")
    if (limited) return limited

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
    
    const rawPlaces = await Place.aggregate([
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
        $limit: NEAR_MAX_RESULTS,
      },
      {
        $project: {
          name: 1,
          type: 1,
          types: 1,
          address: 1,
          neighborhood: 1,
          province: 1,
          locality: 1,
          slug: 1,
          location: 1,
          addressText: 1,
          tags: 1,
          photos: { $slice: ["$photos", 1] },
          photoSource: 1,
          status: 1,
          safetyLevel: 1,
          featured: 1,
          googlePlaceId: 1,
          openingHours: 1,
          "googleSnapshot.rating": 1,
          "googleSnapshot.userRatingCount": 1,
          createdAt: 1,
          distance: 1,
        },
      },
    ])

    const places = rawPlaces.map((p) => ({
      ...toPublicPlaceListItem(p, emptyStats),
      distance: p.distance,
    }))
    
    return NextResponse.json({ places })
  } catch (error) {
    logApiError("/api/places/near", error, { request })
    return NextResponse.json(
      { error: "Error al obtener lugares cercanos" },
      { status: 500 }
    )
  }
}
