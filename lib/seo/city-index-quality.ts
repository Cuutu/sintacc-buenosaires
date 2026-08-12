/**
 * Evaluación de calidad para indexar páginas de ciudad.
 *
 * Una excepción SOLO reduce el umbral de cantidad.
 * No elimina: ≥1 lugar real, geo válida, metadata específica, contenido útil.
 * No generar textos artificiales solo para pasar este criterio.
 */

import { getCityBySlug } from "./cities"
import { getCiudadSEOData } from "./ciudades-data"
import {
  INDEXING_THRESHOLDS,
  getCityIndexException,
  getCityMinPlaces,
} from "./indexing-config"
import type { IndexingDecision } from "./indexing-rules"

export type CityIndexQualityInput = {
  citySlug: string
  totalPlaces: number
  /** Override opcional (tests). Por defecto se deriva del seed / ciudades-data. */
  hasValidGeography?: boolean
  hasEditorialContent?: boolean
}

export type CityIndexQualityResult = {
  decision: IndexingDecision
  reason: string
  usedException: boolean
  minPlacesApplied: number
  qualityPassed: boolean
  hasValidGeography: boolean
  hasEditorialContent: boolean
  totalPlaces: number
}

function resolveGeo(citySlug: string, override?: boolean): boolean {
  if (override !== undefined) return override
  return Boolean(getCityBySlug(citySlug))
}

function resolveEditorial(citySlug: string, override?: boolean): boolean {
  if (override !== undefined) return override
  const exception = getCityIndexException(citySlug)
  if (exception) return exception.hasEditorialContent && Boolean(getCiudadSEOData(citySlug))
  return Boolean(getCiudadSEOData(citySlug))
}

/**
 * Decide indexación de ciudad con umbral + calidad.
 * Metadata específica se asume cuando hay geo válida (templates usan city.name).
 */
export function evaluateCityPageIndexability(
  input: CityIndexQualityInput
): CityIndexQualityResult {
  const { citySlug, totalPlaces } = input
  const hasValidGeography = resolveGeo(citySlug, input.hasValidGeography)
  const hasEditorialContent = resolveEditorial(citySlug, input.hasEditorialContent)
  const exception = getCityIndexException(citySlug)
  const usedException = Boolean(exception)
  const minPlacesApplied = getCityMinPlaces(citySlug)

  const base = {
    usedException,
    minPlacesApplied,
    hasValidGeography,
    hasEditorialContent,
    totalPlaces,
  }

  if (totalPlaces <= 0) {
    return {
      ...base,
      decision: "noindex",
      reason: "cero_lugares",
      qualityPassed: false,
    }
  }

  if (!hasValidGeography) {
    return {
      ...base,
      decision: "noindex",
      reason: "geo_invalida",
      qualityPassed: false,
    }
  }

  if (totalPlaces < minPlacesApplied) {
    return {
      ...base,
      decision: "noindex",
      reason: "bajo_umbral_cantidad",
      qualityPassed: false,
    }
  }

  /**
   * Contenido útil visible:
   * - Cumple umbral general (≥3) → el listado en sí aporta utilidad; o
   * - Excepción thin (1–2) → exige editorial city-specific (no copy genérico vacío).
   */
  const meetsGeneralVolume = totalPlaces >= INDEXING_THRESHOLDS.cityMinPlaces
  const thinExceptionOk =
    usedException && hasEditorialContent && totalPlaces >= 1

  if (!meetsGeneralVolume && !thinExceptionOk) {
    return {
      ...base,
      decision: "noindex",
      reason: "contenido_insuficiente",
      qualityPassed: false,
    }
  }

  // Metadata específica: templates + city.name (geo ya validada)
  const qualityPassed = true

  return {
    ...base,
    decision: "index",
    reason: usedException ? "excepcion_con_calidad" : "umbral_general_con_calidad",
    qualityPassed,
  }
}
