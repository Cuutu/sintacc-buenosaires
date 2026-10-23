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
/**
 * Páginas nacionales por tipo: solo el tipo principal (`type`). Con `types` entraban
 * lugares de otra categoría que además tenían esa (una tienda en Restaurantes).
 */
export function buildNationalCategoryMongoQuery(type: string) {
  return {
    status: "approved" as const,
    type,
    ...argentinaPlaceMongoFilter(),
  }
}

/** Caja aproximada de Argentina (de La Quiaca a Ushuaia, de los Andes al Atlántico). */
const AR_BBOX = { minLat: -55.2, maxLat: -21.7, minLng: -73.7, maxLng: -53.5 } as const

/**
 * Sitemap de fichas: afuera solo lo que seguro no es de Argentina (Nueva York,
 * Cabo Frío, Búzios): provincia que no está en PROVINCES y coordenadas fuera
 * de la caja. Una ficha argentina sin provincia cargada sigue adentro; no se
 * pierde por un dato incompleto. La ficha sigue publicada: solo sale del sitemap.
 */
export function isOutsideArgentina(place: {
  province?: string | null
  location?: { lat?: number | null; lng?: number | null } | null
}): boolean {
  if (isArgentinaPlace(place)) return false
  const lat = place.location?.lat
  const lng = place.location?.lng
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false
  }
  return lat < AR_BBOX.minLat || lat > AR_BBOX.maxLat || lng < AR_BBOX.minLng || lng > AR_BBOX.maxLng
}
