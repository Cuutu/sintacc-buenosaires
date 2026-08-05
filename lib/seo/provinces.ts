/**
 * Configuración canónica de las 24 jurisdicciones argentinas.
 *
 * Jerarquía geográfica:
 *   province = provincia/jurisdicción (slug normalizado)
 *   locality = ciudad/localidad (slug normalizado)
 *   neighborhood = barrio (texto libre)
 *
 * Desambiguación por contexto de ruta:
 *   /sin-gluten/[ciudadSlug]     → se resuelve exclusivamente contra CITIES
 *   /sin-gluten/provincia/[slug] → se resuelve exclusivamente contra PROVINCES
 *
 * "Buenos Aires" a secas NO resuelve Provincia de Buenos Aires (ambiguo con CABA).
 * Solo resuelven señales inequívocas: "Provincia de Buenos Aires", "PBA",
 * "Buenos Aires Province", administrative_area_level_1, región de Mapbox/Google,
 * o coordenadas dentro de un polígono administrativo confiable.
 */

export interface ProvinceConfig {
  name: string
  slug: string
  aliases: string[]
  countryCode: "AR"
  /** Centro [lng, lat] y zoom para el mapa provincial */
  center?: [number, number]
  zoom?: number
}

const P = (name: string, slug: string, aliases: string[], center?: [number, number], zoom?: number): ProvinceConfig => ({
  name,
  slug,
  aliases,
  countryCode: "AR",
  ...(center ? { center } : {}),
  ...(zoom ? { zoom } : {}),
})

export const PROVINCES: ProvinceConfig[] = [
  P("Buenos Aires", "buenos-aires", ["Provincia de Buenos Aires", "PBA", "Buenos Aires Province"], [-58.4, -36.0], 6),
  P("Ciudad Autónoma de Buenos Aires", "caba", ["CABA", "Capital Federal", "Buenos Aires Ciudad", "Ciudad de Buenos Aires"], [-58.3816, -34.6037], 11),
  P("Catamarca", "catamarca", ["Provincia de Catamarca"]),
  P("Chaco", "chaco", ["Provincia del Chaco"]),
  P("Chubut", "chubut", ["Provincia del Chubut"]),
  P("Córdoba", "cordoba", ["Provincia de Córdoba"], [-64.1888, -31.4201], 7),
  P("Corrientes", "corrientes", ["Provincia de Corrientes"]),
  P("Entre Ríos", "entre-rios", ["Provincia de Entre Ríos"]),
  P("Formosa", "formosa", ["Provincia de Formosa"]),
  P("Jujuy", "jujuy", ["Provincia de Jujuy"]),
  P("La Pampa", "la-pampa", ["Provincia de La Pampa"]),
  P("La Rioja", "la-rioja", ["Provincia de La Rioja"]),
  P("Mendoza", "mendoza", ["Provincia de Mendoza"]),
  P("Misiones", "misiones", ["Provincia de Misiones"]),
  P("Neuquén", "neuquen", ["Provincia del Neuquén"]),
  P("Río Negro", "rio-negro", ["Provincia de Río Negro"]),
  P("Salta", "salta", ["Provincia de Salta"]),
  P("San Juan", "san-juan", ["Provincia de San Juan"]),
  P("San Luis", "san-luis", ["Provincia de San Luis"]),
  P("Santa Cruz", "santa-cruz", ["Provincia de Santa Cruz"]),
  P("Santa Fe", "santa-fe", ["Provincia de Santa Fe"]),
  P("Santiago del Estero", "santiago-del-estero", ["Provincia de Santiago del Estero"]),
  P("Tierra del Fuego", "tierra-del-fuego", ["Provincia de Tierra del Fuego", "Tierra del Fuego, Antártida e Islas del Atlántico Sur"]),
  P("Tucumán", "tucuman", ["Provincia de Tucumán", "Tucumán"], [-65.2226, -26.8241], 8),
]

const AMBIGUOUS_BUENOS_AIRES = "buenos aires"

const provinceBySlug = new Map(PROVINCES.map((p) => [p.slug, p]))

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function getProvinceBySlug(slug: string): ProvinceConfig | undefined {
  return provinceBySlug.get(slug)
}

/**
 * Córdoba es un slug provincial válido → devuelve true.
 * La desambiguación ciudad/provincia se hace por contexto de ruta, no por esta función.
 */
export function isProvincialSlug(slug: string): boolean {
  return provinceBySlug.has(slug)
}

export function getProvinceByName(name: string): ProvinceConfig | undefined {
  const normalized = normalize(name)
  if (!normalized || normalized === AMBIGUOUS_BUENOS_AIRES) return undefined
  return PROVINCES.find((p) => normalize(p.name) === normalized)
}

export function getProvinceByAlias(alias: string): ProvinceConfig | undefined {
  const normalized = normalize(alias)
  if (!normalized || normalized === AMBIGUOUS_BUENOS_AIRES) return undefined
  return PROVINCES.find((p) => p.aliases.some((a) => normalize(a) === normalized))
}

export function normalizeProvinceSlug(value: string): string | null {
  const normalized = normalize(value)
  if (!normalized) return null
  if (provinceBySlug.has(normalized)) return normalized
  const byName = getProvinceByName(value)
  if (byName) return byName.slug
  const byAlias = getProvinceByAlias(value)
  if (byAlias) return byAlias.slug
  return null
}

/**
 * Fallback controlado de parsing de dirección.
 * Nunca resuelve "Buenos Aires" ambiguo sin contexto adicional.
 * Es preferible NO resolver antes que asignar a una provincia incorrecta.
 */
export function resolveProvinceFromAddress(address: string): ProvinceConfig | undefined {
  const normalized = normalize(address)
  if (!normalized) return undefined

  // 1. Patrón explícito "provincia de X" / "X province"
  for (const p of PROVINCES) {
    const nameNorm = normalize(p.name)
    if (
      normalized.includes(`provincia de ${nameNorm}`) ||
      normalized.includes(`${nameNorm} province`)
    ) {
      return p
    }
  }

  // 2. Último segmento después de coma (formato "Calle X, Ciudad, Provincia")
  const segments = normalized
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  if (lastSegment) {
    if (lastSegment === AMBIGUOUS_BUENOS_AIRES) return undefined
    const byName = getProvinceByName(lastSegment)
    if (byName) return byName
    const byAlias = getProvinceByAlias(lastSegment)
    if (byAlias) return byAlias
  }

  return undefined
}