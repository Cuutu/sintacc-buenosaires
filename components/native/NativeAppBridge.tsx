"use client"

import { useEffect } from "react"
import { isNativeApp } from "@/lib/native-app"

function parseHandoffUrl(url: string): { code: string; next: string } | null {
  if (!url.startsWith("celimap://")) return null

  const rest = url.slice("celimap://".length)
  const queryIndex = rest.indexOf("?")
  const path = queryIndex >= 0 ? rest.slice(0, queryIndex) : rest
  if (path !== "auth/handoff") return null

  const params = new URLSearchParams(
    queryIndex >= 0 ? rest.slice(queryIndex + 1) : ""
  )
  const code = params.get("code")
  if (!code) return null

  const next = params.get("next") ?? "/perfil"
  return { code, next }
}

export function NativeAppBridge() {
  useEffect(() => {
    if (!isNativeApp()) return

    let removeListener: (() => void) | undefined

    import("@capacitor/app").then(({ App }) => {
      const listener = App.addListener("appUrlOpen", async ({ url }) => {
        const handoff = parseHandoffUrl(url)
        if (!handoff) return

        try {
          const { Browser } = await import("@capacitor/browser")
          await Browser.close()
        } catch {
          // Browser may already be closed
        }

        const params = new URLSearchParams({
          code: handoff.code,
          next: handoff.next,
        })
        window.location.href = `/api/auth/handoff?${params.toString()}`
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
