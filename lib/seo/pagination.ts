/**
 * Paginación de las landings SEO (?page=N).
 *
 * Cada página de la serie es indexable y su canónica es ella misma: Google pide
 * no usar la página 1 como canónica de toda la serie, y una serie en noindex
 * termina dejando de seguir sus enlaces (las fichas de la página 2 en adelante
 * quedaban "descubiertas, sin indexar"). La página 1 es siempre la URL limpia.
 *
 * Los filtros (?barrio=) siguen en noindex con canónica a la página limpia.
 */

/** Hasta este total se muestran todos los números (CABA restaurantes tiene 11). */
export const PAGINATION_SHOW_ALL_MAX = 12

/** `/sin-gluten/cordoba` + 3 → `/sin-gluten/cordoba?page=3` (sirve igual con la URL absoluta). La 1 nunca lleva ?page=. */
export function paginatedPath(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath
}

/** Título distinto por página para que no queden duplicados. */
export function paginatedTitle(title: string, page: number): string {
  return page > 1 ? `${title} – página ${page}` : title
}

export type PaginationItem = number | "gap"

/**
 * Números a mostrar. Hasta PAGINATION_SHOW_ALL_MAX páginas, todos. Con más:
 * las dos primeras, dos para cada lado de la actual y las dos últimas, con "…"
 * en los huecos (si el hueco es de una sola página, va el número).
 */
export function paginationItems(current: number, total: number): PaginationItem[] {
  if (total <= 1) return []
  if (total <= PAGINATION_SHOW_ALL_MAX) return Array.from({ length: total }, (_, i) => i + 1)

  const keep = new Set<number>([1, 2, total - 1, total])
  for (let p = current - 2; p <= current + 2; p++) {
    if (p >= 1 && p <= total) keep.add(p)
  }
  const pages = Array.from(keep).sort((a, b) => a - b)

  const items: PaginationItem[] = []
  let previous = 0
  for (const p of pages) {
    if (previous && p - previous === 2) items.push(previous + 1)
    else if (previous && p - previous > 2) items.push("gap")
    items.push(p)
    previous = p
  }
  return items
}
