import { NextRequest, NextResponse } from "next/server"
import { checkRateLimitByIp } from "@/lib/rate-limit"
import { getPublicStats } from "@/lib/stats/get-public-stats"

export const dynamic = "force-dynamic"

/** Stats: 120 req / 15 min por IP (público, sin auth) */
const STATS_IP_LIMIT = 120
const STATS_WINDOW_MINUTES = 15

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimitByIp(
      request,
      "stats",
      STATS_IP_LIMIT,
      STATS_WINDOW_MINUTES
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Volvé a intentar en unos minutos." },
        { status: 429 }
      )
    }

    const data = await getPublicStats()

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (error) {
    const { logApiError } = await import("@/lib/logger")
    logApiError("/api/stats", error, { request })
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
}
