import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
import { checkRateLimitByIp } from "@/lib/rate-limit"
import {
  createNativeAppleChallenge,
  isNativeAppleAuthEnabled,
} from "@/lib/native-apple-auth"

/** GET: issue one-time Apple Sign-In challenge (raw nonce + opaque id). */
export async function GET(request: NextRequest) {
  if (!isNativeAppleAuthEnabled()) {
    return NextResponse.json({ error: "Native Apple auth disabled" }, { status: 404 })
  }

  const rateLimit = await checkRateLimitByIp(
    request,
    "native_apple_challenge",
    30,
    15
  )
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    )
  }

  try {
    const challenge = await createNativeAppleChallenge()
    return NextResponse.json(challenge)
  } catch (error) {
    console.error(
      "[native-apple-challenge]",
      error instanceof Error ? error.message : "challenge_failed"
    )
    return NextResponse.json({ error: "Could not create challenge" }, { status: 500 })
  }
}
