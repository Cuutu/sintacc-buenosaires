/**
 * Capgo @capgo/capacitor-social-login@8.3.39 — Apple authorization code extraction.
 *
 * Evidence (ios/.../AppleProvider.swift + SocialLoginPlugin.swift):
 * - useProperTokenExchange=false (CeliMap default):
 *   authorizationCode = nil
 *   accessToken.token = raw Apple authorization code (NOT a JWT, NOT an API access token)
 * - useProperTokenExchange=true:
 *   authorizationCode = raw Apple authorization code
 *   accessToken = nil (until exchanged)
 *
 * JS bridge resolves: { provider:"apple", result: { idToken, accessToken?, authorizationCode?, profile } }
 */

export type CapgoAppleLoginResult = {
  idToken?: string | null
  authorizationCode?: string | null
  accessToken?: { token?: string | null } | null
}

export type AppleAuthorizationCodeExtract =
  | { ok: true; code: string; source: "authorizationCode" | "accessToken.token" }
  | { ok: false; reason: "missing" | "empty" | "wrong_type" | "looks_like_jwt" }

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

/** Apple auth codes are opaque; JWTs have 3 base64url segments. Never treat idToken as code. */
function looksLikeJwt(value: string): boolean {
  const parts = value.split(".")
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

/**
 * Canonical for Capgo 8.3.39:
 * 1) `authorizationCode` when present (proper token exchange mode)
 * 2) else legacy `accessToken.token` when useProperTokenExchange=false
 */
export function extractAppleAuthorizationCode(
  result: CapgoAppleLoginResult | null | undefined
): AppleAuthorizationCodeExtract {
  if (!result || typeof result !== "object") {
    return { ok: false, reason: "missing" }
  }

  if (
    result.authorizationCode !== undefined &&
    result.authorizationCode !== null
  ) {
    if (typeof result.authorizationCode !== "string") {
      return { ok: false, reason: "wrong_type" }
    }
    const code = result.authorizationCode.trim()
    if (!code) return { ok: false, reason: "empty" }
    if (looksLikeJwt(code)) return { ok: false, reason: "looks_like_jwt" }
    return { ok: true, code, source: "authorizationCode" }
  }

  const token = result.accessToken?.token
  if (token !== undefined && token !== null) {
    if (typeof token !== "string") {
      return { ok: false, reason: "wrong_type" }
    }
    const code = token.trim()
    if (!code) return { ok: false, reason: "empty" }
    if (looksLikeJwt(code)) return { ok: false, reason: "looks_like_jwt" }
    // Never use idToken even if accessToken missing
    if (isNonEmptyString(result.idToken) && code === result.idToken.trim()) {
      return { ok: false, reason: "looks_like_jwt" }
    }
    return { ok: true, code, source: "accessToken.token" }
  }

  return { ok: false, reason: "missing" }
}

/** Convenience for call sites that only need the string. */
export function extractAppleAuthorizationCodeString(
  result: CapgoAppleLoginResult | null | undefined
): string | undefined {
  const extracted = extractAppleAuthorizationCode(result)
  return extracted.ok ? extracted.code : undefined
}
