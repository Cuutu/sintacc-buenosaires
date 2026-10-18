import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { ProductEvent } from "@/models/ProductEvent"
import { getClientIp } from "@/lib/rate-limit"
import { hitMemoryRateLimit } from "@/lib/memory-rate-limit"
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

async function saveEvents(docs: Record<string, unknown>[], request: NextRequest): Promise<void> {
  try {
    await connectDB()
    await ProductEvent.insertMany(docs, { ordered: false })
  } catch (error) {
    logApiError("/api/analytics/events", error, { request })
  }
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

    // En memoria: el límite es alto y no vale un upsert en Mongo por cada lote.
    const rl = hitMemoryRateLimit(`analytics_event:${getClientIp(request)}`, 120, 15 * 60_000)
    if (!rl.allowed) return new NextResponse(null, { status: 204 })

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

    // Se guarda después de responder: el navegador no espera a Mongo (el servidor
    // propio es un proceso largo, así que la promesa termina aunque ya respondimos).
    void saveEvents(docs, request)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logApiError("/api/analytics/events", error, { request })
    return new NextResponse(null, { status: 204 })
  }
}

export async function GET() {
  return NextResponse.json({ error: "method" }, { status: 405 })
}
