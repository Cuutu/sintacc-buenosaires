import { NextRequest, NextResponse } from "next/server"
import { checkRateLimitByIp } from "@/lib/rate-limit"

export type PublicReadKind = "list" | "detail"

function parseEnvInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name])
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/** Defaults: ~90 list / 60 detail por minuto, tunables por env. */
export function getPublicReadRateLimitConfig(kind: PublicReadKind): {
  type: string
  maxCount: number
  windowMinutes: number
} {
  const windowMinutes = parseEnvInt("PUBLIC_READ_RATE_WINDOW_MINUTES", 1, 1, 60)
  if (kind === "detail") {
    return {
      type: "public_catalog_detail",
      maxCount: parseEnvInt("PUBLIC_READ_RATE_LIMIT_DETAIL", 60, 10, 300),
      windowMinutes,
    }
  }
  return {
    type: "public_catalog_list",
    maxCount: parseEnvInt("PUBLIC_READ_RATE_LIMIT_LIST", 90, 10, 300),
    windowMinutes,
  }
}

export function publicReadRateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Probá de nuevo en un momento." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  )
}

/**
 * Rate limit IP para lecturas públicas. Fail-open si Mongo/rate-limit falla
 * (el mapa no debe caerse por la tabla de límites).
 */
export async function enforcePublicReadRateLimit(
  request: NextRequest,
  kind: PublicReadKind
): Promise<NextResponse | null> {
  try {
    const cfg = getPublicReadRateLimitConfig(kind)
    const result = await checkRateLimitByIp(
      request,
      cfg.type,
      cfg.maxCount,
      cfg.windowMinutes
    )
    if (!result.allowed) {
      return publicReadRateLimitedResponse(result.retryAfterSeconds)
    }
  } catch {
    /* fail-open */
  }
  return null
}
