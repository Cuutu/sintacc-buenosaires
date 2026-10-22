/**
 * Formatos que usa el admin. Funciones puras: sirven en cliente y en tests.
 */

/** Decimales de las coordenadas: 6 dan ~10 cm, más es ruido de float (-58.55315150000001). */
export const COORDINATE_DECIMALS = 6

/** Coordenada para mostrar o para un input: redondeada a 6 decimales, sin ceros de más. */
export function formatCoordinate(value: unknown): string {
  const n = typeof value === "string" ? Number(value.trim()) : value
  if (typeof n !== "number" || !Number.isFinite(n)) return ""
  if (typeof value === "string" && value.trim() === "") return ""
  return String(Number(n.toFixed(COORDINATE_DECIMALS)))
}
