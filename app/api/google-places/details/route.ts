import { NextRequest, NextResponse } from "next/server"
import {
  getGoogleMapsApiKey,
  normalizeGooglePlaceDetails,
} from "@/lib/google-places"

const GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1/places"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) {
    return NextResponse.json({ place: null, configured: false }, { status: 200 })
  }

  const placeId = request.nextUrl.searchParams.get("placeId")?.trim()
  if (!placeId) {
    return NextResponse.json(
      { error: "placeId requerido" },
      { status: 400 }
    )
  }

  const params = new URLSearchParams({
    languageCode: "es-419",
  })
  const sessionToken = request.nextUrl.searchParams.get("sessionToken")
  if (sessionToken) params.set("sessionToken", sessionToken)

  try {
    const response = await fetch(
      `${GOOGLE_PLACES_BASE_URL}/${encodeURIComponent(placeId)}?${params}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,addressComponents",
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({ place: null, configured: true }, { status: 200 })
    }

    const data = await response.json()
    return NextResponse.json({
      place: normalizeGooglePlaceDetails(data),
      configured: true,
    })
  } catch {
    return NextResponse.json({ place: null, configured: true }, { status: 200 })
  }
}
