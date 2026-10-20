"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { readOnly100, SAFETY_MODE_EVENT, writeOnly100 } from "@/lib/safety-mode"

/**
 * Interruptor del hero: modo "Sólo 100% sin TACC". Guarda la preferencia en el
 * dispositivo y el mapa arranca filtrado. El estado se lee después de montar
 * (la home es ISR): hasta entonces se muestra apagado y sin transición.
 */
export function SafetyModeSwitch({ variant = "card" }: { variant?: "card" | "chip" }) {
  const [on, setOn] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setOn(readOnly100())
    setReady(true)
    const sync = () => setOn(readOnly100())
    window.addEventListener(SAFETY_MODE_EVENT, sync)
    return () => window.removeEventListener(SAFETY_MODE_EVENT, sync)
  }, [])

  const toggle = () => {
    const next = !on
    setOn(next)
    writeOnly100(next)
    trackEvent("safety_mode_set", { source: "home_hero", mode: next ? "only100" : "all" })
  }

  // Chip del hero (revisión 20/10): mismo interruptor, al lado de "Cerca mío".
  if (variant === "chip") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        data-testid="home-safety-mode"
        title="El mapa oculta los lugares con opciones"
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/60",
          ready && "transition-colors",
          on
            ? "border-[#F7F3EB] bg-[#F7F3EB] text-[#2D4A34]"
            : "border-[#F7F3EB]/40 text-[#F7F3EB] hover:bg-[#F7F3EB]/10"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-[5px] border",
            on ? "border-[#2D4A34] bg-[#2D4A34] text-[#F7F3EB]" : "border-[#F7F3EB]/60"
          )}
        >
          {on ? <Check className="h-3 w-3" strokeWidth={3.2} /> : null}
        </span>
        Solo 100% sin TACC
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      data-testid="home-safety-mode"
      className="flex min-h-[48px] w-full items-center gap-3 rounded-[18px] border border-[#F7F3EB]/20 bg-[#1F3527]/45 px-4 py-2.5 text-left transition-colors hover:bg-[#1F3527]/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/60 sm:min-h-[56px] sm:w-auto sm:min-w-[300px]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold leading-tight text-[#F7F3EB]">
          Solo 100% sin TACC
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-[#F7F3EB]/65">
          El mapa oculta los lugares con opciones
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5",
          ready && "transition-colors duration-200",
          on ? "bg-[#F7F3EB]" : "bg-[#F7F3EB]/25"
        )}
      >
        <span
          className={cn(
            "h-6 w-6 rounded-full shadow-sm",
            ready && "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            on ? "translate-x-5 bg-[#2D4A34]" : "translate-x-0 bg-[#F7F3EB]"
          )}
        />
      </span>
    </button>
  )
}
