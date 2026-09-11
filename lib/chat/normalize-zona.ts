import { CITIES } from "@/lib/seo/cities"
import { slugifyPlacePart } from "@/lib/place-slugs"
import { findKnownNeighborhoodSearch } from "@/lib/map-search"
import { normalizeProvinceSlug } from "@/lib/seo/provinces"

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const STATIC_ALIASES: Record<string, string> = {
  caba: "Buenos Aires",
  "capital federal": "Buenos Aires",
  "bs as": "Buenos Aires",
  baires: "Buenos Aires",
  "buenos aires ciudad": "Buenos Aires",
  "ciudad de buenos aires": "Buenos Aires",
  cba: "Córdoba",
  mdq: "Mar del Plata",
  mardel: "Mar del Plata",
  tucuman: "San Miguel de Tucumán",
  santiago: "Santiago del Estero",
}

function cityAliasMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [alias, name] of Object.entries(STATIC_ALIASES)) {
    map.set(alias, name)
  }
  for (const city of CITIES) {
    map.set(fold(city.name), city.name)
    map.set(fold(city.slug.replace(/-/g, " ")), city.name)
  }
  return map
}

const CITY_ALIASES = cityAliasMap()

/** Saca "capital", "ciudad de", CABA→Buenos Aires, tildes y alias de ciudades seed. */
export function normalizeChatZona(zona: string): string {
  const trimmed = zona.trim()
  if (!trimmed) return trimmed

  const withoutFiller = trimmed
    .replace(/\bciudad\s+aut[oó]noma\s+de\b/gi, " ")
    .replace(/\bciudad\s+de\b/gi, " ")
    .replace(/\bcapital\s+federal\b/gi, "CABA")
    .replace(/\bcapital\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  const folded = fold(withoutFiller || trimmed)
  const aliased = CITY_ALIASES.get(folded)
  if (aliased) return aliased

  const slug = slugifyPlacePart(withoutFiller || trimmed)
  const bySlug = CITIES.find((city) => city.slug === slug)
  if (bySlug) return bySlug.name

  return withoutFiller || trimmed
}

export function isCercaMioQuery(text: string): boolean {
  const folded = fold(text)
  return (
    /\bcerca\s+m[ií]o\b/.test(folded) ||
    /\bcerca\s+de\s+mi\b/.test(folded) ||
    /\bac[aá]\s+cerca\b/.test(folded)
  )
}

const WANT_WHOLE =
  /\b(toda|todo|da igual|cualquiera|indistinto|la ciudad entera|toda la provincia|toda la ciudad)\b/i

const EXTRA_DESTINOS: Record<string, string[]> = {
  cordoba: ["Villa General Belgrano", "La Cumbre"],
  mendoza: ["San Rafael"],
  salta: ["Cafayate"],
}

function findCityForZona(zona: string) {
  const foldedRaw = fold(zona)
  const normalized = normalizeChatZona(zona)
  const foldedNorm = fold(normalized)
  return CITIES.find(
    (city) => fold(city.name) === foldedNorm || fold(city.name) === foldedRaw || city.slug === foldedRaw.replace(/ /g, "-")
  )
}

/**
 * Ciudad/provincia a secas (viaje a Córdoba, CABA, Mendoza…).
 * Barrio, pueblo o "Güemes, Córdoba" no es amplio.
 */
export function isBroadChatZona(zona: string): boolean {
  const raw = zona.trim()
  if (!raw) return false
  if (WANT_WHOLE.test(raw)) return false

  const neighborhood = findKnownNeighborhoodSearch(raw)
  if (neighborhood) {
    const sameAsCity = CITIES.some((city) => fold(city.name) === fold(neighborhood))
    if (!sameAsCity) return false
  }

  const foldedRaw = fold(raw)
  const city = findCityForZona(raw)
  if (city) {
    let leftover = foldedRaw
      .replace(fold(city.name), " ")
      .replace(fold(city.slug.replace(/-/g, " ")), " ")
    for (const [alias, name] of Object.entries(STATIC_ALIASES)) {
      if (name === city.name) leftover = leftover.replace(fold(alias), " ")
    }
    leftover = leftover.replace(/\b(capital|ciudad)\b/g, " ").replace(/\s+/g, " ").trim()
    return leftover.length === 0
  }

  const provinceSlug = normalizeProvinceSlug(normalizeChatZona(raw)) || normalizeProvinceSlug(raw)
  if (!provinceSlug) return false
  const leftover = foldedRaw
    .replace(/\b(provincia|de)\b/g, " ")
    .replace(provinceSlug.replace(/-/g, " "), " ")
    .replace(/\s+/g, " ")
    .trim()
  return leftover.length === 0
}

export function suggestionsForBroadZona(zona: string): string[] {
  const city = findCityForZona(zona)
  if (!city) return []
  const skip = fold(city.name)
  const extra = EXTRA_DESTINOS[city.slug] ?? []
  return Array.from(
    new Set(
      [...city.neighborhoods, ...extra].filter((name) => fold(name) !== skip)
    )
  ).slice(0, 6)
}
