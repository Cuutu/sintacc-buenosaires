import crypto from "crypto"
import connectDB from "@/lib/mongodb"
import { User, type IUser } from "@/models/User"
import { NativeGoogleGrant } from "@/models/NativeGoogleGrant"

const GRANT_TTL_MS = 120_000
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

const ADMIN_EMAILS =
  process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || []

export type GoogleNativeIdentity = {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  image?: string
}

export function isNativeGoogleAuthEnabled(): boolean {
  const flag = process.env.NATIVE_GOOGLE_AUTH_ENABLED
  if (flag === "0" || flag === "false") return false
  // Deploy Etapa A dark by default until explicitly enabled in Vercel.
  return flag === "1" || flag === "true"
}

/** Allowed `aud` values for Google ID tokens (web + iOS OAuth clients). */
export function getGoogleAudienceAllowlist(): string[] {
  const ids = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
  return [...new Set(ids)]
}

export function isAllowedGoogleAudience(aud: string | string[] | undefined): boolean {
  if (!aud) return false
  const allow = getGoogleAudienceAllowlist()
  if (allow.length === 0) return false
  const values = Array.isArray(aud) ? aud : [aud]
  return values.some((v) => allow.includes(v))
}

type TokenInfoResponse = {
  iss?: string
  aud?: string
  sub?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  picture?: string
  exp?: string
  error?: string
  error_description?: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function parseEmailVerified(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.toLowerCase() === "true"
  return false
}

function identityFromTokenInfo(info: TokenInfoResponse): GoogleNativeIdentity {
  if (info.error) {
    throw new Error(info.error_description || info.error)
  }
  if (!info.sub || !info.email) {
    throw new Error("Google token missing sub/email")
  }
  const iss = info.iss || ""
  if (
    iss !== "https://accounts.google.com" &&
    iss !== "accounts.google.com"
  ) {
    throw new Error("Invalid Google token issuer")
  }
  if (!isAllowedGoogleAudience(info.aud)) {
    throw new Error("Google token audience not allowed")
  }
  if (info.exp) {
    const expMs = Number(info.exp) * 1000
    if (!Number.isFinite(expMs) || expMs <= Date.now()) {
      throw new Error("Google token expired")
    }
  }
  const emailVerified = parseEmailVerified(info.email_verified)
  if (!emailVerified) {
    throw new Error("Google email not verified")
  }
  return {
    sub: info.sub,
    email: normalizeEmail(info.email),
    emailVerified,
    name: (info.name || info.email.split("@")[0] || "Usuario").trim(),
    image: info.picture || undefined,
  }
}

async function verifyIdToken(idToken: string): Promise<GoogleNativeIdentity> {
  const url = `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`
  const res = await fetch(url, { method: "GET", cache: "no-store" })
  const info = (await res.json()) as TokenInfoResponse
  if (!res.ok) {
    throw new Error(info.error_description || info.error || "Invalid Google idToken")
  }
  return identityFromTokenInfo(info)
}

async function exchangeServerAuthCode(
  serverAuthCode: string
): Promise<GoogleNativeIdentity> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error("Google web OAuth credentials not configured")
  }

  const body = new URLSearchParams({
    code: serverAuthCode,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    // Google Sign-In serverAuthCode exchange uses empty redirect_uri.
    redirect_uri: "",
  })

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
  const tokenJson = (await tokenRes.json()) as {
    id_token?: string
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!tokenRes.ok) {
    throw new Error(
      tokenJson.error_description || tokenJson.error || "serverAuthCode exchange failed"
    )
  }

  if (tokenJson.id_token) {
    return verifyIdToken(tokenJson.id_token)
  }

  if (!tokenJson.access_token) {
    throw new Error("Google token exchange returned no id_token/access_token")
  }

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    cache: "no-store",
  })
  const profile = (await userRes.json()) as {
    sub?: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
    error?: string
  }
  if (!userRes.ok || !profile.sub || !profile.email) {
    throw new Error(profile.error || "Failed to load Google userinfo")
  }
  if (profile.email_verified === false) {
    throw new Error("Google email not verified")
  }
  return {
    sub: profile.sub,
    email: normalizeEmail(profile.email),
    emailVerified: profile.email_verified !== false,
    name: (profile.name || profile.email.split("@")[0] || "Usuario").trim(),
    image: profile.picture || undefined,
  }
}

export async function resolveGoogleNativeIdentity(input: {
  idToken?: string
  serverAuthCode?: string
}): Promise<GoogleNativeIdentity> {
  const idToken = input.idToken?.trim()
  const serverAuthCode = input.serverAuthCode?.trim()
  if (serverAuthCode) {
    return exchangeServerAuthCode(serverAuthCode)
  }
  if (idToken) {
    return verifyIdToken(idToken)
  }
  throw new Error("idToken or serverAuthCode required")
}

export async function upsertUserFromGoogleIdentity(
  identity: GoogleNativeIdentity
): Promise<IUser> {
  await connectDB()
  const email = normalizeEmail(identity.email)
  const role = ADMIN_EMAILS.includes(email) ? "admin" : "user"

  const existing = await User.findOne({ email })
  if (existing) {
    existing.name = identity.name || existing.name
    if (identity.image) existing.image = identity.image
    if (role === "admin" && existing.role !== "admin") {
      existing.role = "admin"
    }
    await existing.save()
    return existing
  }

  return User.create({
    email,
    name: identity.name,
    image: identity.image,
    role,
  })
}

export async function createNativeGoogleGrant(userId: string): Promise<string> {
  await connectDB()
  const code = crypto.randomBytes(32).toString("hex")
  await NativeGoogleGrant.create({
    code,
    userId,
    expiresAt: new Date(Date.now() + GRANT_TTL_MS),
    used: false,
  })
  return code
}

export async function consumeNativeGoogleGrant(
  grant: string
): Promise<{ id: string; email: string; name: string; image?: string } | null> {
  const code = grant?.trim()
  if (!code || code.length < 32) return null

  await connectDB()
  const doc = await NativeGoogleGrant.findOneAndUpdate(
    {
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    },
    { $set: { used: true } },
    { new: true }
  )
  if (!doc) return null

  const user = await User.findById(doc.userId)
  if (!user) return null

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    image: user.image,
  }
}
