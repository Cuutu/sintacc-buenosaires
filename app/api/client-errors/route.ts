import { NextRequest, NextResponse } from "next/server"
import { sanitizeMessage, sanitizeStack } from "@/lib/client-error-reporter"

/**
 * Sink Preview-only: persiste en logs de Vercel (no Mongo, no PII).
 * Rechaza production. No aceptar tokens/sesión/email/coords.
 */
export async function POST(request: NextRequest) {
  const vercelEnv = process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || ""
  if (vercelEnv === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 404 })
  }
  if (vercelEnv !== "preview" && process.env.NODE_ENV === "production") {
    // Build prod local sin VERCEL_ENV → no aceptar
    return NextResponse.json({ error: "disabled" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const report = {
    message: sanitizeMessage(String(raw.message || "error")),
    name: typeof raw.name === "string" ? raw.name.slice(0, 80) : undefined,
    stack: sanitizeStack(typeof raw.stack === "string" ? raw.stack : undefined),
    digest: typeof raw.digest === "string" ? raw.digest.slice(0, 64) : undefined,
    route: typeof raw.route === "string" ? raw.route.slice(0, 200) : undefined,
    platform: typeof raw.platform === "string" ? raw.platform.slice(0, 32) : undefined,
    native: Boolean(raw.native),
    release: typeof raw.release === "string" ? raw.release.slice(0, 32) : undefined,
    source: typeof raw.source === "string" ? raw.source.slice(0, 40) : undefined,
    host: typeof raw.host === "string" ? raw.host.slice(0, 120) : undefined,
    ts: typeof raw.ts === "number" ? raw.ts : Date.now(),
  }

  // Persistencia = log de función Vercel (accesible en dashboard Preview)
  console.error("[preview-client-error]", JSON.stringify(report))

  return new NextResponse(null, { status: 204 })
}
