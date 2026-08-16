import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { getOrSetApiCache } from "@/lib/api-cache"
import { getAdminCounts } from "@/lib/admin-ops"

const ADMIN_COUNTS_CACHE_TTL_MS = 20 * 1000

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const data = await getOrSetApiCache("admin:counts", ADMIN_COUNTS_CACHE_TTL_MS, async () => {
      return getAdminCounts()
    })

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=20" },
    })
  } catch (error) {
    logApiError("/api/admin/counts", error, { request })
    return NextResponse.json({ error: "Error al obtener conteos" }, { status: 500 })
  }
}
