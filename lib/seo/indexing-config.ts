/**
 * Umbrales de indexación centralizados.
 *
 * Política ciudad:
 * - Umbral general = 3.
 * - Excepciones solo bajan el mínimo de cantidad; NUNCA permiten 0 lugares.
 * - Calidad adicional: ver `evaluateCityPageIndexability` (geo, editorial, contenido útil).
 *
 * Excepciones provisionales: sin datos GSC en repo. Solo ciudades con
 * tráfico reportado por el equipo en el brief SEO, o hub estratégico.
 * San Miguel ≠ Yerba Buena (localidades distintas).
 */

export const INDEXING_THRESHOLDS = {
  /** Ciudad: mínimo general de lugares aprobados para indexar. */
  cityMinPlaces: 3,
  /**
   * @deprecated Preferí CITY_INDEX_EXCEPTIONS + evaluateCityPageIndexability.
   */
  cityPoorMaxPlaces: 2,
  /** Ciudad + categoría: mínimo general. */
  cityCategoryMinPlaces: 2,
  /** Provincia: mínimo de lugares. */
  provinceMinPlaces: 5,
  /** Provincia: mínimo de localidades distintas. */
  provinceMinLocalities: 2,
  /** Provincia + categoría: mínimo. */
  provinceCategoryMinPlaces: 3,
  /** Lista pública: mínimo de lugares para indexar. */
  publicListMinPlaces: 3,
  /** Guía editorial: solo indexar si status === published. */
  guideRequirePublished: true,
  /** ItemList JSON-LD: mínimo de ítems visibles para emitir schema. */
  itemListMinPlaces: 1,
} as const

export type CityIndexException = {
  slug: string
  /** Mínimo de lugares (siempre ≥ 1). Nunca 0. */
  minPlaces: number
  reason: string
  /** ¿Contenido editorial city-specific en ciudades-data? */
  hasEditorialContent: boolean
  /**
   * Tráfico orgánico: solo si el equipo lo reportó en brief (NO hay GSC en repo).
   * "unverified" = no inventar métricas Search Console.
   */
  organicTraffic: "reported_by_team" | "unverified"
}

/**
 * Excepciones estratégicas (umbral de cantidad reducido).
 * Revisar tras GSC real. Quitar si no hay ≥1 lugar en prod + calidad.
 */
export const CITY_INDEX_EXCEPTIONS: ReadonlyArray<CityIndexException> = [
  {
    slug: "san-miguel-de-tucuman",
    minPlaces: 1,
    reason:
      "Brief SEO: recibe tráfico orgánico (reportado por equipo; GSC no verificado en repo). Localidad distinta de yerba-buena.",
    hasEditorialContent: true,
    organicTraffic: "reported_by_team",
  },
  {
    slug: "la-plata",
    minPlaces: 1,
    reason:
      "Brief SEO: ciudad prioritaria con tráfico reportado por equipo (GSC no verificado en repo).",
    hasEditorialContent: true,
    organicTraffic: "reported_by_team",
  },
  {
    slug: "buenos-aires",
    minPlaces: 1,
    reason: "Hub capital estratégico; contenido editorial propio en ciudades-data.",
    hasEditorialContent: true,
    organicTraffic: "unverified",
  },
]

export function getCityIndexException(
  citySlug?: string
): CityIndexException | undefined {
  if (!citySlug) return undefined
  return CITY_INDEX_EXCEPTIONS.find((e) => e.slug === citySlug)
}

export function getCityMinPlaces(citySlug?: string): number {
  if (!citySlug) return INDEXING_THRESHOLDS.cityMinPlaces
  const exception = getCityIndexException(citySlug)
  if (!exception) return INDEXING_THRESHOLDS.cityMinPlaces
  // Defensa: excepción nunca baja de 1
  return Math.max(1, exception.minPlaces)
}

export function getCityCategoryMinPlaces(citySlug?: string): number {
  if (!citySlug) return INDEXING_THRESHOLDS.cityCategoryMinPlaces
  const exception = getCityIndexException(citySlug)
  if (exception) {
    return Math.min(
      Math.max(1, exception.minPlaces),
      INDEXING_THRESHOLDS.cityCategoryMinPlaces
    )
  }
  return INDEXING_THRESHOLDS.cityCategoryMinPlaces
}

export type IndexingThresholds = typeof INDEXING_THRESHOLDS
