import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { parseInsightsRange } from "@/lib/admin-insights-types"
import { getWebVitalsSummary } from "@/lib/web-vitals-server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const range = parseInsightsRange(request.nextUrl.searchParams.get("range"))
    const data = await getWebVitalsSummary(range)
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (error) {
    logApiError("/api/admin/web-vitals", error, { request })
    return NextResponse.json({ error: "Error al obtener web vitals" }, { status: 500 })
  }
}
