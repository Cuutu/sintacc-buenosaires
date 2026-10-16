import { NextRequest, NextResponse } from "next/server"
import { logApiError } from "@/lib/logger"
import { requireAuth } from "@/lib/middleware"
import { notifyProgramNotice } from "@/lib/wallet/notify"
import { formatNoticeTime, noticeSchema } from "@/lib/wallet/notice"
import { canManageProgram, getProgramWithPlace, normalizeEmail, saveProgramNotice } from "@/lib/wallet/loyalty"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { programaId: string } }

/** El local manda un aviso a todos los que tienen su tarjeta (uno por día). */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    const parsed = noticeSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? "Pedido inválido"
      return NextResponse.json({ error }, { status: 400 })
    }

    const data = await getProgramWithPlace(params.programaId)
    if (!data) return NextResponse.json({ error: "No encontramos la tarjeta." }, { status: 404 })
    if (!canManageProgram(data.program, session)) {
      return NextResponse.json({ error: "Sólo el local puede mandar avisos." }, { status: 403 })
    }

    const now = new Date()
    const byEmail = normalizeEmail(session.user.email) || session.user.id
    const saved = await saveProgramNotice(data.program._id, parsed.data.texto, byEmail, now)
    if (!saved.ok) {
      const error =
        saved.reason === "paused"
          ? "La tarjeta está pausada."
          : `Ya mandaste un aviso hoy. El próximo, desde el ${formatNoticeTime(saved.nextAt ?? now)}.`
      return NextResponse.json({ error }, { status: saved.reason === "paused" ? 409 : 429 })
    }

    await notifyProgramNotice({ ...data, program: saved.program }, parsed.data.texto, now)

    return NextResponse.json(
      { texto: parsed.data.texto, enviado: now.toISOString() },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    logApiError("/api/local/programas/aviso", error, { request })
    return NextResponse.json({ error: "No se pudo mandar el aviso." }, { status: 500 })
  }
}
