import { signIn } from "next-auth/react"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import { isNativeApp, isNativeIosApp } from "@/lib/native-app"
import { reportNativeOAuth } from "@/lib/native-oauth-report"
import { appleRequestNonceFromRaw } from "@/lib/native-apple-auth-client"
import { extractAppleAuthorizationCodeString } from "@/lib/apple-authorization-code"

const PROD_ORIGIN = "https://www.celimap.com.ar"

/** Public OAuth client IDs (safe in client bundle). Env overrides preferred. */
const DEFAULT_WEB_CLIENT_ID =
  "162365902973-g8an5g38ua9ch83o77e1qfmc5etq325l.apps.googleusercontent.com"
const DEFAULT_IOS_CLIENT_ID =
  "162365902973-ffml8h7qtolnmkgddd9dl0iv9a3i0fmo.apps.googleusercontent.com"

let socialLoginInit: Promise<void> | null = null

/** Test helper — reset Capgo init between suites. */
export function __resetNativeSocialLoginForTests() {
  socialLoginInit = null
}

export class NativeAppleSignInError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "cancelled"
      | "network"
      | "challenge"
      | "token"
      | "other_provider"
      | "failed" = "failed"
  ) {
    super(message)
    this.name = "NativeAppleSignInError"
  }
}

export function getNativeGoogleWebClientId(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    DEFAULT_WEB_CLIENT_ID
  )
}

export function getNativeGoogleIosClientId(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
    DEFAULT_IOS_CLIENT_ID
  )
}

/** Origen HTTPS seguro — no aceptar hosts arbitrarios del cliente. */
export function resolveNativeAuthOrigin(
  locationOrigin: string | undefined = typeof window !== "undefined"
    ? window.location.origin
    : undefined
): string {
  if (!locationOrigin) return PROD_ORIGIN
  try {
    const u = new URL(locationOrigin)
    if (u.protocol !== "http:" && u.protocol !== "https:") return PROD_ORIGIN
    const host = u.hostname.toLowerCase()
    if (
      host === "www.celimap.com.ar" ||
      host === "celimap.com.ar" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".vercel.app")
    ) {
      return u.origin
    }
  } catch {
    /* fallthrough */
  }
  return PROD_ORIGIN
}

/** Browser OAuth start URL — fallback for binaries without the native SDK. */
export function buildNativeGoogleStartUrl(
  returnTo: string,
  origin = resolveNativeAuthOrigin()
): string {
  const safe = sanitizeReturnTo(returnTo)
  const params = new URLSearchParams({
    from: "native",
    returnTo: safe,
  })
  return `${origin}/auth/native-start?${params.toString()}`
}

/**
 * Native Google Sign-In only exists in binaries built after the Capgo plugin
 * was added; older TestFlight/Play installs run this same web bundle.
 */
export function hasNativeGoogleSignInPlugin(): boolean {
  if (typeof window === "undefined") return false
  const cap = (
    window as Window & {
      Capacitor?: {
        isPluginAvailable?: (name: string) => boolean
        Plugins?: Record<string, unknown>
      }
    }
  ).Capacitor
  if (!cap) return false
  try {
    if (cap.isPluginAvailable?.("SocialLogin")) return true
  } catch {
    // fall through to registry check
  }
  return Boolean(cap.Plugins?.SocialLogin)
}

/** Warm Google Sign-In plugin (no-op when the binary lacks it). */
export async function warmNativeGoogleSignIn(): Promise<void> {
  if (!hasNativeGoogleSignInPlugin()) return
  await ensureNativeSocialLoginReady()
}

