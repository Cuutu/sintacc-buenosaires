const MAX_SLUG_LENGTH = 90

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
  const existing = await Place.find(
    { slug: new RegExp(`^${escapedBase}(?:-[0-9]+)?$`) },
    { _id: 1, slug: 1 }
  ).lean()

  const currentId = currentPlaceId?.toString()
  const used = new Set(
    existing
      .filter((place) => place._id.toString() !== currentId)
      .map((place) => place.slug)
      .filter(Boolean)
  )

  if (!used.has(base)) return base

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}
