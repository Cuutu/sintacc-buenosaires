type PlaceUrlInput = {
  _id: { toString(): string } | string
  slug?: string | null
}

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

export function isIndexablePlaceSlug(slug?: string | null): boolean {
  const value = slug?.trim()
  if (!value) return false
  return !OBJECT_ID_RE.test(value)
}

export function getPlacePath(place: PlaceUrlInput): string {
  return `/lugar/${place.slug || place._id.toString()}`
}
