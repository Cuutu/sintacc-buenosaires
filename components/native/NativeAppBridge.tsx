"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { isNativeApp } from "@/lib/native-app"
import { createLaunchUrlHandler } from "@/lib/native-handoff-once"
import { reportNativeOAuth } from "@/lib/native-oauth-report"
import { warmNativeGoogleSignIn } from "@/lib/native-sign-in"
import { executeAndroidBack } from "@/lib/native-android-back"

/**
 * Native shell bridge: OAuth deep links (cold + warm) + Android back.
 * Login nativo Google no usa Browser; este path cubre binarios viejos y fallback.
 */
export function NativeAppBridge() {
  const router = useRouter()
  const closingBrowserRef = useRef(false)

  useEffect(() => {
    if (!isNativeApp()) return

    void warmNativeGoogleSignIn().catch((error) => {
      console.warn("SocialLogin warm-init failed:", error)
    })

    let cancelled = false

    const handleLaunchUrl = createLaunchUrlHandler({
      isCancelled: () => cancelled,
      onClaimed: () => {
        reportNativeOAuth("native-oauth-session-ready", {
          route: "/api/auth/handoff",
          deepLink: true,
          browser: true,
        })
      },
      closeBrowser: async () => {
        if (closingBrowserRef.current) return
        closingBrowserRef.current = true
        try {
          const { Browser } = await import("@capacitor/browser")
          await Browser.close()
        } finally {
          closingBrowserRef.current = false
        }
      },
      assign: (href) => {
        window.location.assign(href)
      },
    })

    const runAndroidBack = (canGoBack: boolean) => {
      executeAndroidBack({
        canGoBack,
        href: window.location.href,
        onCloseMapList: (path) => {
          router.replace(path, { scroll: false })
        },
        onHistoryBack: () => {
          window.history.back()
        },
        onMinimize: () => {
          void import("@capacitor/app").then(({ App }) => {
            void App.minimizeApp()
          })
        },
      })
    }

    let removeListeners: (() => void) | undefined

    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return
      const pending: Array<Promise<{ remove: () => Promise<void> }>> = []

      pending.push(
        App.addListener("appUrlOpen", async ({ url }) => {
          await handleLaunchUrl(url)
        })
      )

      pending.push(
        App.addListener("backButton", ({ canGoBack }) => {
          runAndroidBack(canGoBack)
        })
      )

      void App.getLaunchUrl()
        .then((launch) => {
          if (cancelled) return
          if (!launch?.url) return
          return handleLaunchUrl(launch.url)
        })
        .catch(() => undefined)

      removeListeners = () => {
        pending.forEach((handle) => {
          void handle.then((listener) => listener.remove())
        })
      }
    })

    return () => {
      cancelled = true
      removeListeners?.()
    }
  }, [router])

  return null
}
