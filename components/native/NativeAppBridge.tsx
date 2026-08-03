"use client"

import { useEffect, useRef } from "react"
import { isNativeApp } from "@/lib/native-app"
import { parseNativeAuthHandoffUrl } from "@/lib/native-auth-deeplink"
import { reportNativeOAuth } from "@/lib/native-oauth-report"
import { warmNativeGoogleSignIn } from "@/lib/native-sign-in"

/**
 * Bridge for legacy Browser-OAuth deep links (old TestFlight builds).
 * New login path uses Google Sign-In SDK → grant → NextAuth (no Browser).
 */
export function NativeAppBridge() {
  const seenCodesRef = useRef<Set<string>>(new Set())
  const closingBrowserRef = useRef(false)

  useEffect(() => {
    if (!isNativeApp()) return

    void warmNativeGoogleSignIn().catch((error) => {
      console.warn("SocialLogin warm-init failed:", error)
    })

    let removeListener: (() => void) | undefined

    import("@capacitor/app").then(({ App }) => {
      const listener = App.addListener("appUrlOpen", async ({ url }) => {
        const handoff = parseNativeAuthHandoffUrl(url)
        if (!handoff) return

        if (seenCodesRef.current.has(handoff.code)) return
        seenCodesRef.current.add(handoff.code)

        if (!closingBrowserRef.current) {
          closingBrowserRef.current = true
          try {
            const { Browser } = await import("@capacitor/browser")
            await Browser.close()
          } catch {
            // Browser may already be closed
          } finally {
            closingBrowserRef.current = false
          }
        }

        reportNativeOAuth("native-oauth-session-ready", {
          route: "/api/auth/handoff",
          deepLink: true,
          browser: true,
        })

        const params = new URLSearchParams({
          code: handoff.code,
          next: handoff.next,
        })
        // Full navigation: setea cookie de sesión y redirige a next.
        window.location.assign(`/api/auth/handoff?${params.toString()}`)
      })

      removeListener = () => {
        listener.then((l) => l.remove())
      }
    })

    return () => {
      removeListener?.()
    }
  }, [])

  return null
}
