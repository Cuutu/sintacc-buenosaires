/**
 * Reglas de indexación centralizadas.
 * Única fuente de verdad: metadata, sitemap y render usan estas funciones.
 *
 * Principios:
 * - Indexar páginas con contenido y utilidad real.
 * - noindex,follow en vacías o demasiado pobres.
 * - Excepciones bajan cantidad pero no eliminan calidad (ver city-index-quality).
 * - Sitemap solo incluye páginas indexables.
 */

import {
  INDEXING_THRESHOLDS,
  getCityMinPlaces,
  getCityCategoryMinPlaces,
} from "./indexing-config"
import { evaluateCityPageIndexability } from "./city-index-quality"

export type IndexingDecision = "index" | "noindex" | "not_found"

export type RobotsMeta = {
  index: boolean
  follow: boolean
}

export function decisionToRobots(decision: IndexingDecision): RobotsMeta | undefined {
  if (decision === "index") return undefined
  if (decision === "noindex") return { index: false, follow: true }
  return { index: false, follow: false }
}

/** Provincia: 0 → not_found; <min lugares o <min localidades → noindex; resto → index */
export function decideProvincePageIndexing(
  totalPlaces: number,
  distinctLocalities: number
): IndexingDecision {
  const { provinceMinPlaces, provinceMinLocalities } = INDEXING_THRESHOLDS
  if (totalPlaces <= 0) return "not_found"
  if (totalPlaces < provinceMinPlaces || distinctLocalities < provinceMinLocalities) {
    return "noindex"
  }
  return "index"
}

/** Provincia + categoría: 0 → not_found; <min → noindex; resto → index */
export function decideProvinceCategoryIndexing(totalPlaces: number): IndexingDecision {
  const { provinceCategoryMinPlaces } = INDEXING_THRESHOLDS
  if (totalPlaces <= 0) return "not_found"
  if (totalPlaces < provinceCategoryMinPlaces) return "noindex"
  return "index"
}

/**
 * Ciudad: umbral + calidad (geo, editorial si excepción thin).
 * 0 lugares → siempre noindex (aunque haya excepción).
 */
export function decideCityPageIndexing(
  totalPlaces: number,
  citySlug?: string
): IndexingDecision {
  if (!citySlug) {
    if (totalPlaces <= 0) return "noindex"
    if (totalPlaces < INDEXING_THRESHOLDS.cityMinPlaces) return "noindex"
    return "index"
  }
  return evaluateCityPageIndexability({ citySlug, totalPlaces }).decision
}

/** Ciudad + categoría */
export function decideCityCategoryIndexing(
  totalPlaces: number,
  citySlug?: string
): IndexingDecision {
  if (totalPlaces <= 0) return "noindex"
  if (totalPlaces < getCityCategoryMinPlaces(citySlug)) return "noindex"
  return "index"
}

/** Lista pública: privada siempre noindex; pública con pocos lugares → noindex */
export function decidePublicListIndexing(opts: {
  isPublic: boolean
  placeCount: number
}): IndexingDecision {
  if (!opts.isPublic) return "noindex"
  if (opts.placeCount < INDEXING_THRESHOLDS.publicListMinPlaces) return "noindex"
  return "index"
}

/** Guías: solo published se indexan; drafts → noindex */
export function decideGuideIndexing(status: "draft" | "published"): IndexingDecision {
  if (INDEXING_THRESHOLDS.guideRequirePublished && status !== "published") {
    return "noindex"
  }
  return "index"
}

export function isProvincePageIndexable(
  totalPlaces: number,
  distinctLocalities: number
): boolean {
  return decideProvincePageIndexing(totalPlaces, distinctLocalities) === "index"
}

export function isProvinceCategoryIndexable(totalPlaces: number): boolean {
  return decideProvinceCategoryIndexing(totalPlaces) === "index"
}

export function isCityPageIndexable(totalPlaces: number, citySlug?: string): boolean {
  return decideCityPageIndexing(totalPlaces, citySlug) === "index"
}

export function isCityCategoryIndexable(totalPlaces: number, citySlug?: string): boolean {
  return decideCityCategoryIndexing(totalPlaces, citySlug) === "index"
}

export function isPublicListIndexable(isPublic: boolean, placeCount: number): boolean {
  return decidePublicListIndexing({ isPublic, placeCount }) === "index"
}

export function isGuideIndexable(status: "draft" | "published"): boolean {
  return decideGuideIndexing(status) === "index"
}

export { getCityMinPlaces }
