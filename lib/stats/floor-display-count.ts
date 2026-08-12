/**
 * Redondeo comercial hacia abajo para métricas de social proof.
 *
 * Reglas:
 * - inválido / negativo → null
 * - < 100 → número exacto, sin "+"
 * - < 10_000 → piso a centenas (964 → 900+)
 * - < 1_000_000 → piso a miles (18430 → 18.000+)
 * - ≥ 1_000_000 → piso a millones compactos (2_008_153 → 2 M+)
 * - Nunca redondea hacia arriba
 * - El "+" va siempre como sufijo
 */
export type FloorDisplayCount = {
  raw: number
  displayValue: number
  showPlus: boolean
  /** Ej: "900+", "2 M+" o "87" (locale es-AR) */
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

  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000)
    if (millions <= 0) {
      return {
        raw: n,
        displayValue: n,
        showPlus: false,
        formatted: n.toLocaleString(locale),
      }
    }
    return {
      raw: n,
      displayValue: millions * 1_000_000,
      showPlus: true,
      formatted: `${millions.toLocaleString(locale)} M+`,
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
    formatted: `${floored.toLocaleString(locale)}+`,
  }
}

/**
 * Display conservador para reseñas Google en home:
 * si hay ≥1000, mostrar "1000+" (nunca más que el total real).
 */
export function floorGoogleReviewsDisplay(
  raw: unknown,
  locale = "es-AR"
): FloorDisplayCount | null {
  const n = sanitizeNonNegativeInt(raw)
  if (n == null) return null
  if (n >= 1000) {
    return {
      raw: n,
      displayValue: 1000,
      showPlus: true,
      formatted: "1000+",
    }
  }
  return floorDisplayCount(n, locale)
}
