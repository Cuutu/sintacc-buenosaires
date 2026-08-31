"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { claimStoreBannerShownSession } from "@/lib/bottom-prompt"
import { CELIMAP_STORE_URLS } from "@/lib/device-platform"
import { useBottomPrompt } from "@/lib/use-bottom-prompt"

export function StoreAppBanner() {
  const { prompt, browser, store, ready, debugBanner, dismissStore } = useBottomPrompt()
  const [debugHidden, setDebugHidden] = useState(false)
  const shownRef = useRef(false)

  const visible = ready && prompt === "store" && store != null && !debugHidden
  const href = store ? CELIMAP_STORE_URLS[store] : ""

  useEffect(() => {
    if (!visible || !store || debugBanner) return
    if (shownRef.current) return
    if (!claimStoreBannerShownSession()) {
      shownRef.current = true
      return
    }
    shownRef.current = true
    trackEvent("store_banner_shown", { store, browser })
  }, [visible, store, browser, debugBanner])

  if (!visible || !store || !href) return null

  return (
    <div
      role="region"
      aria-label="Abrí CeliMap en la app"
      data-store-banner=""
      data-debug-banner={debugBanner ? "1" : undefined}
      className="pointer-events-auto fixed inset-x-0 z-[70] px-3"
      style={{
        bottom: "calc(var(--bottom-nav-clearance, 0px) + 0.5rem)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] px-3 py-2.5 shadow-[0_12px_32px_-16px_rgba(45,74,52,0.35)]">
        <Image
          src="/brand/app-icon.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-[10px]"
        />
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#2D4A34]">
          Abrí el mapa en la app
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] shrink-0 items-center rounded-xl bg-[#C85A2E] px-3.5 text-sm font-semibold text-white hover:bg-[#BE552C]"
          onClick={() => {
            if (!debugBanner) trackEvent("store_banner_clicked", { store, browser })
          }}
        >
          Abrir
        </a>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#5F6B63] hover:bg-[#1F4D35]/8"
          aria-label="Cerrar"
          onClick={() => {
            if (debugBanner) {
              setDebugHidden(true)
              return
            }
            trackEvent("store_banner_dismissed", { store })
            dismissStore()
          }}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
