import { signIn } from "next-auth/react"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import { isNativeApp } from "@/lib/native-app"
import { reportNativeOAuth } from "@/lib/native-oauth-report"

const PROD_ORIGIN = "https://www.celimap.com.ar"

/** Origen HTTPS seguro para Browser.open — no aceptar hosts arbitrarios del cliente. */
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

/** URL que Capacitor Browser debe abrir (sin secretos). */
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

/** Google OAuth: web = signIn; nativo = Browser → /auth/native-start (POST CSRF). */
export async function signInWithGoogle(callbackUrl = "/perfil") {
  const safeCallback = sanitizeReturnTo(callbackUrl)

  if (!isNativeApp()) {
    return signIn("google", { callbackUrl: safeCallback })
  }

  try {
    const { Browser } = await import("@capacitor/browser")
    const url = buildNativeGoogleStartUrl(safeCallback)
    reportNativeOAuth("native-oauth-browser-opened", {
      route: "/auth/native-start",
      browser: true,
    })
    await Browser.open({ url, presentationStyle: "popover" })
  } catch (error) {
    console.error("Native Google sign-in failed, falling back:", error)
    reportNativeOAuth("native-oauth-error", {
      route: "/auth/native-start",
      code: "browser_open_failed",
      browser: false,
    })
    return signIn("google", { callbackUrl: safeCallback })
  }
}
