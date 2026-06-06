"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, ExternalLink, PlusSquare, Share2, Smartphone, X } from "lucide-react"
import { cn } from "@/lib/utils"

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const DISMISSED_UNTIL_KEY = "pwa_install_prompt_dismissed_until_v2"
const IOS_GUIDE_KEY = "pwa_install_prompt_ios_guide_seen_v1"
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

function isStandalone() {
  if (typeof window === "undefined") return false
  const mql = window.matchMedia?.("(display-mode: standalone)")
  const iosStandalone = typeof navigator !== "undefined" && (navigator as any).standalone
  return Boolean(mql?.matches || iosStandalone)
}

function getUserAgent() {
  if (typeof navigator === "undefined") return ""
  return navigator.userAgent.toLowerCase()
}

function isIOS() {
  return /iphone|ipad|ipod/.test(getUserAgent())
}

function isSafari() {
  const ua = getUserAgent()
  return /safari/.test(ua) && !/crios|fxios|edgios|opr\//.test(ua)
}

function isMobileDevice() {
  return /android|iphone|ipad|ipod/.test(getUserAgent())
}

function getDismissedUntil() {
  if (typeof localStorage === "undefined") return 0
  const value = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) ?? 0)
  return Number.isFinite(value) ? value : 0
}

function snoozePrompt() {
  try {
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + SNOOZE_MS))
  } catch {}
}

function markIOSGuideSeen() {
  try {
    localStorage.setItem(IOS_GUIDE_KEY, "1")
  } catch {}
}

function hasSeenIOSGuide() {
  try {
    return localStorage.getItem(IOS_GUIDE_KEY) === "1"
  } catch {
    return false
  }
}

export function InstallPrompt() {
  const [open, setOpen] = useState(false)
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [ready, setReady] = useState(false)
  const [dismissedUntil, setDismissedUntil] = useState(0)
  const [installed, setInstalled] = useState(false)

  const ios = useMemo(() => isIOS(), [])
  const safari = useMemo(() => isSafari(), [])
  const mobile = useMemo(() => isMobileDevice(), [])

  useEffect(() => {
    setDismissedUntil(getDismissedUntil())
    const t = window.setTimeout(() => setReady(true), 2500)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault?.()
      setDeferred(event as BIPEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setOpen(false)
    }

    window.addEventListener("beforeinstallprompt", handler as EventListener)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const canShow = useMemo(() => {
    if (!ready) return false
    if (installed || isStandalone()) return false
    if (dismissedUntil > Date.now()) return false
    return Boolean(deferred || ios || mobile)
  }, [deferred, dismissedUntil, installed, ios, mobile, ready])

  useEffect(() => {
    if (!canShow) return
    if (ios && hasSeenIOSGuide()) return
    const t = window.setTimeout(() => setOpen(true), 1200)
    return () => window.clearTimeout(t)
  }, [canShow, ios])

  const dismiss = () => {
    snoozePrompt()
    setDismissedUntil(Date.now() + SNOOZE_MS)
    setOpen(false)
    if (ios) markIOSGuideSeen()
  }

  const install = async () => {
    if (!deferred) {
      setOpen(true)
      return
    }

    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      if (choice.outcome === "accepted") {
        setInstalled(true)
        setOpen(false)
      } else {
        dismiss()
      }
    } catch {
      dismiss()
    }
  }

  if (!canShow) return null

  return (
    <>
      {!open && (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-[440px] md:bottom-5 md:right-5 md:left-auto">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#080c0f]/88 px-4 py-3 text-left text-white shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition active:scale-[0.99] md:w-[360px]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/18 text-primary ring-1 ring-primary/25">
                <Download className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Instalar Celimap</span>
                <span className="block truncate text-xs text-white/68">
                  Acceso rápido desde tu pantalla de inicio
                </span>
              </span>
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              Ver
            </span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 md:items-center">
          <button
            aria-label="Cerrar instalacion"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/12 bg-[#080c0f] text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/18 text-primary ring-1 ring-primary/25">
                  <Smartphone className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <div className="text-base font-semibold">Instalar Celimap</div>
                  <div className="text-sm text-white/64">Abrila como app, sin buscarla en el navegador.</div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                onClick={dismiss}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {deferred ? (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-white/76">
                    Instalá Celimap para entrar directo al mapa, favoritos y sugerencias desde tu inicio.
                  </p>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                    onClick={install}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Instalar ahora
                  </button>
                </div>
              ) : ios ? (
                <div className="space-y-4">
                  {!safari && (
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                      En iPhone funciona mejor desde Safari. Abrí celimap.com.ar en Safari y seguí estos pasos.
                    </div>
                  )}

                  <ol className="space-y-3 text-sm text-white/78">
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold">1</span>
                      <span className="pt-1">Tocá el botón de compartir de Safari.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold">2</span>
                      <span className="flex items-center gap-2 pt-1">
                        Elegí <Share2 className="h-4 w-4 text-primary" aria-hidden /> Agregar a pantalla de inicio.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold">3</span>
                      <span className="flex items-center gap-2 pt-1">
                        Confirmá con <PlusSquare className="h-4 w-4 text-primary" aria-hidden /> Agregar.
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-white/76">
                    Si tu navegador no muestra el botón nativo, abrí el menú del navegador y elegí instalar app o agregar a pantalla de inicio.
                  </p>
                  <div className="flex items-center gap-2 rounded-2xl bg-white/8 px-4 py-3 text-sm text-white/72">
                    <ExternalLink className="h-4 w-4 text-primary" aria-hidden />
                    Buscá “Instalar app” en el menú del navegador.
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                className="flex-1 rounded-2xl bg-white/8 px-4 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/12"
                onClick={dismiss}
              >
                Después
              </button>
              {!deferred && (
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition",
                    ios
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-white/12 text-white hover:bg-white/16"
                  )}
                  onClick={() => {
                    if (ios) markIOSGuideSeen()
                    setOpen(false)
                  }}
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
