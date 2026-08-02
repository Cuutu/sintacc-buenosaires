import { signIn } from "next-auth/react"
import { isNativeApp } from "@/lib/native-app"

function sanitizeCallbackPath(path: string): string {
  if (path.startsWith("/") && !path.startsWith("//")) return path
  return "/perfil"
}

/** Google OAuth en app nativa: browser externo + deep link con handoff de sesión. */
export async function signInWithGoogle(callbackUrl = "/perfil") {
  const safeCallback = sanitizeCallbackPath(callbackUrl)

  if (!isNativeApp()) {
    return signIn("google", { callbackUrl: safeCallback })
  }

  const { Browser } = await import("@capacitor/browser")
  const origin = window.location.origin
  const returnPath = `/auth/mobile-return?next=${encodeURIComponent(safeCallback)}`
  const signInUrl = `${origin}/api/auth/signin/google?callbackUrl=${encodeURIComponent(returnPath)}`

  await Browser.open({ url: signInUrl, presentationStyle: "popover" })
}
