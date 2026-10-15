import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { Place } from "@/models/Place"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { createProgramSchema, listProgramsForAdmin } from "@/lib/wallet/loyalty-admin"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    return NextResponse.json({ programs: await listProgramsForAdmin() }, { headers: NO_STORE })
  } catch (error) {
    logApiError("/api/admin/wallet/programs", error, { request })
    return NextResponse.json({ error: "Error al obtener las tarjetas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const parsed = createProgramSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      )
    }

    await connectDB()
    const place = await Place.exists({ _id: parsed.data.placeId })
    if (!place) return NextResponse.json({ error: "No existe ese lugar" }, { status: 404 })
    if (await LoyaltyProgram.exists({ placeId: parsed.data.placeId })) {
      return NextResponse.json({ error: "Ese lugar ya tiene una tarjeta" }, { status: 409 })
    }

    const program = await LoyaltyProgram.create({ ...parsed.data, active: true })
    return NextResponse.json({ id: program._id.toString() }, { status: 201, headers: NO_STORE })
  } catch (error) {
    logApiError("/api/admin/wallet/programs", error, { request })
    return NextResponse.json({ error: "No se pudo crear la tarjeta" }, { status: 500 })
  }
}
