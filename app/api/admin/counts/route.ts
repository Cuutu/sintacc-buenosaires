import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Suggestion } from "@/models/Suggestion"
import { Contact } from "@/models/Contact"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { getOrSetApiCache } from "@/lib/api-cache"

const ADMIN_COUNTS_CACHE_TTL_MS = 20 * 1000

/** Cuentas para badges del admin (sugerencias pendientes, contactos, total lugares) */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const data = await getOrSetApiCache("admin:counts", ADMIN_COUNTS_CACHE_TTL_MS, async () => {
      const [suggestionsPending, contactsTotal, placesTotal] = await Promise.all([
        Suggestion.countDocuments({ status: "pending" }),
        Contact.countDocuments(),
        Place.countDocuments(),
      ])

      return {
        suggestionsPending,
        contactsTotal,
        placesTotal,
      }
    })

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=20" },
    })
  } catch (error) {
    logApiError("/api/admin/counts", error, { request })
    return NextResponse.json(
      { error: "Error al obtener conteos" },
      { status: 500 }
    )
  }
}
