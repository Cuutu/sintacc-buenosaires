import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { getAdminOpsSnapshot } from "@/lib/admin-ops"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    const data = await getAdminOpsSnapshot()
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=15" },
    })
  } catch (error) {
    logApiError("/api/admin/ops", error, { request })
    return NextResponse.json({ error: "Error al cargar el centro de operaciones" }, { status: 500 })
  }
}
