"use client"

import Image from "next/image"
import { openCeliBot, preloadCeliBot } from "@/lib/celibot-open"

/**
 * Entrada a CeliBot en la home (en el celular el botón flotante no sale en el
 * inicio). Desde la revisión del 20/10 va en las preguntas frecuentes, no en el hero.
 */
export function CeliBotEntry() {
  return (
    <button
      type="button"
      onClick={() => openCeliBot("")}
      onPointerEnter={preloadCeliBot}
      onPointerDown={preloadCeliBot}
      onFocus={preloadCeliBot}
      className="inline-flex min-h-[44px] max-w-full items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-left text-base font-bold text-[#2D4A34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
      data-testid="home-celibot-entry"
    >
      <Image
        src="/brand/celibot-192.webp"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-[0_2px_8px_-3px_rgba(31,42,34,0.35)]"
      />
      <span className="min-w-0">
        ¿Te quedó otra duda?{" "}
        <span className="font-extrabold text-[#B84420] underline decoration-[#B84420]/30 underline-offset-4">
          Preguntale a CeliBot
        </span>
      </span>
    </button>
  )
}
