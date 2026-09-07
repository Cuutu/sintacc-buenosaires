/**
 * Ventures no tienen `province` (Places sí). El feed público de /emprendimientos
 * reusa `inferGeoSearchCountry` (mismos hints BR/UY que el geocoder) para no
 * inventar otra regla de país. Default: incluir (producto AR; zona vacía o
 * barrio tipo "Palermo" no es señal extranjera).
 */
import { inferGeoSearchCountry, BR_GEO_HINT, UY_GEO_HINT } from "@/lib/geo-search-region"
import { VENTURE_ZONE_LANDINGS, type VentureZoneLandingConfig } from "@/lib/venture-seo"

export function isArgentinaVentureZone(zone?: string | null): boolean {
  const text = typeof zone === "string" ? zone.trim() : ""
  if (!text) return true
  const geo = inferGeoSearchCountry(text)
  return geo !== "br" && geo !== "uy"
}

export function argentinaVentureMongoFilter(): Record<string, unknown> {
  return {
    $nor: [
      { zone: { $regex: BR_GEO_HINT.source, $options: "i" } },
      { zone: { $regex: UY_GEO_HINT.source, $options: "i" } },
    ],
  }
}

export function isArgentinaVentureZoneLanding(
  landing: Pick<VentureZoneLandingConfig, "countryCode">
): boolean {
  return (landing.countryCode ?? "AR") === "AR"
}

export const VENTURE_AR_ZONE_LANDINGS = VENTURE_ZONE_LANDINGS.filter(isArgentinaVentureZoneLanding)
