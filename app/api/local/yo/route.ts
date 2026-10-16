import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import mongoose from "mongoose"
import { logApiError } from "@/lib/logger"
import { requireAuth } from "@/lib/middleware"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { Place } from "@/models/Place"
import { normalizeEmail } from "@/lib/wallet/loyalty"

export const dynamic = "force-dynamic"

/** ¿La cuenta es de un local con tarjeta? Para mostrar "Tu local" en el perfil (y en la app). */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session
    const email = normalizeEmail(session.user.email)
    const isAdmin = session.user.role === "admin"
    if (!email && !isAdmin) return NextResponse.json({ local: false, lugares: [] })

    await connectDB()
    const programs = await LoyaltyProgram.find(isAdmin ? {} : { staffEmails: email })
      .select("placeId")
      .limit(20)
      .lean<Array<{ placeId: mongoose.Types.ObjectId }>>()
    const places = programs.length
      ? await Place.find({ _id: { $in: programs.map((p) => p.placeId) } })
          .select("name")
          .lean<Array<{ name: string }>>()
      : []
    return NextResponse.json(
      { local: programs.length > 0, admin: isAdmin, lugares: places.map((p) => p.name) },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    logApiError("/api/local/yo", error, { request })
    return NextResponse.json({ error: "No se pudo cargar" }, { status: 500 })
  }
}
