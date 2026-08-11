import { NextRequest, NextResponse } from "next/server"
import { checkRateLimitByIp } from "@/lib/rate-limit"
import {
  AppleAuthError,
  completeNativeAppleSignIn,
  isNativeAppleAuthEnabled,
} from "@/lib/native-apple-auth"

type Body = {
  challengeId?: unknown
  idToken?: unknown
  givenName?: unknown
  familyName?: unknown
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: NextRequest) {
  if (!isNativeAppleAuthEnabled()) {
    return NextResponse.json({ error: "Native Apple auth disabled" }, { status: 404 })
  }

  const rateLimit = await checkRateLimitByIp(
    request,
    "native_apple_auth",
    20,
    15
  )
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    )
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const challengeId = asOptionalString(body.challengeId)
  const idToken = asOptionalString(body.idToken)
  if (!challengeId || !idToken) {
    return NextResponse.json(
      { error: "challengeId and idToken required" },
      { status: 400 }
    )
  }

  try {
    const { grant } = await completeNativeAppleSignIn({
      challengeId,
      idToken,
      givenName: asOptionalNullableString(body.givenName),
      familyName: asOptionalNullableString(body.familyName),
    })
    return NextResponse.json({ grant })
  } catch (error) {
    if (error instanceof AppleAuthError) {
      if (error.code === "email_other_provider") {
        return NextResponse.json(
          {
            error:
              "Este email ya está asociado a otra forma de inicio de sesión. Entrá con ese método.",
            code: error.code,
          },
          { status: 409 }
        )
      }
      console.error("[native-apple]", error.code)
      return NextResponse.json(
        { error: "Apple auth failed", code: error.code },
        { status: 401 }
      )
    }
    console.error(
      "[native-apple]",
      error instanceof Error ? error.message : "Apple auth failed"
    )
    return NextResponse.json({ error: "Apple auth failed" }, { status: 401 })
  }
}
