/**
 * El cliente escaneó el cartel del local y toca "Agregar a … Wallet".
 * Sin cuenta: una cookie por programa y Wallet hace que, si vuelve a tocar,
 * reciba la misma tarjeta y no una nueva.
 */

import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { checkRateLimitByIp } from "@/lib/rate-limit"
import { LoyaltyCard, type ILoyaltyCard, type LoyaltyWallet } from "@/models/LoyaltyCard"
import { createCard, isValidSerial, type ProgramWithPlace } from "@/lib/wallet/loyalty"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Las de Apple mantienen el nombre de antes para no duplicar tarjetas ya entregadas.
const cookieName = (programId: string, wallet: LoyaltyWallet) =>
  wallet === "apple" ? `cm_tarjeta_${programId}` : `cm_tarjeta_${wallet}_${programId}`

export type CardForRequest =
  | { ok: true; card: ILoyaltyCard }
  | { ok: false; response: NextResponse }

export async function findOrCreateCard(
  request: NextRequest,
  data: ProgramWithPlace,
  wallet: LoyaltyWallet
): Promise<CardForRequest> {
  const programId = data.program._id.toString()
  await connectDB()
  const savedSerial = request.cookies.get(cookieName(programId, wallet))?.value
  const existing = isValidSerial(savedSerial)
    ? await LoyaltyCard.findOne({
        serialNumber: savedSerial,
        programId: data.program._id,
        ...(wallet === "apple" ? { wallet: { $ne: "google" } } : { wallet }),
      })
    : null
  if (existing) return { ok: true, card: existing }

  const limit = await checkRateLimitByIp(request, "loyalty_card_create", 10, 1440)
  if (!limit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Demasiadas tarjetas desde esta conexión. Probá mañana." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      ),
    }
  }
  return { ok: true, card: await createCard(data.program._id, wallet) }
}

export function rememberCard(response: NextResponse, card: ILoyaltyCard, wallet: LoyaltyWallet): NextResponse {
  response.cookies.set(cookieName(card.programId.toString(), wallet), card.serialNumber, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/api/wallet/tarjeta",
  })
  return response
}
