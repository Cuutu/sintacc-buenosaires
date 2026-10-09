"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { isNativeApp } from "@/lib/native-app"
import {
  CELIMAP_APP_STORE_URL,
  CELIMAP_PLAY_STORE_URL,
  isStandaloneDisplay,
} from "@/lib/device-platform"

function AppleGlyph() {
  // El trazo de la manzana ocupa menos del viewBox que el de Play: un poco más grande
  // y 1px arriba para que ambos badges se vean del mismo peso.
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 -translate-y-px" aria-hidden fill="currentColor">
      <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.8 6.3c.6-.8 1.1-1.9.9-3-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.3-.6 3-1.4z" />
    </svg>
  )
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden fill="currentColor">
      <path d="M4.2 2.4c-.3.3-.4.7-.4 1.2v16.8c0 .5.1.9.4 1.2l9.4-9.6-9.4-9.6zM14.7 13.1l2.6 2.7-11.6 6.6c-.4.2-.8.3-1.1.2l10.1-9.5zM14.7 10.9 4.6 1.4c.3-.1.7 0 1.1.2l11.6 6.6-2.6 2.7zM18.6 9l3 1.7c.9.5.9 2 0 2.5l-3 1.7-2.8-2.9L18.6 9z" />
    </svg>
  )
}

const storeBadgeClass =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2D4A34] px-3.5 text-[#F7F3EB] transition-colors hover:bg-[#234A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/40 sm:flex-none"

function StoreBadge({
  store,
  href,
  kicker,
  name,
  label,
  glyph,
}: {
  store: "ios" | "android"
  href: string
  kicker: string
  name: string
  label: string
  glyph: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-store-badge={store}
      className={storeBadgeClass}
    >
      {glyph}
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium text-[#F7F3EB]/80">{kicker}</span>
        <span className="mt-0.5 text-sm font-bold">{name}</span>
      </span>
    </a>
  )
}

/**
 * Franja de descarga de la app. Se renderiza en el servidor (sin salto de layout);
 * qué badge ve cada teléfono y el ocultamiento en app nativa / PWA lo resuelve CSS
 * con los atributos de DEVICE_HINT_SCRIPT. El efecto es sólo un respaldo.
 */
export function TakeCeliMapWithYou() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (isNativeApp() || isStandaloneDisplay()) setHidden(true)
  }, [])

  if (hidden) return null

  return (
    <section data-get-app aria-labelledby="take-celimap-heading" className="px-4 pt-6 md:pt-10">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E8E1D6] bg-[#FDFBF7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/app-icon.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-[10px]"
            />
            <div className="min-w-0">
              <h2
                id="take-celimap-heading"
                className="text-base font-extrabold leading-tight tracking-[-0.02em] text-[#2D4A34]"
              >
                Llevá CeliMap con vos
              </h2>
              <p className="text-sm leading-snug text-[#55635A]">
                El mapa sin gluten, siempre a mano.
              </p>
            </div>
          </div>

          <div className="flex gap-2 sm:shrink-0">
            <StoreBadge
              store="ios"
              href={CELIMAP_APP_STORE_URL}
              kicker="Disponible en"
              name="App Store"
              label="Descargar CeliMap en el App Store"
              glyph={<AppleGlyph />}
            />
            <StoreBadge
              store="android"
              href={CELIMAP_PLAY_STORE_URL}
              kicker="Disponible en"
              name="Google Play"
              label="Descargar CeliMap en Google Play"
              glyph={<PlayGlyph />}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
