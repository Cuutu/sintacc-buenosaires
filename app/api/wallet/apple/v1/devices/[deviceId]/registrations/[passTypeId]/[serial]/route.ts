import { NextRequest, NextResponse } from "next/server"
import { logApiError } from "@/lib/logger"
import { LoyaltyDevice } from "@/models/LoyaltyDevice"
import { DEVICE_ID_PATTERN, authorizeCard } from "@/lib/wallet/apple-web-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { deviceId: string; passTypeId: string; serial: string } }

const ROUTE = "/api/wallet/apple/v1/devices/registrations"

/** El iPhone guardó la tarjeta y quiere recibir avisos. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await authorizeCard(request, params.passTypeId, params.serial)
    if (auth instanceof NextResponse) return auth
    if (!DEVICE_ID_PATTERN.test(params.deviceId)) return new NextResponse(null, { status: 400 })

    const body = (await request.json().catch(() => null)) as { pushToken?: unknown } | null
    const pushToken = typeof body?.pushToken === "string" ? body.pushToken.trim() : ""
    if (!/^[A-Za-z0-9]{16,200}$/.test(pushToken)) return new NextResponse(null, { status: 400 })

    const existing = await LoyaltyDevice.findOneAndUpdate(
      { deviceLibraryIdentifier: params.deviceId, serialNumber: params.serial },
      { $set: { pushToken } },
      { upsert: true, new: false }
    )
    return new NextResponse(null, { status: existing ? 200 : 201 })
  } catch (error) {
    logApiError(ROUTE, error, { request })
    return new NextResponse(null, { status: 500 })
  }
}

/** El iPhone borró la tarjeta. */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await authorizeCard(request, params.passTypeId, params.serial)
    if (auth instanceof NextResponse) return auth
    await LoyaltyDevice.deleteOne({
      deviceLibraryIdentifier: params.deviceId,
      serialNumber: params.serial,
    })
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    logApiError(ROUTE, error, { request })
    return new NextResponse(null, { status: 500 })
  }
}
