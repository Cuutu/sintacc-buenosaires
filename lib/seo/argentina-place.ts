/**
 * Hub nacional (`/{category}-sin-gluten`): “es Argentina” = `province` es slug
 * de PROVINCES (24 jurisdicciones, countryCode AR). Place no tiene `country`.
 *
 * Fichas AR mal geocodificadas (province null, vacío o slug inválido) quedan
 * fuera del hub nacional hasta un backfill. Es correcto: no contaminar
 * titles/H1 “en Argentina” con Brasil u otros.
 *
 * No filtrar por texto “Brasil” / “Búzios” / “Salvador”: eso es métrica o
 * test de regresión, no la regla canónica.
 */

import { PROVINCES, getProvinceBySlug } from "./provinces"

export const AR_PROVINCE_SLUGS: readonly string[] = PROVINCES.map((p) => p.slug)

export function isArgentinaPlace(place: { province?: string | null }): boolean {
  const slug = typeof place.province === "string" ? place.province.trim() : ""
  if (!slug) return false
  return Boolean(getProvinceBySlug(slug))
}

export function argentinaPlaceMongoFilter(): { province: { $in: string[] } } {
  return { province: { $in: [...AR_PROVINCE_SLUGS] } }
}

/** Query del hub nacional: approved + type/types + province ∈ PROVINCES (AR). */
export function buildNationalCategoryMongoQuery(type: string) {
  return {
    status: "approved" as const,
    $or: [{ type }, { types: type }],
    ...argentinaPlaceMongoFilter(),
  }
}
