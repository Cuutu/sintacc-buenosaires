import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { scanPublishedPlaceDuplicates } from "@/lib/place-duplicates-scan"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const { pairs, scanned } = await scanPublishedPlaceDuplicates()
    const exactCount = pairs.filter((pair) => pair.matchLevel === "exact").length

    return NextResponse.json({
      pairs,
      scanned,
      total: pairs.length,
      exactCount,
    })
  } catch (error) {
    logApiError("/api/admin/places/duplicates", error, { request })
    return NextResponse.json({ error: "Error al buscar duplicados" }, { status: 500 })
  }
}
