import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import connectDB from "@/lib/mongodb"
import { logApiError } from "@/lib/logger"
import { requireAuth } from "@/lib/middleware"
import { LoyaltyCard } from "@/models/LoyaltyCard"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { notifyCardChanged } from "@/lib/wallet/notify"
import { stampIncrement } from "@/lib/wallet/promos"
import { addStamp, isValidSerial, normalizeEmail, redeemReward } from "@/lib/wallet/loyalty"
import { canStampProgram, resolveStampPlace, stampPlaceIdsFor } from "@/lib/wallet/branches"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  accion: z.enum(["sello", "canje"]),
  /** Sucursal donde se suma (id del lugar). Sin sucursales, no hace falta. */
  sucursal: z.string().max(40).optional(),
})

const ERRORS = {
  full: { status: 409, error: "La tarjeta ya está completa: primero canjeá el premio." },
  too_soon: { status: 429, error: "Ya se sumó un sello hace un momento." },
  not_ready: { status: 409, error: "Todavía no tiene los sellos para el premio." },
  not_found: { status: 404, error: "No encontramos la tarjeta." },
} as const

type Params = { params: { serial: string } }

/** El personal del local suma un sello o canjea el premio. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success || !isValidSerial(params.serial)) {
      return NextResponse.json({ error: "Pedido inválido" }, { status: 400 })
    }

    await connectDB()
    const card = await LoyaltyCard.findOne({ serialNumber: params.serial })
    const program = card ? await LoyaltyProgram.findById(card.programId) : null
    if (!card || !program) return NextResponse.json(ERRORS.not_found, { status: 404 })
    if (!canStampProgram(program, session)) {
      return NextResponse.json({ error: "Sólo el local puede sumar sellos." }, { status: 403 })
    }
    const placeId = resolveStampPlace(stampPlaceIdsFor(program, session), parsed.data.sucursal)
    if (!placeId) {
      return NextResponse.json({ error: "No podés sumar sellos en esa sucursal." }, { status: 403 })
    }

    const byEmail = normalizeEmail(session.user.email) || session.user.id
    const result =
      parsed.data.accion === "sello"
        ? await addStamp(card, program, byEmail, new Date(), placeId)
        : await redeemReward(card, program, byEmail, placeId)

    if (!result.ok) {
      const { status, error } = ERRORS[result.reason]
      return NextResponse.json({ error }, { status })
    }

    await notifyCardChanged(result.card)
    // El amigo que lo invitó ganó su sello de regalo: también se le actualiza la tarjeta.
    if (result.inviter) await notifyCardChanged(result.inviter)

    return NextResponse.json(
      {
        stamps: result.card.stamps,
        stampsForReward: program.stampsForReward,
        rewardsRedeemed: result.card.rewardsRedeemed,
        added: result.added,
        ...(result.bonus ? { bonus: result.bonus } : {}),
        inviterRewarded: Boolean(result.inviter),
        // Cuánto sumaría el próximo sello (para el botón).
        next: stampIncrement(result.card, program),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    logApiError("/api/local/tarjetas", error, { request })
    return NextResponse.json({ error: "No se pudo actualizar la tarjeta" }, { status: 500 })
  }
}
