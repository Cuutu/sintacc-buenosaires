import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import connectDB from "@/lib/mongodb"
import { logApiError } from "@/lib/logger"
import { requireAuth } from "@/lib/middleware"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { canManageProgram, getProgramWithPlace, normalizeEmail } from "@/lib/wallet/loyalty"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { programaId: string } }

const emails = z
  .array(z.string().trim().toLowerCase().email("Mail inválido"))
  .max(10, "Máximo 10 mails")
  .transform((list) => Array.from(new Set(list)))

/** Sólo quién trabaja: las sucursales (dónde vale la tarjeta) las cambia CeliMap. */
const teamSchema = z
  .object({
    staffEmails: emails,
    employeeEmails: emails,
    branches: z.array(z.object({ placeId: z.string(), staffEmails: emails })),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nada para guardar")

/** El encargado (o un admin) suma o saca encargados y empleados desde el panel del local. */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    const parsed = teamSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Pedido inválido" }, { status: 400 })
    }

    const data = await getProgramWithPlace(params.programaId)
    if (!data) return NextResponse.json({ error: "No encontramos la tarjeta." }, { status: 404 })
    if (!canManageProgram(data.program, session)) {
      return NextResponse.json({ error: "Sólo el encargado puede cambiar el equipo." }, { status: 403 })
    }

    const { staffEmails, employeeEmails, branches } = parsed.data
    const me = normalizeEmail(session.user.email)
    if (staffEmails && session.user.role !== "admin" && me && !staffEmails.includes(me)) {
      return NextResponse.json({ error: "No podés sacarte a vos de encargado." }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    if (staffEmails) update.staffEmails = staffEmails
    if (employeeEmails) update.employeeEmails = employeeEmails
    if (branches) {
      const current = (data.program.branches ?? []).map((b) => b.placeId.toString())
      const sent = branches.map((b) => b.placeId)
      if (current.length !== sent.length || current.some((id, i) => id !== sent[i])) {
        return NextResponse.json({ error: "Las sucursales cambiaron. Recargá la página." }, { status: 409 })
      }
      // Sólo los mails: el resto de cada sucursal queda como está.
      branches.forEach((b, i) => {
        update[`branches.${i}.staffEmails`] = b.staffEmails
      })
    }

    await connectDB()
    await LoyaltyProgram.updateOne({ _id: data.program._id }, { $set: update }, { runValidators: true })
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    logApiError("/api/local/programas/equipo", error, { request })
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 })
  }
}
