/**
 * Landings SEO con ISR: la versión limpia (página 1, sin filtros) es estática y
 * las variantes con query (?page=, ?barrio=) van a una ruta hermana /filtrado,
 * dinámica, por un rewrite en next.config.js. La URL pública no cambia.
 */

/** Nombre del segmento de las variantes. No puede ser el slug de una categoría ni de una ciudad. */
export const LANDING_VARIANT_SEGMENT = "filtrado"

/** ?page= como lo leían las páginas: entero ≥ 1, y 1 si no es un número. */
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  const n = parseInt(value || "1", 10)
  return Number.isFinite(n) ? Math.max(1, n) : 1
}
