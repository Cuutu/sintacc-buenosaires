"use client"

import { useEffect } from "react"
import { isNativeApp } from "@/lib/native-app"

/**
 * StatusBar Capacitor — solo shell nativo (no Safari / PWA / web).
 *
 * Política B (edge-to-edge):
 * - overlay: true → WebView bajo status bar; env(safe-area-inset-*) > 0 con viewport-fit=cover.
     * - CSS (tokens --safe-area-*) compensa layout; NO mezclar inset nativo con el mismo padding CSS.
 *
 * iOS: Style.Dark = iconos claros; backgroundColor casi no-op con overlay.
 * Android (Cap 8 / targetSdk 36): overlay true dibuja bajo status/nav; setBackgroundColor
 *   puede teñir la barra nativa pero insets siguen viniendo de CSS.
 *
 * Strict Mode: módulo guarda configured / inFlight → una sola secuencia efectiva.
 */

let configured = false
let inFlight: Promise<void> | null = null

export function __resetNativeStatusBarForTests() {
  configured = false
  inFlight = null
}

export function NativeStatusBar() {
  useEffect(() => {
    if (!isNativeApp()) return
    if (configured) return

    let cancelled = false

    const run = async () => {
      if (inFlight) {
        await inFlight
        return
      }

      inFlight = (async () => {
        try {
          const mod = await import("@capacitor/status-bar")
          if (cancelled || configured) return

          const { StatusBar, Style } = mod

          // Edge-to-edge primero: insets CSS disponibles antes de pintar chrome.
          await StatusBar.setOverlaysWebView({ overlay: true })
          if (cancelled) return

          await StatusBar.setStyle({ style: Style.Dark })
          if (cancelled) return

          try {
            await StatusBar.setBackgroundColor({ color: "#0b1220" })
          } catch {
            // Algunos builds iOS ignoran background con overlay.
          }

          configured = true
        } catch {
          // Plugin ausente / bridge viejo — layout CSS sigue válido.
        } finally {
          inFlight = null
        }
      })()

      await inFlight
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
