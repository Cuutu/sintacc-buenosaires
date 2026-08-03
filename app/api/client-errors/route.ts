import { NextRequest, NextResponse } from "next/server"
import {
  CLIENT_ERROR_MAX_BYTES,
  generateEventId,
  parseClientErrorBody,
} from "@/lib/client-error-schema"
import { checkRateLimitByIp } from "@/lib/rate-limit"

/**
 * POST /api/client-errors — producción + preview.
 * Sin cookies/headers/IP en logs. Body ≤16KB. Allowlist de campos.
 */

const memoryBuckets = new Map<string, { count: number; start: number }>()

function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || ""
  const host = request.headers.get("host") || ""
  const candidates = [origin, host].filter(Boolean)
  if (candidates.length === 0) return true // same-origin / native WebView a veces sin Origin
  return candidates.some((c) => {
    const v = c.toLowerCase()
    return (
      v.includes("celimap.com.ar") ||
      v.includes("localhost") ||
      v.includes("127.0.0.1") ||
      v.includes("vercel.app") ||
      v.includes("sintacc")
    )
  })
}

function memoryRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = memoryBuckets.get(key)
  if (!bucket || now - bucket.start > windowMs) {
    memoryBuckets.set(key, { count: 1, start: now })
    return true
  }
  bucket.count += 1
  if (memoryBuckets.size > 500) {
    for (const [k, b] of memoryBuckets) {
      if (now - b.start > windowMs) memoryBuckets.delete(k)
    }
  }
  return bucket.count <= max
}

function memoryKey(request: NextRequest): string {
  // Hash-ish sin loguear IP: solo uso interno de rate limit en memoria
  const fwd = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anon"
  const first = fwd.split(",")[0]?.trim() || "anon"
  let h = 0
  for (let i = 0; i < first.length; i++) h = (h * 31 + first.charCodeAt(i)) >>> 0
  return `m:${h}`
}

export async function POST(request: NextRequest) {
  try {
    if (!originAllowed(request)) {
      return NextResponse.json({ error: "origin" }, { status: 403 })
    }

    const contentType = request.headers.get("content-type") || ""
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "content-type" }, { status: 415 })
    }

    const contentLength = Number(request.headers.get("content-length") || "0")
    if (contentLength > CLIENT_ERROR_MAX_BYTES) {
      return NextResponse.json({ error: "too-large" }, { status: 413 })
    }

    // Rate limit: preferir Mongo IP limiter; fallback memoria (nunca loguear IP)
    let allowed = true
    try {
      const rl = await Promise.race([
        checkRateLimitByIp(request, "client_error", 40, 15),
        new Promise<{ allowed: boolean }>((resolve) =>
          setTimeout(() => resolve({ allowed: true }), 800)
        ),
      ])
      allowed = rl.allowed
    } catch {
      allowed = memoryRateLimit(memoryKey(request), 40, 15 * 60_000)
    }
    if (!allowed) {
      // Aún devolvemos eventId para no romper UX de código mostrado
      return NextResponse.json({ eventId: generateEventId(), limited: true }, { status: 429 })
    }
    if (!memoryRateLimit(memoryKey(request), 20, 60_000)) {
      return NextResponse.json({ eventId: generateEventId(), limited: true }, { status: 429 })
    }

    const text = await request.text()
    if (text.length > CLIENT_ERROR_MAX_BYTES) {
      return NextResponse.json({ error: "too-large" }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: "invalid" }, { status: 400 })
    }

    const parsed = parseClientErrorBody(body)
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    // Una sola línea estructurada — sin IP, cookies, headers, payload crudo
    console.error("[CELIMAP_CLIENT_ERROR]", JSON.stringify(parsed))

    return NextResponse.json({ eventId: parsed.eventId }, { status: 200 })
  } catch {
    return NextResponse.json({ eventId: generateEventId(), error: "internal" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: "method" }, { status: 405 })
}
