import { NextRequest, NextResponse } from "next/server"
import { logApiError } from "@/lib/logger"
import { getGoogleMapsApiKey } from "@/lib/google-places"
import {
  isValidInternalJobRequest,
  runGoogleSyncQueueWorker,
} from "@/lib/google-sync-queue"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    if (!getGoogleMapsApiKey()) {
      return NextResponse.json({ error: "Google API no configurada" }, { status: 503 })
    }

    const secret = request.headers.get("x-internal-job-secret")
    if (!isValidInternalJobRequest(secret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await runGoogleSyncQueueWorker()
    return NextResponse.json({ ok: true })
  } catch (error) {
    logApiError("/api/internal/google-sync-queue/run", error, { request })
    return NextResponse.json({ error: "Error en worker Google" }, { status: 500 })
  }
}
