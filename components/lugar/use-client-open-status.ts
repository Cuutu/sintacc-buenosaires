"use client"

import { useEffect, useState } from "react"
import {
  getOpenStatusDetail,
  hasInterpretableOpeningHours,
  splitOpeningHoursLines,
  type OpenStatusDetail,
} from "@/lib/opening-hours"

export type ClientOpenStatus =
  /** Horario no interpretable (o vacío): mostrar el texto tal cual. */
  | { kind: "raw" }
  /** Interpretable, pero todavía sin montar: nada que dependa de la hora. */
  | { kind: "pending"; fullSchedule: string[] }
  | { kind: "ready"; detail: OpenStatusDetail }

/**
 * Estado "Abierto/Cerrado" calculado sólo en el cliente, después de montar.
 *
 * La ficha es ISR (HTML cacheado hasta 1 h): si el estado se calcula en el
 * render, el server y el navegador pueden diferir → error de hidratación y
 * un "Abierto" viejo. El primer render (server + hidratación) usa sólo datos
 * independientes de la hora; el estado real llega en el useEffect.
 */
export function useClientOpenStatus(hours: string | undefined): ClientOpenStatus {
  const interpretable = Boolean(hours) && hasInterpretableOpeningHours(hours)
  const [detail, setDetail] = useState<OpenStatusDetail | null>(null)

  useEffect(() => {
    if (!hours || !interpretable) {
      setDetail(null)
      return
    }
    const update = () => setDetail(getOpenStatusDetail(hours))
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [hours, interpretable])

  if (!hours || !interpretable) return { kind: "raw" }
  if (detail) return { kind: "ready", detail }
  return { kind: "pending", fullSchedule: splitOpeningHoursLines(hours) }
}
