import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { updateProgramSchema } from "@/lib/wallet/loyalty-admin"

export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

/** Editar o pausar (active: false). No hay borrado: las tarjetas de los clientes siguen existiendo. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Programa inválido" }, { status: 400 })
    }

    const parsed = updateProgramSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      )
    }

    await connectDB()
    const program = await LoyaltyProgram.findByIdAndUpdate(
      params.id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    )
    if (!program) return NextResponse.json({ error: "No existe ese programa" }, { status: 404 })
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    logApiError("/api/admin/wallet/programs/[id]", error, { request })
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 })
  }
}
