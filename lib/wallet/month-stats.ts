/** Tipos y textos de los sellos por mes, sin Mongo: se usan también en el navegador (/admin). */

export type MonthStamps = {
  /** "2026-10" */
  month: string
  /** "oct" */
  label: string
  stamps: number
  /** Personas distintas que sumaron sellos ese mes. */
  customers: number
  redeems: number
  current: boolean
}

/** "+40%" / "−10%" / null (sin mes anterior para comparar). */
export function monthChange(current: number, previous: number): string | null {
  if (previous <= 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  return pct === 0 ? "igual" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`
}
