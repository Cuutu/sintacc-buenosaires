/**
 * Redondeo comercial hacia abajo para métricas de social proof.
 *
 * Reglas:
 * - inválido / negativo → null
 * - < 100 → número exacto, sin "+"
 * - < 10_000 → piso a centenas (964 → 900, 1243 → 1200)
 * - ≥ 10_000 → piso a miles (18430 → 18000, 125700 → 125000)
 * - piso 0 (no debería pasar con n≥100) → exacto sin "+"
 */
export type FloorDisplayCount = {
  raw: number
  displayValue: number
  showPlus: boolean
  /** Ej: "+900" o "87" (locale es-AR) */
  formatted: string
}

export function sanitizeNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null
  }
  return Math.floor(value)
}

export function floorDisplayCount(
  raw: unknown,
  locale = "es-AR"
): FloorDisplayCount | null {
  const n = sanitizeNonNegativeInt(raw)
  if (n == null) return null

  if (n < 100) {
    return {
      raw: n,
      displayValue: n,
      showPlus: false,
      formatted: n.toLocaleString(locale),
    }
  }

  const step = n < 10_000 ? 100 : 1_000
  const floored = Math.floor(n / step) * step
  if (floored <= 0) {
    return {
      raw: n,
      displayValue: n,
      showPlus: false,
      formatted: n.toLocaleString(locale),
    }
  }

  return {
    raw: n,
    displayValue: floored,
    showPlus: true,
    formatted: `+${floored.toLocaleString(locale)}`,
  }
}