async function ensureNativeSocialLoginReady(): Promise<void> {
  if (!socialLoginInit) {
    socialLoginInit = (async () => {
      const { SocialLogin } = await import("@capgo/capacitor-social-login")
      const webClientId = getNativeGoogleWebClientId()
      const iOSClientId = getNativeGoogleIosClientId()
      // Android: webClientId is the *Web* OAuth client. Do NOT pass an Android
      // client ID here. Play package com.celimap.mobile + SHA-1 live only in Google Cloud.
      await SocialLogin.initialize({
        google: {
          webClientId,
          iOSClientId,
          iOSServerClientId: webClientId,
          mode: "offline",
        },
        // Capgo 8.3.39 iOS: AppleProvider.initialize(redirectUrl?, useProperTokenExchange?).
        // Omitting redirectUrl keeps the provider default (no web redirect path).
        // Do not pass an empty redirectUrl string from JS.
        // clientId is typed for web/Android; on iOS native ASAuthorization it is ignored,
        // but documents the expected JWT audience (bundle id, not a Service ID).
        apple: {
          clientId: "com.celimap.app",
        },
      })
    })().catch((error) => {
      socialLoginInit = null
      throw error
    })
  }
  await socialLoginInit
}

/** @deprecated use ensureNativeSocialLoginReady — kept name for older call sites */
async function ensureNativeGoogleReady(): Promise<void> {
  await ensureNativeSocialLoginReady()
}

type NativeGooglePayload = {
  serverAuthCode?: string
  idToken?: string
}

