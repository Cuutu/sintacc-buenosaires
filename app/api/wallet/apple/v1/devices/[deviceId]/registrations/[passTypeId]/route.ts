import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { logApiError } from "@/lib/logger"
import { LoyaltyCard } from "@/models/LoyaltyCard"
import { LoyaltyDevice } from "@/models/LoyaltyDevice"
import { getApplePassConfig } from "@/lib/wallet/apple-pass"
import { DEVICE_ID_PATTERN } from "@/lib/wallet/apple-web-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { deviceId: string; passTypeId: string } }

/**
 * Qué tarjetas de este iPhone cambiaron desde passesUpdatedSince.
 * Apple no manda token acá; sólo devolvemos números de serie, que sin su token no sirven.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const config = getApplePassConfig()
    if (!config) return new NextResponse(null, { status: 503 })
    if (params.passTypeId !== config.passTypeIdentifier || !DEVICE_ID_PATTERN.test(params.deviceId)) {
      return new NextResponse(null, { status: 404 })
    }

    await connectDB()
    const devices = await LoyaltyDevice.find({ deviceLibraryIdentifier: params.deviceId })
      .select("serialNumber")
      .lean()
    if (devices.length === 0) return new NextResponse(null, { status: 404 })

    const since = Number(request.nextUrl.searchParams.get("passesUpdatedSince"))
    const filter: Record<string, unknown> = {
      serialNumber: { $in: devices.map((d) => d.serialNumber) },
    }
    if (Number.isFinite(since) && since > 0) filter.updatedAt = { $gt: new Date(since) }

    const cards = await LoyaltyCard.find(filter).select("serialNumber updatedAt").lean()
    if (cards.length === 0) return new NextResponse(null, { status: 204 })

    const lastUpdated = Math.max(...cards.map((c) => new Date(c.updatedAt).getTime()))
    return NextResponse.json({
      serialNumbers: cards.map((c) => c.serialNumber),
      lastUpdated: String(lastUpdated),
    })
  } catch (error) {
    logApiError("/api/wallet/apple/v1/devices/registrations", error, { request })
    return new NextResponse(null, { status: 500 })
  }
}
