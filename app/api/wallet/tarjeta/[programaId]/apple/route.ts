import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { logApiError } from "@/lib/logger"
import { checkRateLimitByIp } from "@/lib/rate-limit"
import { LoyaltyCard, type ILoyaltyCard } from "@/models/LoyaltyCard"
import { buildLoyaltyPass, getApplePassConfig } from "@/lib/wallet/apple-pass"
import { createCard, getProgramWithPlace, isValidSerial, passInputFor } from "@/lib/wallet/loyalty"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { programaId: string } }

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const cookieName = (programId: string) => `cm_tarjeta_${programId}`

/**
 * El cliente escaneó el cartel del local y toca "Agregar a Apple Wallet".
 * Sin cuenta: la cookie hace que, si vuelve a tocar, reciba la misma tarjeta y no una nueva.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const config = getApplePassConfig()
    if (!config) {
      return NextResponse.json({ error: "Apple Wallet no está disponible." }, { status: 503 })
    }

    const data = await getProgramWithPlace(params.programaId)
    if (!data || !data.program.active) {
      return NextResponse.json({ error: "Esta tarjeta no existe." }, { status: 404 })
    }
    const programId = data.program._id.toString()

    await connectDB()
    const savedSerial = request.cookies.get(cookieName(programId))?.value
    let card: ILoyaltyCard | null = isValidSerial(savedSerial)
      ? await LoyaltyCard.findOne({ serialNumber: savedSerial, programId: data.program._id })
      : null

    if (!card) {
      const limit = await checkRateLimitByIp(request, "loyalty_card_create", 10, 1440)
      if (!limit.allowed) {
        return NextResponse.json(
          { error: "Demasiadas tarjetas desde esta conexión. Probá mañana." },
          { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
        )
      }
      card = await createCard(data.program._id)
    }
    const saved = card

    const buffer = await buildLoyaltyPass(passInputFor(saved, data), config)
    const response = new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="celimap.pkpass"',
        "Cache-Control": "private, no-store",
      },
    })
    response.cookies.set(cookieName(programId), saved.serialNumber, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/api/wallet/tarjeta",
    })
    return response
  } catch (error) {
    logApiError("/api/wallet/tarjeta/apple", error, { request })
    return NextResponse.json({ error: "No se pudo generar la tarjeta" }, { status: 500 })
  }
}
