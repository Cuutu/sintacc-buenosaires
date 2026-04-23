"use client"

import { useEffect, useMemo, useState } from "react"

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const DISMISSED_KEY = "pwa_install_prompt_dismissed_v1"

function isStandalone() {
  if (typeof window === "undefined") return false
  const mql = window.matchMedia?.("(display-mode: standalone)")
  const iosStandalone = typeof navigator !== "undefined" && (navigator as any).standalone
  return Boolean(mql?.matches || iosStandalone)
}

function isIOS() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
}

export function InstallPrompt() {
  const [open, setOpen] = useState(false)
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [autoShowReady, setAutoShowReady] = useState(false)

  const canShow = useMemo(() => {
    if (typeof window === "undefined") return false
    if (isStandalone()) return false
    if (localStorage.getItem(DISMISSED_KEY) === "1") return false
    return true
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setAutoShowReady(true), 5000)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      // Chrome Android fires this when installable.
      e.preventDefault?.()
      setDeferred(e as BIPEvent)
    }
    window.addEventListener("beforeinstallprompt", handler as EventListener)
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener)
  }, [])

  useEffect(() => {
    if (!canShow) return
    if (!autoShowReady) return

    // Android: only show when prompt available. iOS: show instruction card.
    if (deferred || isIOS()) setOpen(true)
  }, [autoShowReady, canShow, deferred])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1")
    } catch {}
    setOpen(false)
  }

  const install = async () => {
    if (!deferred) return
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === "accepted") {
        setOpen(false)
      } else {
        dismiss()
      }
    } catch {
      dismiss()
    }
  }

  if (!open) return null

  const ios = isIOS()

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/40"
        onClick={dismiss}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-4 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Instalar Celimap</div>
            <div className="mt-1 text-sm text-white/80">
              {ios
                ? "En iPhone: tocá Compartir y elegí “Agregar a pantalla de inicio”."
                : "Instalá app para abrir más rápido, como app nativa."}
            </div>
          </div>
          <button
            className="rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10"
            onClick={dismiss}
          >
            X
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
            onClick={dismiss}
          >
            Ahora no
          </button>
          {!ios && (
            <button
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              onClick={install}
            >
              Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

