import { CITIES } from "@/lib/seo/cities"
import { slugifyPlacePart } from "@/lib/place-slugs"

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
