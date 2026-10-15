import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

/** Errores que reporta el Wallet sobre nuestro servicio web. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { logs?: unknown } | null
  const logs = Array.isArray(body?.logs)
    ? body.logs.filter((l): l is string => typeof l === "string").slice(0, 10).map((l) => l.slice(0, 300))
    : []
  if (logs.length > 0) logger.warn({ route: "/api/wallet/apple/v1/log", message: "Apple Wallet log", logs })
  return new NextResponse(null, { status: 200 })
}
