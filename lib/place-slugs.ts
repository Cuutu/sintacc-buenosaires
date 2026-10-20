const MAX_SLUG_LENGTH = 90
/** Cuántos slugs viejos se guardan por lugar (los más recientes primero). */
export const MAX_PREVIOUS_SLUGS = 10

export function slugifyPlacePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function buildPlaceSlug(name: string, neighborhood: string): string {
  const base = [name, neighborhood]
    .map(slugifyPlacePart)
    .filter(Boolean)
    .join("-")

  return (base || "lugar").slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "")
}

export async function generateUniquePlaceSlug(
  name: string,
  neighborhood: string,
  currentPlaceId?: string | { toString(): string }
): Promise<string> {
  const { Place } = await import("../models/Place")
  const base = buildPlaceSlug(name, neighborhood)
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`^${escapedBase}(?:-[0-9]+)?$`)
  // Los slugs viejos de otros lugares también están ocupados: siguen redirigiendo a su ficha.
  const existing = await Place.find(
    { $or: [{ slug: pattern }, { previousSlugs: pattern }] },
    { _id: 1, slug: 1, previousSlugs: 1 }
  ).lean()

  const currentId = currentPlaceId?.toString()
  const used = new Set(
    existing
      .filter((place) => place._id.toString() !== currentId)
      .flatMap((place) => [place.slug, ...(place.previousSlugs ?? [])])
      .filter(Boolean)
  )

  if (!used.has(base)) return base

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

/**
 * Historial de slugs al renombrar: el viejo queda primero, sin repetidos y sin
 * el slug nuevo (volver a un nombre anterior lo saca del historial). Si el slug
 * no cambia, devuelve el historial tal cual.
 */
export function nextPreviousSlugs(
  current: string[] | undefined | null,
  oldSlug: string | undefined | null,
  newSlug: string | undefined | null
): string[] | undefined {
  const history = current ?? []
  if (!oldSlug || !newSlug || oldSlug === newSlug) return current ?? undefined
  const next = [oldSlug, ...history].filter((slug, i, all) => slug && slug !== newSlug && all.indexOf(slug) === i)
  return next.slice(0, MAX_PREVIOUS_SLUGS)
}
