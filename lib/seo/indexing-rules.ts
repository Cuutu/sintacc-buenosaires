/**
 * Reglas de indexación centralizadas para páginas provinciales.
 * Única fuente de verdad: metadata, sitemap y render usan estas funciones.
 */

export type IndexingDecision = "index" | "noindex" | "not_found"

/** Provincia: 0 → not_found; <5 lugares o <2 localidades → noindex; resto → index */
export function decideProvincePageIndexing(totalPlaces: number, distinctLocalities: number): IndexingDecision {
  if (totalPlaces <= 0) return "not_found"
  if (totalPlaces < 5 || distinctLocalities < 2) return "noindex"
  return "index"
}

/** Provincia + categoría: 0 → not_found; 1-2 → noindex; ≥3 → index */
export function decideProvinceCategoryIndexing(totalPlaces: number): IndexingDecision {
  if (totalPlaces <= 0) return "not_found"
  if (totalPlaces < 3) return "noindex"
  return "index"
}

export function isProvincePageIndexable(totalPlaces: number, distinctLocalities: number): boolean {
  return decideProvincePageIndexing(totalPlaces, distinctLocalities) === "index"
}

export function isProvinceCategoryIndexable(totalPlaces: number): boolean {
  return decideProvinceCategoryIndexing(totalPlaces) === "index"
}