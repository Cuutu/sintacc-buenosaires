export type GeoSearchCountry = "ar" | "br" | "uy"

const CABA_CENTER = { latitude: -34.6037, longitude: -58.3816 }
const RIO_CENTER = { latitude: -22.9068, longitude: -43.1729 }
const MONTEVIDEO_CENTER = { latitude: -34.9011, longitude: -56.1645 }

const BR_HINT =
  /\b(brasil|brazil|brasile|búzios|buzios|rio de janeiro|s[aã]o paulo|copacabana|ipanema|florian[oó]polis|arma[cç][aã]o|niter[oó]i|cabo frio|paraty|salvador|recife|fortaleza|belo horizonte|curitiba|porto alegre|minas gerais|gramado|cambori[uú]|bras[ií]lia|\brj\b|\brua\b)\b/i

const UY_HINT =
  /\b(uruguay|montevideo|punta del este|colonia del sacramento|maldonado)\b/i

export function inferGeoSearchCountry(input: string): GeoSearchCountry | "all" {
  const text = input.trim()
  if (!text) return "all"
  if (BR_HINT.test(text)) return "br"
  if (UY_HINT.test(text)) return "uy"
  return "all"
}

function centerForCountry(country: GeoSearchCountry | "all"): {
  latitude: number
  longitude: number
} {
  if (country === "br") return RIO_CENTER
  if (country === "uy") return MONTEVIDEO_CENTER
  return CABA_CENTER
}

/** Sesgo de ranking. Sin includedRegionCodes: busca en todo el mundo. */
export function googleAutocompleteLocationOptions(input: string): {
  locationBias: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number
    }
  }
} {
  const country = inferGeoSearchCountry(input)
  const radius = country === "br" ? 600_000 : country === "uy" ? 250_000 : 120_000
  return {
    locationBias: {
      circle: { center: centerForCountry(country), radius },
    },
  }
}

/** Geocoding clásico: region = sesgo, nunca filtro duro de país. */
export function googleGeocodeQueryOptions(address: string): {
  region?: string
} {
  const country = inferGeoSearchCountry(address)
  if (country === "br") return { region: "br" }
  if (country === "uy") return { region: "uy" }
  return { region: "ar" }
}

/** Mapbox country omitido = mundial. */
export function mapboxProximityParam(input: string): string {
  const center = centerForCountry(inferGeoSearchCountry(input))
  return `${center.longitude},${center.latitude}`
}

export function googleTextSearchRegionCode(input: string): string | undefined {
  const country = inferGeoSearchCountry(input)
  if (country === "br") return "BR"
  if (country === "uy") return "UY"
  return undefined
}

export function googleTextSearchCenter(input: string): {
  latitude: number
  longitude: number
} {
  return centerForCountry(inferGeoSearchCountry(input))
}

/** Sufijo de búsqueda IA: no forzar Buenos Aires. */
export function researchLocationSuffix(query: string): string | null {
  const country = inferGeoSearchCountry(query)
  if (country === "br") return "Brasil"
  if (country === "uy") return "Uruguay"
  return null
}

export function withGeoSearchSuffix(parts: string[]): string {
  const joined = parts.filter(Boolean).join(" ").trim()
  const suffix = researchLocationSuffix(joined)
  if (!suffix) return joined
  if (joined.toLowerCase().includes(suffix.toLowerCase())) return joined
  return `${joined} ${suffix}`.trim()
}
