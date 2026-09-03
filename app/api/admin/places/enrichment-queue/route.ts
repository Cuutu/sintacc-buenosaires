import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"
import {
  cancelEnrichmentQueue,
  getEnrichmentQueueStats,
  resumeEnrichmentQueue,
  startEnrichmentQueue,
} from "@/lib/place-enrichment-queue"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const stats = await getEnrichmentQueueStats("pending")
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

    const body = (await request.json().catch(() => ({}))) as {
      action?: string
      ids?: string[]
    }
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : undefined

    if (body.action === "cancel") {
      const result = await cancelEnrichmentQueue()
      return NextResponse.json({
        message:
          result.cancelled > 0
            ? `Cola cancelada (${result.cancelled} lugares)`
            : "No había nada en cola",
        ...result,
      })
    }

    if (!isPlaceResearchEnabled()) {
      return NextResponse.json(
        { error: "Investigación IA no configurada (OPENROUTER_API_KEY)" },
        { status: 503 }
      )
    }

    if (body.action === "resume") {
      const stats = await resumeEnrichmentQueue()
      return NextResponse.json({ message: "Cola reanudada", stats })
    }

    const result = await startEnrichmentQueue({ catalog: "pending", ids })
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
