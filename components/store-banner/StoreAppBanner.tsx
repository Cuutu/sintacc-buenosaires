"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import {
  claimStoreBannerShownSession,
  isMapOverlayOpen,
  isStoreBannerUnlocked,
  shouldShowStoreBanner,
  subscribeBottomPromptChange,
  unlockStoreBanner,
} from "@/lib/bottom-prompt"
import { CELIMAP_STORE_URLS } from "@/lib/device-platform"
import { useBottomPrompt } from "@/lib/use-bottom-prompt"

/**
 * Lo que ocupa el cartel arriba de la barra de abajo (su alto + 0.5rem de despegue
 * + 0.5rem de aire). El botón de CeliBot y los controles del mapa lo suman a su
 * `bottom` para no quedar tapados: antes el botón de CeliBot tapaba la X del cartel.
 */
export const STORE_BANNER_SPACE_VAR = "--store-banner-space"

export function StoreAppBanner() {
  const pathname = usePathname()
  const { prompt, browser, store, ready, debugBanner, dismissStore } = useBottomPrompt()
  const [debugHidden, setDebugHidden] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [mapOverlayOpen, setMapOverlayOpenState] = useState(false)
  const shownRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pathname.startsWith("/lugar/")) unlockStoreBanner()
  }, [pathname])

  useEffect(() => {
    const sync = () => {
      setUnlocked(debugBanner || isStoreBannerUnlocked())
      setMapOverlayOpenState(isMapOverlayOpen())
    }
    sync()
    return subscribeBottomPromptChange(sync)
  }, [debugBanner])

  const gated = shouldShowStoreBanner({ pathname, unlocked, debugBanner, mapOverlayOpen })
  const visible = ready && prompt === "store" && store != null && !debugHidden && gated
  const href = store ? CELIMAP_STORE_URLS[store] : ""

  useEffect(() => {
    const el = rootRef.current
    if (!visible || !el) return
    const root = document.documentElement
    const apply = () => {
      root.style.setProperty(STORE_BANNER_SPACE_VAR, `${Math.ceil(el.offsetHeight) + 16}px`)
    }
    apply()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null
    observer?.observe(el)
    return () => {
      observer?.disconnect()
      root.style.removeProperty(STORE_BANNER_SPACE_VAR)
    }
  }, [visible, href])

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
      ref={rootRef}
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
          className="flex min-h-[44px] shrink-0 items-center rounded-xl bg-terracotta-strong px-3.5 text-sm font-semibold text-white hover:bg-terracotta-hover"
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
