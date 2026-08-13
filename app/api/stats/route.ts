import { NextRequest, NextResponse } from "next/server"
import { getPublicStats } from "@/lib/stats/get-public-stats"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const data = await getPublicStats()

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
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
