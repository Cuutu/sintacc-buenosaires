"use client"

import { useEffect, useRef, useState } from "react"
import { isNativeApp } from "@/lib/native-app"
import { cleanupNativeCelimapServiceWorkers } from "@/lib/native-sw-cleanup"

export type RuntimeShell = "native" | "web" | "unknown"

/**
 * native = Capacitor / CelimapNative confirmado.
 * web = navegador/PWA.
 * unknown = sin window (SSR) → no registrar.
 */
export function resolveRuntimeShell(): RuntimeShell {
  if (typeof window === "undefined") return "unknown"
  if (isNativeApp()) return "native"
  return "web"
}

/**
 * Web/PWA: registra /sw.js manualmente (next-pwa register:false).
 * Nativo: no registra; cleanup + máx. 1 reload/versión.
 * Update: registration.waiting → aviso; SKIP_WAITING solo al aceptar.
 */
export function PwaRegister() {
  const [updateReady, setUpdateReady] = useState(false)
  const regRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadArmed = useRef(false)

  useEffect(() => {
    let cancelled = false
    let pollId: number | undefined

    const run = async () => {
      try {
        const shell = resolveRuntimeShell()
        if (shell === "unknown") return
        if (shell === "native") {
          const result = await cleanupNativeCelimapServiceWorkers()
          if (cancelled) return
          if (result.shouldReload && !reloadArmed.current) {
            reloadArmed.current = true
            const skip =
              typeof window !== "undefined" &&
              Boolean(
                (window as Window & { __CELIMAP_E2E_SKIP_NATIVE_RELOAD__?: boolean })
                  .__CELIMAP_E2E_SKIP_NATIVE_RELOAD__
              )
            if (!skip) {
              window.location.reload()
            }
          }
          return
        }
        if (!("serviceWorker" in navigator)) return

        let reg = await navigator.serviceWorker.getRegistration("/")
        if (cancelled) return
        if (!reg) {
          reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
        }
        if (cancelled || !reg) return
        regRef.current = reg

        const syncWaiting = () => {
          if (reg?.waiting) setUpdateReady(true)
        }
        syncWaiting()

        reg.addEventListener("updatefound", () => {
          const installing = reg!.installing
          if (!installing) return
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true)
            }
          })
        })

        pollId = window.setInterval(syncWaiting, 30_000)
      } catch {
        /* nunca romper arranque */
      }
    }

    void run()
    return () => {
      cancelled = true
      if (pollId) window.clearInterval(pollId)
    }
  }, [])

  const acceptUpdate = () => {
    const waiting = regRef.current?.waiting
    if (!waiting || reloadArmed.current) return
    reloadArmed.current = true
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.location.reload()
      },
      { once: true }
    )
    waiting.postMessage({ type: "SKIP_WAITING" })
  }

  if (!updateReady) return null

  return (
    <div
      role="status"
      data-testid="sw-update-banner"
      className="fixed left-2 right-2 top-[max(0.5rem,env(safe-area-inset-top))] z-[95] mx-auto flex max-w-md items-center justify-between gap-2 rounded-xl border border-olive/15 bg-cream px-3 py-2 text-sm text-olive shadow-soft"
    >
      <span>Hay una actualización disponible</span>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
          onClick={acceptUpdate}
        >
          Actualizar
        </button>
        <button
          type="button"
          className="rounded-full border border-olive/20 px-2.5 py-1 text-xs"
          onClick={() => setUpdateReady(false)}
        >
          Después
        </button>
      </div>
    </div>
  )
}

/** Banner si chunk reload ya se agotó (sin loop). */
export function ChunkLoadFallbackBanner({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show)
  useEffect(() => {
    setVisible(show)
  }, [show])
  if (!visible) return null
  return (
    <div
      role="alert"
      data-testid="chunk-load-fallback"
      className="fixed bottom-24 left-2 right-2 z-[90] mx-auto max-w-md rounded-xl border border-amber-500/40 bg-[#12180f]/95 px-3 py-2 text-center text-sm text-amber-100 shadow-lg"
    >
      No pudimos cargar una parte de la app. Tocá reintentar o volvé al inicio.
      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
        <button
          type="button"
          className="rounded-full border border-olive/20 px-3 py-1 text-xs font-semibold"
          onClick={() => window.location.assign("/")}
        >
          Ir al inicio
        </button>
        <button
          type="button"
          className="rounded-full border border-olive/20 px-3 py-1 text-xs font-semibold"
          onClick={() => setVisible(false)}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
