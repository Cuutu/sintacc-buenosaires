import { NextRequest, NextResponse } from "next/server"
import { checkRateLimitByIp } from "@/lib/rate-limit"
import {
  createNativeGoogleGrant,
  isNativeGoogleAuthEnabled,
  resolveGoogleNativeIdentity,
  upsertUserFromGoogleIdentity,
} from "@/lib/native-google-auth"

type Body = {
  idToken?: unknown
  serverAuthCode?: unknown
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function POST(request: NextRequest) {
  if (!isNativeGoogleAuthEnabled()) {
    return NextResponse.json({ error: "Native Google auth disabled" }, { status: 404 })
  }

  const rateLimit = await checkRateLimitByIp(
    request,
    "native_google_auth",
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

  const idToken = asOptionalString(body.idToken)
  const serverAuthCode = asOptionalString(body.serverAuthCode)
  if (!idToken && !serverAuthCode) {
    return NextResponse.json(
      { error: "idToken or serverAuthCode required" },
      { status: 400 }
    )
  }

  try {
    const identity = await resolveGoogleNativeIdentity({ idToken, serverAuthCode })
    const user = await upsertUserFromGoogleIdentity(identity)
    const grant = await createNativeGoogleGrant(user._id.toString())
    return NextResponse.json({ grant })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google auth failed"
    console.error("[native-google]", message)
    return NextResponse.json({ error: "Google auth failed" }, { status: 401 })
  }
}
