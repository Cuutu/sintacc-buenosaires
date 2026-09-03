import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"
import {
  getEnrichmentQueueStats,
  resumeEnrichmentQueue,
  startEnrichmentQueue,
  type EnrichmentCatalog,
} from "@/lib/place-enrichment-queue"

function parseCatalog(value: unknown): EnrichmentCatalog {
  if (value === "pending" || value === "all" || value === "approved") return value
  return "approved"
}

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const catalog = parseCatalog(request.nextUrl.searchParams.get("catalog"))
    const stats = await getEnrichmentQueueStats(catalog)
    return NextResponse.json(stats)
  } catch (error) {
    logApiError("/api/admin/places/enrichment-queue", error, { request })
    return NextResponse.json({ error: "Error al leer cola" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    if (!isPlaceResearchEnabled()) {
      return NextResponse.json(
        { error: "Investigación IA no configurada (OPENROUTER_API_KEY)" },
        { status: 503 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: string
      catalog?: EnrichmentCatalog
      ids?: string[]
    }
    const catalog = parseCatalog(body.catalog)
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : undefined

    if (body.action === "resume") {
      const stats = await resumeEnrichmentQueue(catalog === "approved" && !ids?.length ? "all" : catalog)
      return NextResponse.json({ message: "Cola reanudada", stats })
    }

    const result = await startEnrichmentQueue({
      catalog: ids?.length ? "all" : catalog,
      ids,
    })
    return NextResponse.json({
      message:
        result.queued > 0
          ? `Cola iniciada con ${result.queued} lugares`
          : "No había lugares nuevos para encolar",
      ...result,
    })
  } catch (error) {
    logApiError("/api/admin/places/enrichment-queue", error, { request })
    return NextResponse.json({ error: "Error al iniciar cola" }, { status: 500 })
  }
}
