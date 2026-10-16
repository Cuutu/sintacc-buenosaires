import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import connectDB from "@/lib/mongodb"
import { logApiError } from "@/lib/logger"
import { requireAuth } from "@/lib/middleware"
import { LoyaltyCard } from "@/models/LoyaltyCard"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { notifyCardChanged } from "@/lib/wallet/notify"
import {
  addStamp,
  canManageProgram,
  isValidSerial,
  normalizeEmail,
  redeemReward,
} from "@/lib/wallet/loyalty"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({ accion: z.enum(["sello", "canje"]) })

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
    if (!canManageProgram(program, session)) {
      return NextResponse.json({ error: "Sólo el local puede sumar sellos." }, { status: 403 })
    }

    const byEmail = normalizeEmail(session.user.email) || session.user.id
    const result =
      parsed.data.accion === "sello"
        ? await addStamp(card, program, byEmail)
        : await redeemReward(card, program, byEmail)

    if (!result.ok) {
      const { status, error } = ERRORS[result.reason]
      return NextResponse.json({ error }, { status })
    }

    await notifyCardChanged(result.card)

    return NextResponse.json(
      {
        stamps: result.card.stamps,
        stampsForReward: program.stampsForReward,
        rewardsRedeemed: result.card.rewardsRedeemed,
        added: result.added,
        ...(result.bonus ? { bonus: result.bonus } : {}),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    logApiError("/api/local/tarjetas", error, { request })
    return NextResponse.json({ error: "No se pudo actualizar la tarjeta" }, { status: 500 })
  }
}
