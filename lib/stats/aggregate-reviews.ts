import { sanitizeNonNegativeInt } from "@/lib/stats/floor-display-count"

/**
 * Suma reseñas propias (CeliMap) + conteos de Google por lugar.
 * No inventa: valores inválidos se ignoran (cuentan 0).
 * Google = suma de `googleSnapshot.userRatingCount` por place approved.
 */
export function aggregateReviewCounts(input: {
  celimapCount: unknown
  googleCount: unknown
}): {
  celimap: number
  google: number
  total: number
} {
  const celimap = sanitizeNonNegativeInt(input.celimapCount) ?? 0
  const google = sanitizeNonNegativeInt(input.googleCount) ?? 0
  return {
    celimap,
    google,
    total: celimap + google,
  }
}

/** Normaliza un userRatingCount individual de Google (por lugar). */
export function sanitizeGoogleUserRatingCount(value: unknown): number {
  return sanitizeNonNegativeInt(value) ?? 0
}
