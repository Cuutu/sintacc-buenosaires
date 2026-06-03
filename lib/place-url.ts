type PlaceUrlInput = {
  _id: { toString(): string } | string
  slug?: string | null
}

export function getPlacePath(place: PlaceUrlInput): string {
  return `/lugar/${place.slug || place._id.toString()}`
}
