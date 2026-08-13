import { NextRequest, NextResponse } from "next/server"
import {
  extractLocalityFromGoogle,
  getGoogleMapsApiKey,
} from "@/lib/google-places"
import { googleGeocodeQueryOptions } from "@/lib/geo-search-region"

const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"

export const dynamic = "force-dynamic"

interface GoogleGeocodeResult {
  formatted_address?: string
  geometry?: {
    location?: {
      lat?: number
      lng?: number
    }
  }
  address_components?: Array<{
    long_name?: string
    short_name?: string
    types?: string[]
  }>
}

export async function GET(request: NextRequest) {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) {
    return NextResponse.json({ result: null, configured: false }, { status: 200 })
  }

  const address = request.nextUrl.searchParams.get("address")?.trim()
  if (!address) {
    return NextResponse.json({ result: null, configured: true }, { status: 200 })
  }

  const geoOpts = googleGeocodeQueryOptions(address)
  const params = new URLSearchParams({
    address,
    language: "es",
    key: apiKey,
  })
  if (geoOpts.region) params.set("region", geoOpts.region)

  try {
    const response = await fetch(`${GOOGLE_GEOCODING_URL}?${params}`)
    if (!response.ok) {
      return NextResponse.json({ result: null, configured: true }, { status: 200 })
    }

    const data = await response.json()
    const firstResult: GoogleGeocodeResult | undefined = data.results?.[0]
    const lat = firstResult?.geometry?.location?.lat
    const lng = firstResult?.geometry?.location?.lng
    const formattedAddress = firstResult?.formatted_address

    if (!formattedAddress || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ result: null, configured: true }, { status: 200 })
    }

    const components =
      firstResult.address_components?.map((component) => ({
        longText: component.long_name,
        shortText: component.short_name,
        types: component.types,
      })) ?? []

    return NextResponse.json({
      result: {
        address: formattedAddress,
        lat,
        lng,
        neighborhood: extractLocalityFromGoogle(components, formattedAddress),
      },
      configured: true,
    })
  } catch {
    return NextResponse.json({ result: null, configured: true }, { status: 200 })
  }
}
