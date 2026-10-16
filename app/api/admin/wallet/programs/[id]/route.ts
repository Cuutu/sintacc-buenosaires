import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { deleteProgram, deleteProgramSchema, updateProgramSchema } from "@/lib/wallet/loyalty-admin"
import { getGoogleWalletConfig } from "@/lib/wallet/config"
import { expireGoogleCards } from "@/lib/wallet/google-wallet"

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

/**
 * Borra el programa con sus tarjetas y sellos (para locales de prueba o que dejaron de
 * participar). Pide escribir BORRAR: no se puede deshacer.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Programa inválido" }, { status: 400 })
    }

    const parsed = deleteProgramSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Falta confirmar" },
        { status: 400 }
      )
    }

    const deleted = await deleteProgram(params.id)
    if (!deleted) return NextResponse.json({ error: "No existe ese programa" }, { status: 404 })

    // Las de Google pasan a vencidas sin hacer esperar al admin.
    const google = getGoogleWalletConfig()
    if (google && deleted.googleSerials.length > 0) void expireGoogleCards(deleted.googleSerials, google)

    return NextResponse.json(
      { ok: true, tarjetas: deleted.cards, sellos: deleted.stamps },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    logApiError("/api/admin/wallet/programs/[id]", error, { request })
    return NextResponse.json({ error: "No se pudo borrar" }, { status: 500 })
  }
}
