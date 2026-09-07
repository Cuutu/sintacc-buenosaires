import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { ProductEvent } from "@/models/ProductEvent"
import { checkRateLimitByIp } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import {
  ANALYTICS_INGEST_MAX_BYTES,
  detectDeviceFromUa,
  geoFromRequest,
  isAnalyticsIngestContentType,
  parseAnalyticsIngestBody,
} from "@/lib/analytics-ingest"

export const dynamic = "force-dynamic"

function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || ""
  const host = request.headers.get("host") || ""
  const candidates = [origin, host].filter(Boolean)
  if (candidates.length === 0) return true
  return candidates.some((c) => {
    const v = c.toLowerCase()
    return (
      v.includes("celimap.com.ar") ||
      v.includes("localhost") ||
      v.includes("127.0.0.1") ||
      v.includes("vercel.app") ||
      v.includes("sintacc")
    )
  })
}

export async function POST(request: NextRequest) {
  try {
    if (!originAllowed(request)) {
      return new NextResponse(null, { status: 204 })
    }

    const contentType = request.headers.get("content-type") || ""
    if (!isAnalyticsIngestContentType(contentType)) {
      return new NextResponse(null, { status: 204 })
    }

    const contentLength = Number(request.headers.get("content-length") || "0")
    if (contentLength > ANALYTICS_INGEST_MAX_BYTES) {
      return new NextResponse(null, { status: 204 })
    }

    try {
      const rl = await Promise.race([
        checkRateLimitByIp(request, "analytics_event", 120, 15),
        new Promise<{ allowed: boolean }>((resolve) =>
          setTimeout(() => resolve({ allowed: true }), 600)
        ),
      ])
      if (!rl.allowed) return new NextResponse(null, { status: 204 })
    } catch {
      /* seguir: mejor un evento de más que tumbar ingest */
    }

    const text = await request.text()
    if (text.length > ANALYTICS_INGEST_MAX_BYTES) {
      return new NextResponse(null, { status: 204 })
    }

    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return new NextResponse(null, { status: 204 })
    }

    const parsed = parseAnalyticsIngestBody(body)
    if ("error" in parsed) {
      return new NextResponse(null, { status: 204 })
    }

    const geo = geoFromRequest(request)
    const device = detectDeviceFromUa(request.headers.get("user-agent") || "")
    const docs = parsed.events.map((event) => ({
      ...event,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      device,
    }))

    try {
      await connectDB()
      await ProductEvent.insertMany(docs, { ordered: false })
    } catch (error) {
      logApiError("/api/analytics/events", error, { request })
    }
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logApiError("/api/analytics/events", error, { request })
    return new NextResponse(null, { status: 204 })
  }
}

export async function GET() {
  return NextResponse.json({ error: "method" }, { status: 405 })
}
