"use client"

import { useEffect, useState } from "react"
import { getOpenNowLine } from "@/lib/opening-hours"
import { cn } from "@/lib/utils"

type Line = NonNullable<ReturnType<typeof getOpenNowLine>>

/**
 * "Abierto · cierra a las 20 h" debajo del nombre. Antes, en el celular, había que
 * bajar hasta "Información" para saberlo (revisión 23/10).
 *
 * La ficha es ISR: el estado se calcula recién al montar (si no, el HTML cacheado
 * mostraría un "Abierto" viejo y daría error de hidratación). Mientras tanto queda
 * el lugar reservado para que la página no salte.
 */
export function useOpenNowLine(hours: string | undefined): Line | null {
  const [line, setLine] = useState<Line | null>(null)
  useEffect(() => {
    if (!hours) return
    const update = () => setLine(getOpenNowLine(hours))
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [hours])
  return line
}

export function PlaceOpenNowLine({ hours, className }: { hours?: string; className?: string }) {
  const line = useOpenNowLine(hours)
  if (!hours) return null
  return (
    <p className={cn("mt-2 min-h-[24px] text-base", className)} aria-live="polite" data-testid="place-open-now">
      {line ? (
        <>
          <span className={cn("font-extrabold", line.isOpen ? "text-[#2D7A4E]" : "text-[#8B5A3C]")}>
            {line.label}
          </span>
          {line.detail ? <span className="text-[#5F6B63]"> · {line.detail}</span> : null}
        </>
      ) : null}
    </p>
  )
}
