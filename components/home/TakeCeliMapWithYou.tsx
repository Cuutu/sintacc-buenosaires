"use client"

import { useEffect, useState } from "react"
import { isNativeApp } from "@/lib/native-app"
import {
  CELIMAP_APP_STORE_URL,
  getDevicePlatform,
  isStandaloneDisplay,
  type DevicePlatform,
} from "@/lib/device-platform"
import { initPwaInstallCapture, promptPwaInstall, subscribePwaInstall } from "@/lib/pwa-install"

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.8 6.3c.6-.8 1.1-1.9.9-3-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.3-.6 3-1.4z" />
    </svg>
  )
}

export function TakeCeliMapWithYou() {
  const [platform, setPlatform] = useState<DevicePlatform>("desktop")
  const [canInstall, setCanInstall] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    initPwaInstallCapture()
    if (isNativeApp() || isStandaloneDisplay()) {
      setHidden(true)
      return
    }
    setHidden(false)
    setPlatform(getDevicePlatform())
    return subscribePwaInstall(setCanInstall)
  }, [])

  if (hidden) return null

  return (
    <section aria-labelledby="take-celimap-heading" className="px-4 pb-10 pt-2 md:pb-12">
      <div className="container mx-auto max-w-5xl">
        <div className="mx-auto max-w-[760px] rounded-[24px] border border-[#E8E1D6] bg-[#FDFBF7] px-5 py-6 md:px-8 md:py-7">
          <h2
            id="take-celimap-heading"
            className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#2D4A34] md:text-2xl"
          >
            Llevá CeliMap con vos
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#55635A] md:text-base">
            El mapa sin gluten, siempre a mano.
          </p>

          {platform === "ios" ? (
            <div className="mt-5">
              <a
                href={CELIMAP_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2D4A34] px-4 text-sm font-semibold text-[#F7F3EB] transition-colors hover:bg-[#234A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/40 sm:w-auto"
              >
                <AppleGlyph />
                Descargar en App Store
              </a>
            </div>
          ) : platform === "android" ? (
            <div className="mt-5">
              {canInstall ? (
                <button
                  type="button"
                  onClick={() => {
                    void promptPwaInstall()
                  }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#2D4A34] px-4 text-sm font-semibold text-[#F7F3EB] transition-colors hover:bg-[#234A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/40 sm:w-auto"
                >
                  Instalar CeliMap
                </button>
              ) : (
                <p className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] px-4 text-sm font-medium text-[#6B746C] sm:w-auto">
                  Android
                  <span className="rounded-full bg-[#E8E1D6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2D4A34]">
                    Próximamente
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={CELIMAP_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2D4A34] px-4 text-sm font-semibold text-[#F7F3EB] transition-colors hover:bg-[#234A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/40"
              >
                <AppleGlyph />
                Descargar en App Store
              </a>
              <p className="text-xs leading-relaxed text-[#6B746C]">
                App oficial en el App Store. En Android, la app nativa llega pronto.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
