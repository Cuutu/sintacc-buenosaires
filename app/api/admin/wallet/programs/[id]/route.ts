import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import {
  countExistingPlaces,
  deleteProgram,
  deleteProgramSchema,
  placesTakenByOtherProgram,
  updateProgramSchema,
} from "@/lib/wallet/loyalty-admin"
import { getProgramWithPlace } from "@/lib/wallet/loyalty"
import { notifyRewardChanged, refreshProgramCards } from "@/lib/wallet/notify"
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
    const { branches, brandName } = parsed.data
    const current = await LoyaltyProgram.findById(params.id)
      .select("placeId stampsForReward reward brandName branches.placeId")
      .lean<{
        placeId: mongoose.Types.ObjectId
        stampsForReward: number
        reward: string
        brandName?: string
        branches?: Array<{ placeId: mongoose.Types.ObjectId }>
      }>()
    if (!current) return NextResponse.json({ error: "No existe ese programa" }, { status: 404 })
    // Cambiaron los sellos o el premio: las tarjetas guardadas lo muestran como novedad.
    const rewardChanged =
      (parsed.data.stampsForReward !== undefined && parsed.data.stampsForReward !== current.stampsForReward) ||
      (parsed.data.reward !== undefined && parsed.data.reward !== current.reward)
    // Cambiaron las sucursales (dónde vale) o el nombre: hay que rehacer las tarjetas.
    // Cambiar sólo quién sella en cada sucursal no toca las tarjetas de los clientes.
    const placesChanged =
      branches !== undefined &&
      branches.map((b) => b.placeId).join(",") !==
        (current.branches ?? []).map((b) => b.placeId.toString()).join(",")
    const brandChanged = brandName !== undefined && brandName !== (current.brandName ?? "")
    if (branches) {
      const ids = branches.map((b) => b.placeId)
      if (ids.includes(current.placeId.toString())) {
        return NextResponse.json({ error: "El local principal no va como sucursal" }, { status: 400 })
      }
      if (ids.length > 0 && (await countExistingPlaces(ids)) !== ids.length) {
        return NextResponse.json({ error: "Alguna sucursal no existe" }, { status: 404 })
      }
      if (ids.length > 0 && (await placesTakenByOtherProgram(ids, params.id))) {
        return NextResponse.json({ error: "Alguna sucursal ya tiene otra tarjeta" }, { status: 409 })
      }
    }

    const program = await LoyaltyProgram.findByIdAndUpdate(
      params.id,
      { $set: { ...parsed.data, ...(rewardChanged ? { rewardChangedAt: new Date() } : {}) } },
      { new: true, runValidators: true }
    )
    if (!program) return NextResponse.json({ error: "No existe ese programa" }, { status: 404 })

    if (rewardChanged) {
      // Sellos o premio nuevos: se actualizan todas las tarjetas y les llega el aviso.
      const data = await getProgramWithPlace(params.id)
      if (data) void notifyRewardChanged(data)
    } else if (placesChanged || brandChanged) {
      // Sucursales o nombre nuevos: cambian las ubicaciones y el nombre de las tarjetas (sin aviso).
      const data = await getProgramWithPlace(params.id)
      if (data) void refreshProgramCards(data)
    }
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
