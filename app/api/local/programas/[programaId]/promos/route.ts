import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { logApiError } from "@/lib/logger"
import { requireAuth } from "@/lib/middleware"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { refreshProgramCards } from "@/lib/wallet/notify"
import { canManageProgram, getProgramWithPlace } from "@/lib/wallet/loyalty"
import { doubleStampText, promosSchema, promosUpdate, sameDoubleStamp } from "@/lib/wallet/promos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { programaId: string } }

/** El local (o un admin) arma sus promos: sello doble en días y horarios flojos y "Traé un amigo". */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    const parsed = promosSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? "Pedido inválido"
      return NextResponse.json({ error }, { status: 400 })
    }

    const data = await getProgramWithPlace(params.programaId)
    if (!data) return NextResponse.json({ error: "No encontramos la tarjeta." }, { status: 404 })
    if (!canManageProgram(data.program, session)) {
      return NextResponse.json({ error: "Sólo el local puede cambiar sus promos." }, { status: 403 })
    }

    const changed =
      !sameDoubleStamp(data.program.doubleStamp, parsed.data.selloDoble) ||
      Boolean(data.program.referralEnabled) !== parsed.data.traeUnAmigo
    if (changed) {
      await connectDB()
      const program = await LoyaltyProgram.findByIdAndUpdate(data.program._id, promosUpdate(parsed.data), {
        new: true,
        runValidators: true,
      })
      if (!program) return NextResponse.json({ error: "No encontramos la tarjeta." }, { status: 404 })
      // La promo va al dorso de las tarjetas: se actualizan sin aviso y sin hacer esperar al local.
      void refreshProgramCards({ ...data, program })
    }

    return NextResponse.json(
      {
        selloDoble: parsed.data.selloDoble,
        traeUnAmigo: parsed.data.traeUnAmigo,
        texto: doubleStampText(parsed.data.selloDoble),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    logApiError("/api/local/programas/promos", error, { request })
    return NextResponse.json({ error: "No se pudo guardar la promo." }, { status: 500 })
  }
}
