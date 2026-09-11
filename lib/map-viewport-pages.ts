import { PUBLIC_PLACES_MAX_LIMIT } from "@/lib/validations"

/** Tope de páginas por viewport. 20 × 100 cubre el catálogo nacional sin dump en una request. */
export const MAP_VIEWPORT_MAX_PAGES = 20

export type PlacesListPagination = {
  page?: number
  limit?: number
  total?: number
  pages?: number
}

/**
 * Siguiente página del bbox. Confía en `pages` de Mongo cuando viene;
 * si no hay `pages`, sigue mientras la página haya venido llena.
 */
export function nextViewportPage(input: {
  page: number
  received: number
  limit?: number
  totalPages?: number
  maxPages?: number
}): number | null {
  const maxPages = input.maxPages ?? MAP_VIEWPORT_MAX_PAGES
  const limit = input.limit ?? PUBLIC_PLACES_MAX_LIMIT
  if (input.page < 1 || input.page >= maxPages) return null
  if (input.totalPages != null && input.totalPages > 0) {
    return input.page < input.totalPages ? input.page + 1 : null
  }
  if (input.received < limit) return null
  return input.page + 1
}

export function paginationTotalPages(pagination?: PlacesListPagination): number | undefined {
  if (pagination?.pages != null && Number.isFinite(pagination.pages) && pagination.pages > 0) {
    return Math.trunc(pagination.pages)
  }
  return undefined
}
