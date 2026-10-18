import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { buildLoyaltyPass, getApplePassConfig } from "@/lib/wallet/apple-pass"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEMO_STAMPS_FOR_REWARD = 5

/**
 * Tarjeta de prueba para Apple Wallet. Sólo admin, sin guardar nada en la base.
 * Abrila desde Safari en el iPhone: ?sellos=0..5 para ver cómo se ve con sellos.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const config = getApplePassConfig()
    if (!config) {
      return NextResponse.json(
        { error: "Apple Wallet no está configurado en el servidor." },
        { status: 503 }
      )
    }

    const requested = Number(request.nextUrl.searchParams.get("sellos") ?? 0)
    const stamps = Number.isFinite(requested)
      ? Math.max(0, Math.min(Math.floor(requested), DEMO_STAMPS_FOR_REWARD))
      : 0
    const serialNumber = `demo-${randomUUID()}`

    const buffer = await buildLoyaltyPass(
      {
        serialNumber,
        barcodeValue: serialNumber,
        stamps,
        stampsForReward: DEMO_STAMPS_FOR_REWARD,
        reward: "Un café de regalo",
        placeName: "Local de prueba",
      },
      config
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="celimap.pkpass"',
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    logApiError("/api/admin/wallet/apple/demo", error, { request })
    return NextResponse.json({ error: "No se pudo generar la tarjeta" }, { status: 500 })
  }
}
