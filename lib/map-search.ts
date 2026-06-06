import { NEIGHBORHOODS } from "@/lib/constants"
import { CITIES } from "@/lib/seo/cities"

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

const KNOWN_NEIGHBORHOODS = Array.from(
  new Set([
    ...NEIGHBORHOODS.filter((neighborhood) => neighborhood !== "Otro"),
    ...CITIES.flatMap((city) => city.neighborhoods),
  ])
)

export function findKnownNeighborhoodSearch(search: string): string | null {
  const normalizedSearch = normalizeSearchValue(search)
  if (!normalizedSearch) return null

  return (
    KNOWN_NEIGHBORHOODS.find(
      (neighborhood) => normalizeSearchValue(neighborhood) === normalizedSearch
    ) ?? null
  )
}
