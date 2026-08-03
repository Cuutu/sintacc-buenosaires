import { signIn } from "next-auth/react"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import { isNativeApp } from "@/lib/native-app"
import { reportNativeOAuth } from "@/lib/native-oauth-report"

const PROD_ORIGIN = "https://www.celimap.com.ar"

/** Public OAuth client IDs (safe in client bundle). Env overrides preferred. */
const DEFAULT_WEB_CLIENT_ID =
  "162365902973-g8an5g38ua9ch83o77e1qfmc5etq325l.apps.googleusercontent.com"
const DEFAULT_IOS_CLIENT_ID =
  "162365902973-ffml8h7qtolnmkgddd9dl0iv9a3i0fmo.apps.googleusercontent.com"

let socialLoginInit: Promise<void> | null = null

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

/**
 * @deprecated Browser OAuth start URL — kept for tests/rollback docs only.
 * Login nativo ya no abre Browser; usa Google Sign-In SDK.
 */
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

/** Warm Google Sign-In plugin (safe to call multiple times). */
export async function warmNativeGoogleSignIn(): Promise<void> {
  await ensureNativeGoogleReady()
}

async function ensureNativeGoogleReady(): Promise<void> {
  if (!socialLoginInit) {
    socialLoginInit = (async () => {
      const { SocialLogin } = await import("@capgo/capacitor-social-login")
      const webClientId = getNativeGoogleWebClientId()
      const iOSClientId = getNativeGoogleIosClientId()
      await SocialLogin.initialize({
        google: {
          webClientId,
          iOSClientId,
          iOSServerClientId: webClientId,
          mode: "offline",
        },
      })
    })().catch((error) => {
      socialLoginInit = null
      throw error
    })
  }
  await socialLoginInit
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

/**
 * Google sign-in:
 * - Web → NextAuth GoogleProvider
 * - Capacitor → native Google Sign-In SDK → grant → CredentialsProvider
 * No Browser.open / Safari sheet for login.
 */
export async function signInWithGoogle(callbackUrl = "/perfil") {
  const safeCallback = sanitizeReturnTo(callbackUrl)

  if (!isNativeApp()) {
    return signIn("google", { callbackUrl: safeCallback })
  }

  try {
    await signInWithNativeGoogleSdk(safeCallback)
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
    throw error
  }
}
