import crypto from "crypto"
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose"
import connectDB from "@/lib/mongodb"
import { User, type IUser } from "@/models/User"
import { NativeAppleChallenge } from "@/models/NativeAppleChallenge"
import { NativeAppleGrant } from "@/models/NativeAppleGrant"

export const NATIVE_APPLE_GRANT_TTL_MS = 120_000
export const NATIVE_APPLE_CHALLENGE_TTL_MS = 120_000
export const APPLE_ISSUER = "https://appleid.apple.com"
export const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
export const DEFAULT_APPLE_AUDIENCE = "com.celimap.app"

const ADMIN_EMAILS =
  process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || []

/** Apple enabled by default (required for App Store 4.8); set NATIVE_APPLE_AUTH_ENABLED=0 to disable. */
export function isNativeAppleAuthEnabled(): boolean {
  const flag = process.env.NATIVE_APPLE_AUTH_ENABLED
  if (flag === "0" || flag === "false") return false
  if (flag === "1" || flag === "true") return true
  return true
}

export function getAppleAudienceAllowlist(): string[] {
  // Native iOS JWT aud is the app bundle id. Never put a Sign in with Apple *Services ID*
  // (web) here — that is a different OAuth client. Empty APPLE_CLIENT_ID is ignored.
  const ids = [
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_BUNDLE_ID,
    DEFAULT_APPLE_AUDIENCE,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
  // Always keep default bundle audience even if env overrides are set.
  if (!ids.includes(DEFAULT_APPLE_AUDIENCE)) {
    ids.push(DEFAULT_APPLE_AUDIENCE)
  }
  return [...new Set(ids)]
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex")
}

/**
 * Capgo iOS AppleProvider sets `request.nonce = payload.nonce` without hashing.
 * Apple/Firebase convention: pass SHA-256(hex) of the raw nonce to the request;
 * the same hash appears in the identity token `nonce` claim.
 */
export function appleRequestNonceFromRaw(rawNonce: string): string {
  return sha256Hex(rawNonce)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Strict Apple email_verified: only boolean true or string "true". */
export function isAppleEmailVerifiedClaim(value: unknown): boolean {
  return value === true || value === "true"
}

export type AppleNativeIdentity = {
  sub: string
  email?: string
  emailVerified: boolean
  givenName?: string
  familyName?: string
}

export class AppleAuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_token"
      | "invalid_nonce"
      | "challenge_expired"
      | "challenge_reused"
      | "email_other_provider"
      | "missing_sub"
      | "email_unverified"
  ) {
    super(message)
    this.name = "AppleAuthError"
  }
}

let appleJwks: JWTVerifyGetKey | null = null

export function getAppleJwks(): JWTVerifyGetKey {
  if (!appleJwks) {
    appleJwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL))
  }
  return appleJwks
}

/** Test helper — reset cached JWKS between suites. */
export function __resetAppleJwksForTests() {
  appleJwks = null
}

export type VerifyAppleIdTokenOptions = {
  idToken: string
  expectedNonceHash: string
  now?: number
  getKey?: JWTVerifyGetKey
}

export async function verifyAppleIdToken(
  options: VerifyAppleIdTokenOptions
): Promise<AppleNativeIdentity> {
  const { idToken, expectedNonceHash } = options
  if (!idToken || idToken.length > 8192) {
    throw new AppleAuthError("Invalid Apple idToken", "invalid_token")
  }

  const audience = getAppleAudienceAllowlist()
  let payload: JWTPayload
  try {
    const verified = await jwtVerify(idToken, options.getKey ?? getAppleJwks(), {
      issuer: APPLE_ISSUER,
      audience,
      clockTolerance: 60,
      currentDate: options.now ? new Date(options.now) : undefined,
    })
    payload = verified.payload
  } catch {
    throw new AppleAuthError("Apple idToken verification failed", "invalid_token")
  }

  const sub = typeof payload.sub === "string" ? payload.sub.trim() : ""
  if (!sub || sub.length > 128) {
    throw new AppleAuthError("Apple token missing sub", "missing_sub")
  }

  const tokenNonce =
    typeof payload.nonce === "string" ? payload.nonce.trim().toLowerCase() : ""
  if (!tokenNonce || tokenNonce !== expectedNonceHash.toLowerCase()) {
    throw new AppleAuthError("Apple nonce mismatch", "invalid_nonce")
  }

  const email =
    typeof payload.email === "string" && payload.email.trim()
      ? normalizeEmail(payload.email)
      : undefined

  // When Apple includes email, require an explicit verified claim (true / "true" only).
  // Subsequent logins often omit email entirely — identity is appleSub, not email.
  if (email) {
    if (!isAppleEmailVerifiedClaim(payload.email_verified)) {
      throw new AppleAuthError("Apple email not verified", "email_unverified")
    }
    return { sub, email, emailVerified: true }
  }

  return { sub, email: undefined, emailVerified: false }
}

