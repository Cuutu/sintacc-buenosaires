import { NextRequest, NextResponse } from "next/server"
import { resolveMapsUrlToLocation } from "@/lib/google-places-location"
import { normalizeGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim()
  if (!url || !normalizeGoogleMapsUrl(url)) {
    return NextResponse.json({ result: null, configured: true }, { status: 200 })
  }

  try {
    const result = await resolveMapsUrlToLocation(url)
    return NextResponse.json({ result, configured: true })
  } catch {
    return NextResponse.json({ result: null, configured: true }, { status: 200 })
  }
}
