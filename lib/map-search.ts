import { NEIGHBORHOODS } from "@/lib/constants"
import { CITIES } from "@/lib/seo/cities"

export function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

const NEIGHBORHOOD_SEARCH_ALIASES: Record<string, string[]> = {
  Recoleta: ["Barrio Norte", "La Isla"],
}

const KNOWN_NEIGHBORHOODS = Array.from(
  new Set([
    ...NEIGHBORHOODS.filter((neighborhood) => neighborhood !== "Otro"),
    ...CITIES.flatMap((city) => city.neighborhoods),
    ...Object.keys(NEIGHBORHOOD_SEARCH_ALIASES),
    ...Object.values(NEIGHBORHOOD_SEARCH_ALIASES).flat(),
  ])
)

function findCanonicalNeighborhood(search: string): string | null {
  const normalizedSearch = normalizeSearchValue(search)
  if (!normalizedSearch) return null

  for (const [canonical, aliases] of Object.entries(NEIGHBORHOOD_SEARCH_ALIASES)) {
    const values = [canonical, ...aliases]
    if (values.some((value) => normalizeSearchValue(value) === normalizedSearch)) {
      return canonical
    }
  }

  return (
    KNOWN_NEIGHBORHOODS.find(
      (neighborhood) => normalizeSearchValue(neighborhood) === normalizedSearch
    ) ?? null
  )
}

export function findKnownNeighborhoodSearch(search: string): string | null {
  return findCanonicalNeighborhood(search)
}

export function getNeighborhoodSearchValues(neighborhood: string): string[] {
  const canonical = findCanonicalNeighborhood(neighborhood) ?? neighborhood.trim()
  if (!canonical) return []

  return Array.from(
    new Set([
      canonical,
      ...(NEIGHBORHOOD_SEARCH_ALIASES[canonical] ?? []),
    ])
  )
}
