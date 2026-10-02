/**
 * Filtro de tipo de lugar leído desde la URL de /mapa (?type=…).
 * Acepta el valor interno ("restaurant") o el slug en castellano de las
 * landings ("restaurantes"). Cualquier otro valor se ignora.
 *
 * `type` ya está en MAP_NOINDEX_SEARCH_KEYS: estas URLs no se indexan.
 */
export const MAP_URL_PLACE_TYPES = [
  "restaurant",
  "cafe",
  "bakery",
  "store",
  "icecream",
  "bar",
  "other",
] as const

export type MapUrlPlaceType = (typeof MAP_URL_PLACE_TYPES)[number]

const SPANISH_SLUG_TO_TYPE: Record<string, MapUrlPlaceType> = {
  restaurantes: "restaurant",
  cafes: "cafe",
  panaderias: "bakery",
  tiendas: "store",
  heladerias: "icecream",
  bares: "bar",
  otros: "other",
}

export function parseMapTypeParam(value: string | null | undefined): MapUrlPlaceType | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if ((MAP_URL_PLACE_TYPES as readonly string[]).includes(normalized)) {
    return normalized as MapUrlPlaceType
  }
  return SPANISH_SLUG_TO_TYPE[normalized]
}
