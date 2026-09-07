import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { getAdminInsightsCached, parseInsightsRange } from "@/lib/admin-insights"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const range = parseInsightsRange(request.nextUrl.searchParams.get("range"))
    const data = await getAdminInsightsCached(range)
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=30" },
    })
  } catch (error) {
    logApiError("/api/admin/insights", error, { request })
    return NextResponse.json({ error: "Error al obtener insights" }, { status: 500 })
  }
}
