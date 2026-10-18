import { NextRequest, NextResponse } from "next/server"
import { hitMemoryRateLimit } from "@/lib/memory-rate-limit"
import { getClientIp } from "@/lib/rate-limit"

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
 * Rate limit por IP para lecturas públicas. En memoria: antes cada lectura
 * hacía un upsert en Mongo antes de llegar al caché. Fail-open si algo falla
 * (el mapa no debe caerse por el limitador).
 */
export async function enforcePublicReadRateLimit(
  request: NextRequest,
  kind: PublicReadKind
): Promise<NextResponse | null> {
  try {
    const cfg = getPublicReadRateLimitConfig(kind)
    const result = hitMemoryRateLimit(
      `${cfg.type}:${getClientIp(request)}`,
      cfg.maxCount,
      cfg.windowMinutes * 60_000
    )
    if (!result.allowed) {
      return publicReadRateLimitedResponse(result.retryAfterSeconds)
    }
  } catch {
    /* fail-open */
  }
  return null
}
