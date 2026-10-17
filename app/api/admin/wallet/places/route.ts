import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { Place } from "@/models/Place"

export const dynamic = "force-dynamic"

/** Buscador de lugares para elegir a qué local se le da la tarjeta. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 60) ?? ""
    if (q.length < 2) return NextResponse.json({ places: [] })

    await connectDB()
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    const places = await Place.find({ $or: [{ name: regex }, { neighborhood: regex }] })
      .select("name neighborhood status")
      .limit(8)
      .lean()
    return NextResponse.json(
      {
        places: places.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          neighborhood: p.neighborhood,
          status: p.status,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    logApiError("/api/admin/wallet/places", error, { request })
    return NextResponse.json({ error: "Error al buscar lugares" }, { status: 500 })
  }
}
