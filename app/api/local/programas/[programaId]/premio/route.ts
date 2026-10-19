import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { logApiError } from "@/lib/logger"
import { requireAuth } from "@/lib/middleware"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { notifyRewardChanged } from "@/lib/wallet/notify"
import { canManageProgram, getProgramWithPlace } from "@/lib/wallet/loyalty"
import { formatNoticeTime } from "@/lib/wallet/notice"
import {
  nextRewardChangeAt,
  REWARD_CHANGE_COOLDOWN_MS,
  rewardChangeSchema,
  sameReward,
} from "@/lib/wallet/reward-change"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { programaId: string } }

const noStore = { "Cache-Control": "private, no-store" }

/**
 * El encargado del local cambia cuántos sellos pide y el premio. Vale para todos los que tienen
 * la tarjeta y les llega como novedad. El local puede hacerlo una vez cada 15 días (el admin, siempre).
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    const parsed = rewardChangeSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? "Pedido inválido"
      return NextResponse.json({ error }, { status: 400 })
    }

    const data = await getProgramWithPlace(params.programaId)
    if (!data) return NextResponse.json({ error: "No encontramos la tarjeta." }, { status: 404 })
    if (!canManageProgram(data.program, session)) {
      return NextResponse.json(
        { error: "Sólo el encargado del local puede cambiar los sellos y el premio." },
        { status: 403 }
      )
    }
    if (sameReward(data.program, parsed.data)) {
      return NextResponse.json({ error: "No cambiaste nada." }, { status: 400 })
    }

    const isAdmin = session.user.role === "admin"
    const now = new Date()
    const next = isAdmin ? null : nextRewardChangeAt(data.program, now)
    if (next) {
      return NextResponse.json(
        { error: `Ya lo cambiaste hace poco. Vas a poder cambiarlo de nuevo el ${formatNoticeTime(next)}.` },
        { status: 429 }
      )
    }

    await connectDB()
    // La condición evita que dos cambios al mismo tiempo se salteen la espera de 15 días.
    const program = await LoyaltyProgram.findOneAndUpdate(
      isAdmin
        ? { _id: data.program._id }
        : {
            _id: data.program._id,
            $or: [
              { shopRewardChangedAt: { $exists: false } },
              { shopRewardChangedAt: { $lte: new Date(now.getTime() - REWARD_CHANGE_COOLDOWN_MS) } },
            ],
          },
      {
        $set: {
          stampsForReward: parsed.data.stampsForReward,
          reward: parsed.data.reward,
          rewardChangedAt: now,
          ...(isAdmin ? {} : { shopRewardChangedAt: now }),
        },
      },
      { new: true, runValidators: true }
    )
    if (!program) {
      return NextResponse.json({ error: "Ya lo cambiaste hace poco. Probá de nuevo en unos días." }, { status: 429 })
    }

    // Las tarjetas se actualizan y avisan sin hacer esperar al local.
    void notifyRewardChanged({ ...data, program }, now)

    const nextAt = nextRewardChangeAt(program, now)
    return NextResponse.json(
      {
        stampsForReward: program.stampsForReward,
        reward: program.reward,
        nextAt: nextAt ? formatNoticeTime(nextAt) : null,
      },
      { headers: noStore }
    )
  } catch (error) {
    logApiError("/api/local/programas/premio", error, { request })
    return NextResponse.json({ error: "No se pudo guardar el cambio." }, { status: 500 })
  }
}