export async function createNativeAppleChallenge(): Promise<{
  challengeId: string
  nonce: string
  expiresInSec: number
}> {
  await connectDB()
  const challengeId = crypto.randomBytes(24).toString("hex")
  const nonce = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + NATIVE_APPLE_CHALLENGE_TTL_MS)
  await NativeAppleChallenge.create({
    challengeId,
    nonceRaw: nonce,
    expiresAt,
    used: false,
  })
  return {
    challengeId,
    nonce,
    expiresInSec: Math.floor(NATIVE_APPLE_CHALLENGE_TTL_MS / 1000),
  }
}

export async function consumeNativeAppleChallenge(
  challengeId: string
): Promise<{ nonceRaw: string }> {
  const id = challengeId?.trim()
  if (!id || id.length < 16) {
    throw new AppleAuthError("Invalid challenge", "challenge_expired")
  }
  await connectDB()

  const alreadyUsed = await NativeAppleChallenge.findOne({
    challengeId: id,
    used: true,
  }).lean()
  if (alreadyUsed) {
    throw new AppleAuthError("Apple challenge already used", "challenge_reused")
  }

  const doc = await NativeAppleChallenge.findOneAndUpdate(
    {
      challengeId: id,
      used: false,
      expiresAt: { $gt: new Date() },
    },
    { $set: { used: true } },
    { new: true }
  )
  if (!doc) {
    throw new AppleAuthError(
      "Apple challenge expired or missing",
      "challenge_expired"
    )
  }
  return { nonceRaw: doc.nonceRaw }
}

function buildDisplayName(
  givenName?: string | null,
  familyName?: string | null,
  email?: string
): string {
  const parts = [givenName?.trim(), familyName?.trim()].filter(Boolean)
  if (parts.length) return parts.join(" ")
  if (email) return email.split("@")[0] || "Usuario"
  return "Usuario Apple"
}

function syntheticAppleEmail(sub: string): string {
  const digest = sha256Hex(sub).slice(0, 32)
  return `apple-${digest}@privaterelay.celimap.internal`
}

export async function upsertUserFromAppleIdentity(
  identity: AppleNativeIdentity,
  profileHint?: { givenName?: string | null; familyName?: string | null }
): Promise<IUser> {
  await connectDB()
  const sub = identity.sub
  const givenName = profileHint?.givenName
  const familyName = profileHint?.familyName
  const displayName = buildDisplayName(givenName, familyName, identity.email)

  const bySub = await User.findOne({ appleSub: sub })
  if (bySub) {
    if ((givenName || familyName) && bySub.name === "Usuario Apple") {
      bySub.name = displayName
    }
    if (ADMIN_EMAILS.includes(bySub.email) && bySub.role !== "admin") {
      bySub.role = "admin"
    }
    await bySub.save()
    return bySub
  }

  const email = identity.email || syntheticAppleEmail(sub)
  const existingEmail = await User.findOne({ email })
  if (existingEmail) {
    if (existingEmail.appleSub && existingEmail.appleSub !== sub) {
      throw new AppleAuthError(
        "Email already linked to another Apple account",
        "email_other_provider"
      )
    }
    if (!existingEmail.appleSub) {
      throw new AppleAuthError(
        "Email already registered with another sign-in method",
        "email_other_provider"
      )
    }
  }

  const role = ADMIN_EMAILS.includes(email) ? "admin" : "user"

  try {
    return await User.create({
      email,
      name: displayName,
      appleSub: sub,
      role,
    })
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: number }).code
        : undefined
    if (code === 11000) {
      const again = await User.findOne({ appleSub: sub })
      if (again) return again
      throw new AppleAuthError(
        "Email already registered with another sign-in method",
        "email_other_provider"
      )
    }
    throw err
  }
}

export async function createNativeAppleGrant(userId: string): Promise<string> {
  await connectDB()
  const code = crypto.randomBytes(32).toString("hex")
  await NativeAppleGrant.create({
    code,
    userId,
    expiresAt: new Date(Date.now() + NATIVE_APPLE_GRANT_TTL_MS),
    used: false,
  })
  return code
}

export async function consumeNativeAppleGrant(
  grant: string
): Promise<{ id: string; email: string; name: string; image?: string } | null> {
  const code = grant?.trim()
  if (!code || code.length < 32) return null

  await connectDB()
  const doc = await NativeAppleGrant.findOneAndUpdate(
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

export async function completeNativeAppleSignIn(input: {
  challengeId: string
  idToken: string
  givenName?: string | null
  familyName?: string | null
  getKey?: JWTVerifyGetKey
}): Promise<{ grant: string }> {
  const { nonceRaw } = await consumeNativeAppleChallenge(input.challengeId)
  const expectedNonceHash = appleRequestNonceFromRaw(nonceRaw)
  const identity = await verifyAppleIdToken({
    idToken: input.idToken,
    expectedNonceHash,
    getKey: input.getKey,
  })

  const user = await upsertUserFromAppleIdentity(identity, {
    givenName: input.givenName,
    familyName: input.familyName,
  })
  const grant = await createNativeAppleGrant(user._id.toString())
  return { grant }
}
