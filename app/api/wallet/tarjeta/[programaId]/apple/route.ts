import { NextRequest, NextResponse } from "next/server"
import { logApiError } from "@/lib/logger"
import { buildLoyaltyPass, getApplePassConfig } from "@/lib/wallet/apple-pass"
import { findOrCreateCard, rememberCard } from "@/lib/wallet/card-request"
import { getProgramWithPlace, passInputFor } from "@/lib/wallet/loyalty"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { programaId: string } }

/** Descarga la tarjeta (.pkpass) para Apple Wallet. */
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

    const result = await findOrCreateCard(request, data, "apple")
    if (!result.ok) return result.response

    const buffer = await buildLoyaltyPass(passInputFor(result.card, data), config)
    const response = new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="celimap.pkpass"',
        "Cache-Control": "private, no-store",
      },
    })
    return rememberCard(response, result.card, "apple")
  } catch (error) {
    logApiError("/api/wallet/tarjeta/apple", error, { request })
    return NextResponse.json({ error: "No se pudo generar la tarjeta" }, { status: 500 })
  }
}
