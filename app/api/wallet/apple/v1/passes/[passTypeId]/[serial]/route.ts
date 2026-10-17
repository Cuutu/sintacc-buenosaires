import { NextRequest, NextResponse } from "next/server"
import { logApiError } from "@/lib/logger"
import { buildLoyaltyPass } from "@/lib/wallet/apple-pass"
import { authorizeCard } from "@/lib/wallet/apple-web-service"
import { getProgramWithPlace, passInputFor } from "@/lib/wallet/loyalty"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { passTypeId: string; serial: string } }

/** El Wallet pide la versión nueva de la tarjeta (después de un aviso). */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await authorizeCard(request, params.passTypeId, params.serial)
    if (auth instanceof NextResponse) return auth
    const { card, config } = auth

    const lastModified = new Date(card.updatedAt)
    lastModified.setMilliseconds(0)
    const since = Date.parse(request.headers.get("if-modified-since") ?? "")
    if (Number.isFinite(since) && lastModified.getTime() <= since) {
      return new NextResponse(null, { status: 304 })
    }

    const data = await getProgramWithPlace(card.programId.toString())
    if (!data) return new NextResponse(null, { status: 404 })

    const buffer = await buildLoyaltyPass(passInputFor(card, data), config)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Last-Modified": lastModified.toUTCString(),
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    logApiError("/api/wallet/apple/v1/passes", error, { request })
    return new NextResponse(null, { status: 500 })
  }
}
