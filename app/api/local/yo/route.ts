import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import mongoose from "mongoose"
import { logApiError } from "@/lib/logger"
import { requireAuth } from "@/lib/middleware"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { Place } from "@/models/Place"
import { normalizeEmail } from "@/lib/wallet/loyalty"
import { staffProgramFilter } from "@/lib/wallet/branches"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "private, no-store" }

/**
 * ¿La cuenta atiende algún local con tarjeta (dueño, encargado o empleado)? Para mostrar
 * "Tarjeta de sellos" en el perfil. Ser admin no cuenta: el admin ve todos los locales en
 * /local y /admin/tarjetas, pero en su perfil solo aparece si además es de un local.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session
    const email = normalizeEmail(session.user.email)
    if (!email) return NextResponse.json({ local: false, lugares: [] }, { headers: NO_STORE })

    await connectDB()
    const programs = await LoyaltyProgram.find(staffProgramFilter(email))
      .select("placeId brandName")
      .limit(20)
      .lean<Array<{ placeId: mongoose.Types.ObjectId; brandName?: string }>>()
    const places = programs.length
      ? await Place.find({ _id: { $in: programs.map((p) => p.placeId) } })
          .select("name")
          .lean<Array<{ _id: mongoose.Types.ObjectId; name: string }>>()
      : []
    const nameById = new Map(places.map((p) => [p._id.toString(), p.name]))
    const lugares = programs.map((p) => p.brandName || nameById.get(p.placeId.toString()) || "Local")
    return NextResponse.json({ local: programs.length > 0, lugares }, { headers: NO_STORE })
  } catch (error) {
    logApiError("/api/local/yo", error, { request })
    return NextResponse.json({ error: "No se pudo cargar" }, { status: 500 })
  }
}
