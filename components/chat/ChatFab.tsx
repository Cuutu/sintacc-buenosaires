"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/** 192 px: el avatar más grande es de 96 px. El PNG original es de 1024 px (≈100 KB). */
export const CELIBOT_SRC = "/brand/celibot-192.webp"

/**
 * Botón flotante de CeliBot. Vive en su propio archivo para que el botón no arrastre
 * el panel del chat (AI SDK, markdown, tarjetas): el panel se baja recién cuando se
 * abre, o un toque antes si el puntero pasa por el botón (`onIntent`).
 */
export function ChatFab({
  open = false,
  onToggle,
  onIntent,
}: {
  open?: boolean
  onToggle: () => void
  /** Hover, pointerdown o foco: buen momento para precargar el panel. */
  onIntent?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onPointerEnter={onIntent}
      onPointerDown={onIntent}
      onFocus={onIntent}
      aria-label={open ? "Cerrar CeliBot" : "Abrir CeliBot"}
      aria-expanded={open}
      className={cn(
        "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-[0_4px_14px_rgba(31,77,53,0.28)] md:h-16 md:w-16 transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B64320] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EB]",
        open ? "bg-[#1F4D35] text-white" : "bg-[#F7F3EB]"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CELIBOT_SRC}
        alt=""
        width={64}
        height={64}
        className={cn(
          "h-[90%] w-[90%] object-contain transition-transform duration-150 ease-out",
          open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      />
      <X
        className={cn(
          "absolute h-6 w-6 transition-transform duration-150 ease-out",
          open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )}
        strokeWidth={2.2}
      />
    </button>
  )
}
