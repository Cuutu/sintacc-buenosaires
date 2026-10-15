import { NextRequest, NextResponse } from "next/server"
import { logApiError } from "@/lib/logger"
import { findOrCreateCard, rememberCard } from "@/lib/wallet/card-request"
import { getGoogleWalletConfig, googleSaveLink } from "@/lib/wallet/google-wallet"
import { getProgramWithPlace, passInputFor } from "@/lib/wallet/loyalty"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { programaId: string } }

/** Crea la tarjeta en Google Wallet y manda al cliente a guardarla. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const config = getGoogleWalletConfig()
    if (!config) {
      return NextResponse.json({ error: "Google Wallet no está disponible." }, { status: 503 })
    }

    const data = await getProgramWithPlace(params.programaId)
    if (!data || !data.program.active) {
      return NextResponse.json({ error: "Esta tarjeta no existe." }, { status: 404 })
    }

    const result = await findOrCreateCard(request, data, "google")
    if (!result.ok) return result.response

    const saveUrl = await googleSaveLink(
      { ...passInputFor(result.card, data), programId: data.program._id.toString() },
      config
    )
    const response = NextResponse.redirect(saveUrl, 303)
    response.headers.set("Cache-Control", "private, no-store")
    return rememberCard(response, result.card, "google")
  } catch (error) {
    logApiError("/api/wallet/tarjeta/google", error, { request })
    return NextResponse.json({ error: "No se pudo generar la tarjeta" }, { status: 500 })
  }
}
