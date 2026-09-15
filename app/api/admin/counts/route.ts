import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { getAdminCounts } from "@/lib/admin-ops"


export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const data = await getAdminCounts()

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    logApiError("/api/admin/counts", error, { request })
    return NextResponse.json({ error: "Error al obtener conteos" }, { status: 500 })
  }
}