async function exchangeNativeGoogleForGrant(
  payload: NativeGooglePayload
): Promise<string> {
  const res = await fetch("/api/auth/native/google", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as {
    grant?: string
    error?: string
  }
  if (!res.ok || !data.grant) {
    throw new Error(data.error || `native google HTTP ${res.status}`)
  }
  return data.grant
}

async function signInWithNativeGoogleSdk(callbackUrl: string): Promise<void> {
  const started = Date.now()
  reportNativeOAuth("native-oauth-start", {
    route: "social-login/google",
    browser: false,
  })

  await ensureNativeGoogleReady()
  const { SocialLogin } = await import("@capgo/capacitor-social-login")
  const response = await SocialLogin.login({
    provider: "google",
    options: {
      forceRefreshToken: true,
      scopes: ["email", "profile"],
    },
  })

  if (response.provider !== "google") {
    throw new Error("Unexpected social login provider")
  }

  const result = response.result as {
    serverAuthCode?: string | null
    idToken?: string | null
    responseType?: string
  }

  const serverAuthCode = result.serverAuthCode?.trim() || undefined
  const idToken = result.idToken?.trim() || undefined
  if (!serverAuthCode && !idToken) {
    throw new Error("Google Sign-In returned no serverAuthCode/idToken")
  }

  reportNativeOAuth("native-oauth-sdk-ok", {
    route: "social-login/google",
    browser: false,
    durationMs: Date.now() - started,
  })

  const grant = await exchangeNativeGoogleForGrant({ serverAuthCode, idToken })
  reportNativeOAuth("native-oauth-session-ready", {
    route: "/api/auth/native/google",
    browser: false,
    durationMs: Date.now() - started,
  })

  await signIn("native-google", {
    grant,
    callbackUrl,
    redirect: true,
  })
}

const CANCEL_PATTERNS = [
  "cancel",
  "canceled",
  "cancelled",
  "user_cancel",
  "12501",
  "-5",
  "1001", // ASAuthorizationError.canceled
]

function isUserCancellation(error: unknown): boolean {
  const message = (
    error instanceof Error ? error.message : String(error ?? "")
  ).toLowerCase()
  return CANCEL_PATTERNS.some((p) => message.includes(p))
}

/**
 * Sign in with Apple is offered on the iOS Capacitor shell (iPhone and iPad).
 * Visibility must not depend on plugin detection: a missed plugin check hid
 * Apple while Google still rendered via browser OAuth (App Store 4.8).
 */
export function isAppleSignInAvailable(): boolean {
  return isNativeIosApp()
}

export { extractAppleAuthorizationCode, extractAppleAuthorizationCodeString } from "@/lib/apple-authorization-code"

export type AppleReauthForDeletion = {
  challengeId: string
  idToken: string
  authorizationCode?: string
}

/**
 * Re-run Sign in with Apple to obtain identity token + authorization code
 * for Apple /auth/revoke during account deletion. Does not create a new session.
 */
export async function reauthenticateAppleForAccountDeletion(): Promise<AppleReauthForDeletion> {
  if (!isAppleSignInAvailable()) {
    throw new NativeAppleSignInError(
      "Sign in with Apple solo está disponible en la app iOS",
      "failed"
    )
  }

  const { challengeId, nonce: rawNonce } = await fetchAppleChallenge()
  const hashedNonce = await appleRequestNonceFromRaw(rawNonce)

  await ensureNativeSocialLoginReady()
  const { SocialLogin } = await import("@capgo/capacitor-social-login")
  const response = await SocialLogin.login({
    provider: "apple",
    options: {
      scopes: ["email", "name"],
      nonce: hashedNonce,
    },
  })

  if (response.provider !== "apple") {
    throw new NativeAppleSignInError("Unexpected social login provider", "failed")
  }

  const result = response.result
  const idToken = result.idToken?.trim()
  if (!idToken) {
    throw new NativeAppleSignInError(
      "Apple no devolvió identity token",
      "token"
    )
  }

  return {
    challengeId,
    idToken,
    authorizationCode: extractAppleAuthorizationCodeString(result),
  }
}

/** Best-effort native provider logout (local). Does not claim remote token revoke. */
export async function clearNativeSocialSessions(): Promise<void> {
  if (!hasNativeGoogleSignInPlugin()) return
  try {
    await ensureNativeSocialLoginReady()
    const { SocialLogin } = await import("@capgo/capacitor-social-login")
    await SocialLogin.logout({ provider: "google" }).catch(() => undefined)
    if (isNativeIosApp()) {
      await SocialLogin.logout({ provider: "apple" }).catch(() => undefined)
    }
  } catch {
    // ignore — local cleanup best-effort
  }
}

async function fetchAppleChallenge(): Promise<{
  challengeId: string
  nonce: string
}> {
  const res = await fetch("/api/auth/native/apple/challenge", {
    method: "GET",
    credentials: "include",
  })
  const data = (await res.json().catch(() => ({}))) as {
    challengeId?: string
    nonce?: string
    error?: string
  }
  if (!res.ok || !data.challengeId || !data.nonce) {
    throw new NativeAppleSignInError(
      data.error || "No se pudo iniciar Sign in with Apple",
      "challenge"
    )
  }
  return { challengeId: data.challengeId, nonce: data.nonce }
}

async function exchangeNativeAppleForGrant(payload: {
  challengeId: string
  idToken: string
  givenName?: string | null
  familyName?: string | null
}): Promise<string> {
  const res = await fetch("/api/auth/native/apple", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as {
    grant?: string
    error?: string
    code?: string
  }
  if (res.status === 409 || data.code === "email_other_provider") {
    throw new NativeAppleSignInError(
      data.error ||
        "Este email ya está asociado a otra forma de inicio de sesión.",
      "other_provider"
    )
  }
  if (!res.ok || !data.grant) {
    throw new NativeAppleSignInError(
      data.error || `native apple HTTP ${res.status}`,
      res.status === 401 ? "token" : "failed"
    )
  }
  return data.grant
}

/**
 * Sign in with Apple — iOS Capacitor only (APP → Apple sheet → APP).
 * No web Apple flow in this stage.
 */
export async function signInWithApple(callbackUrl = "/perfil") {
  const safeCallback = sanitizeReturnTo(callbackUrl)

  if (!isAppleSignInAvailable()) {
    throw new NativeAppleSignInError(
      "Sign in with Apple solo está disponible en la app iOS",
      "failed"
    )
  }

  const started = Date.now()
  reportNativeOAuth("native-oauth-start", {
    route: "social-login/apple",
    browser: false,
  })

  try {
    const { challengeId, nonce: rawNonce } = await fetchAppleChallenge()
    const hashedNonce = await appleRequestNonceFromRaw(rawNonce)

    await ensureNativeSocialLoginReady()
    const { SocialLogin } = await import("@capgo/capacitor-social-login")
    const response = await SocialLogin.login({
      provider: "apple",
      options: {
        scopes: ["email", "name"],
        nonce: hashedNonce,
      },
    })

    if (response.provider !== "apple") {
      throw new NativeAppleSignInError("Unexpected social login provider", "failed")
    }

    const result = response.result
    const idToken = result.idToken?.trim()
    if (!idToken) {
      throw new NativeAppleSignInError(
        "Apple no devolvió identity token",
        "token"
      )
    }

    reportNativeOAuth("native-oauth-sdk-ok", {
      route: "social-login/apple",
      browser: false,
      durationMs: Date.now() - started,
    })

    const grant = await exchangeNativeAppleForGrant({
      challengeId,
      idToken,
      givenName: result.profile?.givenName ?? null,
      familyName: result.profile?.familyName ?? null,
    })

    reportNativeOAuth("native-oauth-session-ready", {
      route: "/api/auth/native/apple",
      browser: false,
      durationMs: Date.now() - started,
    })

    await signIn("native-apple", {
      grant,
      callbackUrl: safeCallback,
      redirect: true,
    })
  } catch (error) {
    if (isUserCancellation(error)) {
      throw new NativeAppleSignInError("Cancelado", "cancelled")
    }
    if (error instanceof NativeAppleSignInError) throw error
    reportNativeOAuth("native-oauth-error", {
      route: "social-login/apple",
      code:
        error instanceof Error
          ? error.message.slice(0, 40)
          : "native_apple_failed",
      browser: false,
    })
    throw new NativeAppleSignInError(
      error instanceof Error
        ? error.message
        : "No pudimos iniciar sesión con Apple",
      "failed"
    )
  }
}

/** Legacy path: system browser → /auth/native-start → deep link handoff. */
async function signInWithBrowserOAuth(callbackUrl: string): Promise<void> {
  const { Browser } = await import("@capacitor/browser")
  const url = buildNativeGoogleStartUrl(callbackUrl)
  reportNativeOAuth("native-oauth-browser-opened", {
    route: "/auth/native-start",
    browser: true,
  })
  await Browser.open({ url, presentationStyle: "popover" })
}

/**
 * Google sign-in:
 * - Web → NextAuth GoogleProvider
 * - Capacitor with SDK → native Google Sign-In → grant → CredentialsProvider
 * - Capacitor without SDK (older binary) → Browser OAuth handoff
 */
export async function signInWithGoogle(callbackUrl = "/perfil") {
  const safeCallback = sanitizeReturnTo(callbackUrl)

  if (!isNativeApp()) {
    return signIn("google", { callbackUrl: safeCallback })
  }

  if (hasNativeGoogleSignInPlugin()) {
    try {
      await signInWithNativeGoogleSdk(safeCallback)
      return
    } catch (error) {
      console.error("Native Google Sign-In failed:", error)
      reportNativeOAuth("native-oauth-error", {
        route: "social-login/google",
        code:
          error instanceof Error
            ? error.message.slice(0, 40)
            : "native_google_failed",
        browser: false,
      })
      // User dismissed the Google sheet: don't push them into Safari.
      if (isUserCancellation(error)) return
    }
  }

  try {
    await signInWithBrowserOAuth(safeCallback)
  } catch (error) {
    console.error("Browser OAuth fallback failed:", error)
    reportNativeOAuth("native-oauth-error", {
      route: "/auth/native-start",
      code: "browser_open_failed",
      browser: false,
    })
    return signIn("google", { callbackUrl: safeCallback })
  }
}
