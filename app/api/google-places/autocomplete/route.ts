import { NextRequest, NextResponse } from "next/server"
import {
  getGoogleMapsApiKey,
  normalizeGooglePredictions,
} from "@/lib/google-places"

const GOOGLE_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
const CABA_CENTER = { latitude: -34.6037, longitude: -58.3816 }

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) {
    return NextResponse.json(
      { predictions: [], configured: false },
      { status: 200 }
    )
  }

  const input = request.nextUrl.searchParams.get("input")?.trim()
  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [], configured: true })
  }

  const sessionToken = request.nextUrl.searchParams.get("sessionToken") || undefined

  try {
    const response = await fetch(GOOGLE_AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input,
        languageCode: "es-419",
        includedRegionCodes: ["ar"],
        sessionToken,
        locationBias: {
          circle: {
            center: CABA_CENTER,
            radius: 50000,
          },
        },
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { predictions: [], configured: true },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      predictions: normalizeGooglePredictions(data.suggestions),
      configured: true,
    })
  } catch {
    return NextResponse.json(
      { predictions: [], configured: true },
      { status: 200 }
    )
  }
}
