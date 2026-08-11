import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware"
import { checkRateLimit } from "@/lib/rate-limit"
import { logApiError, logger } from "@/lib/logger"
import connectDB from "@/lib/mongodb"
import { User } from "@/models/User"
import {
  ACCOUNT_DELETE_CONFIRM,
  AccountDeletionError,
  deleteAuthenticatedAccount,
  type AppleReauthPayload,
} from "@/lib/account-deletion"

/**
 * GET /api/account — safe flags for the signed-in user (no PII beyond booleans).
 * DELETE /api/account — erase the authenticated user's account + associated data.
 * Never accepts a client-supplied userId.
 */

function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || ""
  const host = request.headers.get("host") || ""
  const candidates = [origin, host].filter(Boolean)
  // Capacitor WKWebView may omit Origin on same-site cookie POSTs/DELETEs.
  if (candidates.length === 0) return true
  return candidates.some((c) => {
    const v = c.toLowerCase()
    return (
      v.includes("celimap.com.ar") ||
      v.includes("localhost") ||
      v.includes("127.0.0.1") ||
      v.includes("vercel.app")
    )
  })
}

function parseApple(body: unknown): AppleReauthPayload | undefined {
  if (!body || typeof body !== "object") return undefined
  const apple = (body as { apple?: unknown }).apple
  if (!apple || typeof apple !== "object") return undefined
  const a = apple as Record<string, unknown>
  const challengeId = typeof a.challengeId === "string" ? a.challengeId.trim() : ""
  const idToken = typeof a.idToken === "string" ? a.idToken.trim() : ""
  const authorizationCode =
    typeof a.authorizationCode === "string"
      ? a.authorizationCode.trim()
      : undefined
  if (!challengeId || !idToken) return undefined
  return { challengeId, idToken, authorizationCode }
}

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session
  try {
    await connectDB()
    const user = await User.findById(session.user.id).select("appleSub").lean()
    return NextResponse.json({
      hasAppleSub: Boolean(user?.appleSub),
    })
  } catch (error) {
    logApiError("/api/account GET", error, { request })
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!originAllowed(request)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })
    }

    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    const userId = session.user?.id
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Ignore any client-supplied userId field entirely.
    const body = (await request.json().catch(() => ({}))) as {
      confirm?: string
      userId?: unknown
    }

    if (body.userId !== undefined) {
      return NextResponse.json(
        { error: "No se acepta userId del cliente" },
        { status: 400 }
      )
    }

    const rate = await checkRateLimit(userId, "account_delete", 5)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Probá más tarde." },
        { status: 429 }
      )
    }

    const confirm =
      typeof body.confirm === "string" ? body.confirm.trim() : ""
    if (confirm !== ACCOUNT_DELETE_CONFIRM) {
      return NextResponse.json(
        {
          error: `Confirmá con confirm: "${ACCOUNT_DELETE_CONFIRM}"`,
          code: "invalid_confirm",
        },
        { status: 400 }
      )
    }

    const apple = parseApple(body)

    const result = await deleteAuthenticatedAccount({
      authenticatedUserId: userId,
      confirm: ACCOUNT_DELETE_CONFIRM,
      apple,
    })

    logger.info({
      route: "/api/account",
      message: "account_deleted",
      // No email / tokens — only technical outcomes
      appleRevoke: result.appleRevoke,
      cloudinaryPending: result.cloudinaryPending,
      alreadyDeleted: result.alreadyDeleted === true,
    })

    return NextResponse.json({
      ok: true,
      alreadyDeleted: result.alreadyDeleted === true,
      appleRevoke: result.appleRevoke,
      appleManualInstructions: result.appleManualInstructions,
      cloudinaryPending: result.cloudinaryPending,
      manualAppleRevokeSteps: result.appleManualInstructions
        ? [
            "Abrí Ajustes en tu iPhone o iPad",
            "Tocá tu nombre → Inicio de sesión y seguridad → Iniciar sesión con Apple",
            "Seleccioná Celimap y tocá Dejar de usar Apple ID",
          ]
        : undefined,
    })
  } catch (error: unknown) {
    if (error instanceof AccountDeletionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      )
    }
    logApiError("/api/account DELETE", error, { request })
    return NextResponse.json(
      { error: "No se pudo eliminar la cuenta" },
      { status: 500 }
    )
  }
}
