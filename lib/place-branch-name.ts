import { normalizeSearchValue } from "@/lib/map-search"

/**
 * Sucursales con el mismo nombre (Celigourmet x4, Campobravo…): en una lista o en el
 * mapa se veían iguales. Si un nombre se repite en lo que se está mostrando, al lado
 * del nombre va el barrio o la ciudad (revisión 23/10).
 */
export function branchNameKey(name: string | null | undefined): string {
  return normalizeSearchValue(name ?? "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Nombres (normalizados) que aparecen dos o más veces en la lista. */
export function findRepeatedNames(places: Array<{ name?: string | null }>): Set<string> {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const place of places) {
    const key = branchNameKey(place.name)
    if (!key) continue
    if (seen.has(key)) repeated.add(key)
    else seen.add(key)
  }
  return repeated
}

/** El barrio o la ciudad para mostrar junto al nombre, o null si el nombre no se repite. */
export function branchAreaFor(
  place: { name?: string | null },
  area: string | null | undefined,
  repeated: ReadonlySet<string>
): string | null {
  if (repeated.size === 0) return null
  const cleanArea = (area ?? "").trim()
  if (!cleanArea) return null
  const key = branchNameKey(place.name)
  if (!key || !repeated.has(key)) return null
  // "Palermo Soho" ya dice el barrio: no repetirlo.
  if (key.includes(branchNameKey(cleanArea))) return null
  return cleanArea
}
