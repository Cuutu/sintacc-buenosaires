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
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#2D4A34] pl-3 pr-4 text-[#F7F3EB] transition-colors hover:bg-[#234A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/40"
/** Sobre la franja verde de la comunidad: badges crema. */
const storeBadgeOnDarkClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#F7F3EB] pl-3 pr-4 text-[#2D4A34] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/60"

function StoreBadge({
  store,
  href,
  kicker,
  name,
  label,
  glyph,
  onDark = false,
}: {
  store: "ios" | "android"
  href: string
  kicker: string
  name: string
  label: string
  glyph: React.ReactNode
  onDark?: boolean
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-store-badge={store}
      className={onDark ? storeBadgeOnDarkClass : storeBadgeClass}
    >
      {glyph}
      <span className="flex flex-col items-start leading-none">
        <span className={onDark ? "text-xs text-[#2D4A34]/75" : "text-xs text-[#F7F3EB]/80"}>
          {kicker}
        </span>
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
export function TakeCeliMapWithYou({ variant = "card" }: { variant?: "card" | "band" }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (isNativeApp() || isStandaloneDisplay()) setHidden(true)
  }, [])

  if (hidden) return null

  // Dentro de la franja de la comunidad (revisión 20/10): sin tarjeta blanca, una
  // línea y los badges en crema. Antes parecía agregada a último momento.
  if (variant === "band") {
    return (
      <div
        data-get-app
        className="mt-10 flex flex-col items-center gap-4 border-t border-[#F7F3EB]/15 pt-8 sm:flex-row sm:justify-center sm:gap-6"
      >
        <p className="text-center sm:text-left">
          <span id="take-celimap-heading" className="block text-base font-extrabold text-cream">
            Llevá CeliMap con vos
          </span>
          <span className="block text-sm text-cream/75">El mapa sin gluten, siempre a mano.</span>
        </p>
        <div className="flex shrink-0 gap-2">
          <StoreBadge
            store="ios"
            href={CELIMAP_APP_STORE_URL}
            kicker="Disponible en"
            name="App Store"
            label="Descargar CeliMap en el App Store"
            glyph={<AppleGlyph />}
            onDark
          />
          <StoreBadge
            store="android"
            href={CELIMAP_PLAY_STORE_URL}
            kicker="Disponible en"
            name="Google Play"
            label="Descargar CeliMap en Google Play"
            glyph={<PlayGlyph />}
            onDark
          />
        </div>
      </div>
    )
  }

  return (
    <section data-get-app aria-labelledby="take-celimap-heading" className="px-4 pt-8 md:px-5 md:pt-10">
      <div className="container mx-auto max-w-5xl px-0">
        {/* Una sola fila en el teléfono (CSS deja sólo el badge de su tienda); en desktop los dos badges bajan si no entran. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-[22px] border border-[#E6DFD2] bg-white py-3 pl-3 pr-3 sm:justify-between sm:gap-6 md:px-5">
          <div className="flex min-w-0 flex-1 basis-[170px] items-center gap-3">
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

          <div className="flex shrink-0 gap-2">
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
