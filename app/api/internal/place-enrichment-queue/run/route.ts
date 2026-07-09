import { NextRequest, NextResponse } from "next/server"
import { logApiError } from "@/lib/logger"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"
import {
  isValidInternalJobRequest,
  runEnrichmentQueueWorker,
} from "@/lib/place-enrichment-queue"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    if (!isPlaceResearchEnabled()) {
      return NextResponse.json({ error: "IA no configurada" }, { status: 503 })
    }

    const secret = request.headers.get("x-internal-job-secret")
    if (!isValidInternalJobRequest(secret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await runEnrichmentQueueWorker()
    return NextResponse.json({ ok: true })
  } catch (error) {
    logApiError("/api/internal/place-enrichment-queue/run", error, { request })
    return NextResponse.json({ error: "Error en worker" }, { status: 500 })
  }
}
