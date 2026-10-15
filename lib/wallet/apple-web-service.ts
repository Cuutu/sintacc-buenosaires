/**
 * Servicio web de Apple Wallet (https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes).
 * Apple autentica cada pedido con "Authorization: ApplePass <authenticationToken>" de esa tarjeta.
 */

import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { LoyaltyCard, type ILoyaltyCard } from "@/models/LoyaltyCard"
import { getApplePassConfig, type ApplePassConfig } from "@/lib/wallet/apple-pass"
import { isValidSerial, parseApplePassAuth, safeTokenEquals } from "@/lib/wallet/loyalty"

export const DEVICE_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/

const unauthorized = () => new NextResponse(null, { status: 401 })

export async function authorizeCard(
  request: NextRequest,
  passTypeId: string,
  serial: string
): Promise<{ card: ILoyaltyCard; config: ApplePassConfig } | NextResponse> {
  const config = getApplePassConfig()
  if (!config) return new NextResponse(null, { status: 503 })
  if (passTypeId !== config.passTypeIdentifier || !isValidSerial(serial)) return unauthorized()
  const token = parseApplePassAuth(request.headers.get("authorization"))
  if (!token) return unauthorized()
  await connectDB()
  const card = await LoyaltyCard.findOne({ serialNumber: serial })
  if (!card || !safeTokenEquals(card.authToken, token)) return unauthorized()
  return { card, config }
}
