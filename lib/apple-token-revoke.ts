/**
 * Sign in with Apple token exchange + revoke (server-side).
 * Private key stays in env; client secrets are short-lived and never persisted.
 * No real Apple calls in tests — inject fetch / skip when keys absent.
 */

import crypto from "crypto"
import { SignJWT, importPKCS8 } from "jose"
import { DEFAULT_APPLE_AUDIENCE } from "@/lib/native-apple-auth"

export const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
export const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke"

const CLIENT_SECRET_TTL_SEC = 300 // 5 minutes
const APPLE_HTTP_TIMEOUT_MS = 10_000

export type AppleRevokeCode =
  | "revoked"
  | "already_revoked"
  | "missing_keys"
  | "missing_code"
  | "exchange_failed"
  | "revoke_failed"
  | "timeout"
  | "misconfigured"

export type AppleRevokeResult = {
  ok: boolean
  code: AppleRevokeCode
}

export type AppleTokenDeps = {
  fetchFn?: typeof fetch
  nowSec?: number
}

function normalizePrivateKey(raw: string): string {
  let key = raw.trim()
  // Support .env multiline escaped as \n
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n")
  }
  return key
}

/** Validate PEM shape without logging contents. */
export function assertApplePrivateKeyPemShape(pem: string): boolean {
  const normalized = normalizePrivateKey(pem)
  return (
    normalized.includes("BEGIN PRIVATE KEY") &&
    normalized.includes("END PRIVATE KEY") &&
    normalized.length > 80 &&
    normalized.length < 16_000
  )
}

export function getAppleRevokeClientId(): string {
  return (
    process.env.APPLE_CLIENT_ID?.trim() ||
    process.env.APPLE_BUNDLE_ID?.trim() ||
    DEFAULT_APPLE_AUDIENCE
  )
}

export function isAppleRevokeConfigured(): boolean {
  const pem = process.env.APPLE_PRIVATE_KEY?.trim()
  return Boolean(
    process.env.APPLE_TEAM_ID?.trim() &&
      process.env.APPLE_KEY_ID?.trim() &&
      pem &&
      assertApplePrivateKeyPemShape(pem)
  )
}

/** Build short-lived client_secret JWT (ES256). Never log the key or secret. */
export async function createAppleClientSecret(
  options?: { nowSec?: number }
): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID?.trim()
  const keyId = process.env.APPLE_KEY_ID?.trim()
  const privateKeyPem = process.env.APPLE_PRIVATE_KEY
    ? normalizePrivateKey(process.env.APPLE_PRIVATE_KEY)
    : ""
  const clientId = getAppleRevokeClientId()

  if (!teamId || !keyId || !privateKeyPem) {
    throw new Error("missing_keys")
  }
  if (!assertApplePrivateKeyPemShape(privateKeyPem)) {
    throw new Error("misconfigured")
  }

  const now = options?.nowSec ?? Math.floor(Date.now() / 1000)
  const key = await importPKCS8(privateKeyPem, "ES256")

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + CLIENT_SECRET_TTL_SEC)
    .sign(key)
}

async function appleFormPost(
  url: string,
  body: URLSearchParams,
  fetchFn: typeof fetch
): Promise<{ status: number; text: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), APPLE_HTTP_TIMEOUT_MS)
  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: controller.signal,
    })
    const text = await res.text()
    return { status: res.status, text }
  } finally {
    clearTimeout(timer)
  }
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  id_token?: string
  error?: string
}

/**
 * Exchange authorization_code → tokens, then revoke refresh_token (preferred) or access_token.
 * Never logs tokens.
 */
export async function exchangeAndRevokeAppleAuthorization(
  authorizationCode: string,
  deps: AppleTokenDeps = {}
): Promise<AppleRevokeResult> {
  const code = authorizationCode?.trim()
  if (!code || code.length > 2048) {
    return { ok: false, code: "missing_code" }
  }
  if (!isAppleRevokeConfigured()) {
    return { ok: false, code: "missing_keys" }
  }

  const fetchFn = deps.fetchFn ?? fetch
  let clientSecret: string
  try {
    clientSecret = await createAppleClientSecret({ nowSec: deps.nowSec })
  } catch {
    return { ok: false, code: "missing_keys" }
  }

  const clientId = getAppleRevokeClientId()

  try {
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    })
    const tokenRes = await appleFormPost(APPLE_TOKEN_URL, tokenBody, fetchFn)

    if (tokenRes.status < 200 || tokenRes.status >= 300) {
      return { ok: false, code: "exchange_failed" }
    }

    let parsed: TokenResponse = {}
    try {
      parsed = JSON.parse(tokenRes.text) as TokenResponse
    } catch {
      return { ok: false, code: "exchange_failed" }
    }

    const tokenToRevoke = parsed.refresh_token || parsed.access_token
    const tokenTypeHint = parsed.refresh_token ? "refresh_token" : "access_token"
    if (!tokenToRevoke) {
      return { ok: false, code: "exchange_failed" }
    }

    // Fresh secret for revoke (previous still valid, but keep short-lived usage)
    let revokeSecret: string
    try {
      revokeSecret = await createAppleClientSecret({
        nowSec: (deps.nowSec ?? Math.floor(Date.now() / 1000)) + 1,
      })
    } catch {
      revokeSecret = clientSecret
    }

    const revokeBody = new URLSearchParams({
      client_id: clientId,
      client_secret: revokeSecret,
      token: tokenToRevoke,
      token_type_hint: tokenTypeHint,
    })
    const revokeRes = await appleFormPost(APPLE_REVOKE_URL, revokeBody, fetchFn)

    // Apple returns 200 on success; treat 200 as revoked.
    // Some already-revoked cases may return error — still OK for account deletion.
    if (revokeRes.status === 200) {
      return { ok: true, code: "revoked" }
    }

    let err = ""
    try {
      err = String((JSON.parse(revokeRes.text) as { error?: string }).error || "")
    } catch {
      err = ""
    }
    if (err === "invalid_grant" || revokeRes.status === 400) {
      return { ok: true, code: "already_revoked" }
    }
    return { ok: false, code: "revoke_failed" }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || /aborted|timeout/i.test(error.message))
    ) {
      return { ok: false, code: "timeout" }
    }
    return { ok: false, code: "revoke_failed" }
  } finally {
    // Best-effort: overwrite local refs (JS GC; avoid lingering in closures)
    clientSecret = crypto.randomBytes(8).toString("hex")
  }
}
