"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Download, X } from "lucide-react"
import { isNativeApp } from "@/lib/native-app"
import { isPrivateListPath } from "@/lib/lists/is-private-list-path"
import {
  CELIMAP_APP_STORE_URL,
  getDevicePlatform,
  isStandaloneDisplay,
} from "@/lib/device-platform"
import {
  INSTALL_REQUEST_EVENT,
  canPromptPwaInstall,
  initPwaInstallCapture,
  promptPwaInstall,
} from "@/lib/pwa-install"

const DISMISSED_UNTIL_KEY = "pwa_install_prompt_dismissed_until_v3"
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

function getDismissedUntil() {
  if (typeof localStorage === "undefined") return 0
  const value = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) ?? 0)
  return Number.isFinite(value) ? value : 0
}

function snoozePrompt() {
  try {
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + SNOOZE_MS))
  } catch {
    // ignore
  }
}

export function InstallPrompt() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop")
  const onPrivateList = isPrivateListPath(pathname)

  useEffect(() => {
    initPwaInstallCapture()
    setPlatform(getDevicePlatform())
  }, [])

  useEffect(() => {
    if (onPrivateList || isNativeApp() || isStandaloneDisplay()) {
      setOpen(false)
      return
    }

    const onRequest = () => {
      if (getDismissedUntil() > Date.now()) return
      if (isNativeApp() || isStandaloneDisplay()) return
      setOpen(true)
    }

    window.addEventListener(INSTALL_REQUEST_EVENT, onRequest)
    return () => window.removeEventListener(INSTALL_REQUEST_EVENT, onRequest)
  }, [onPrivateList])

  const dismiss = () => {
    snoozePrompt()
    setOpen(false)
  }

  const installAndroid = async () => {
    const outcome = await promptPwaInstall()
    if (outcome === "accepted") {
      setOpen(false)
      return
    }
    if (outcome === "unavailable") dismiss()
  }

  if (!open || onPrivateList) return null

  const ios = platform === "ios"
  const androidInstallable = platform === "android" && canPromptPwaInstall()

  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center p-3 pb-[calc(var(--bottom-nav-clearance)+0.5rem)] md:items-center md:pb-3">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 z-0 bg-[#2D4A34]/25"
        onClick={dismiss}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-prompt-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#E8E1D6] bg-[#F8F5EF] text-[#2D4A34] shadow-[0_16px_40px_-20px_rgba(45,74,52,0.28)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E8E1D6] px-5 py-4">
          <div>
            <h2 id="install-prompt-title" className="text-base font-semibold">
              {ios ? "Descargá CeliMap" : "Instalá CeliMap"}
            </h2>
            <p className="mt-1 text-sm text-[#5F6B63]">
              {ios
                ? "Tenés la app oficial para iPhone y iPad."
                : "Accedé rápidamente al mapa, favoritos y sugerencias."}
            </p>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#5F6B63] hover:bg-[#1F4D35]/8"
            onClick={dismiss}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex gap-2 px-5 py-4">
          <button
            type="button"
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-[#2D4A34] hover:bg-[#1F4D35]/6"
            onClick={dismiss}
          >
            {ios ? "Ahora no" : "Después"}
          </button>
          {ios ? (
            <a
              href={CELIMAP_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-[#C85A2E] px-4 text-sm font-semibold text-white hover:bg-[#BE552C]"
              onClick={() => setOpen(false)}
            >
              Descargar en App Store
            </a>
          ) : androidInstallable ? (
            <button
              type="button"
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C85A2E] px-4 text-sm font-semibold text-white hover:bg-[#BE552C]"
              onClick={() => {
                void installAndroid()
              }}
            >
              <Download className="h-4 w-4" aria-hidden />
              Instalar ahora
            </button>
          ) : (
            <button
              type="button"
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-[#E8E1D6] px-4 text-sm font-semibold text-[#6B746C]"
              onClick={dismiss}
            >
              Android · Próximamente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
