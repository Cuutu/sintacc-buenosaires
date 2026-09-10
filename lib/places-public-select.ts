/**
 * Campos de LISTADO público (mapa / cards / featured).
 * El detalle GET /api/places/[id] sigue rico (contact, hours, snapshot).
 *
 * Inclusión explícita: campos nuevos del schema no se filtran al JSON.
 */
export const PUBLIC_PLACE_LIST_SELECT = [
  "name",
  "type",
  "types",
  "address",
  "neighborhood",
  "province",
  "locality",
  "slug",
  "location",
  "addressText",
  "userProvidedNeighborhood",
  "userProvidedReference",
  "tags",
  "photos",
  "photoSource",
  "status",
  "safetyLevel",
  "featured",
  "featuredOrder",
  "googlePlaceId",
  "openingHours",
  "googleSnapshot.rating",
  "googleSnapshot.userRatingCount",
  "createdAt",
].join(" ")

/** Detalle público: sin blobs internos de admin/IA. */
export const PUBLIC_PLACE_DETAIL_SELECT = ["-editLog", "-aiEnrichment", "-googleSync"].join(" ")

export type PublicPlaceListStats = {
  avgRating: number
  totalReviews: number
  contaminationReportsCount: number
}

type PlaceListSource = {
  _id: unknown
  name?: string
  type?: string
  types?: string[]
  address?: string
  neighborhood?: string
  province?: string
  locality?: string
  slug?: string
  location?: { lat?: number; lng?: number }
  addressText?: string
  userProvidedNeighborhood?: string
  userProvidedReference?: string
  tags?: string[]
  photos?: string[]
  photoSource?: string
  status?: string
  safetyLevel?: string
  featured?: boolean
  featuredOrder?: number
  googlePlaceId?: string
  openingHours?: string
  googleSnapshot?: { rating?: number; userRatingCount?: number } | null
  createdAt?: Date | string
}

export function toPublicPlaceListItem(
  place: PlaceListSource,
  stats: PublicPlaceListStats
) {
  const photos = Array.isArray(place.photos)
    ? place.photos.filter((url) => typeof url === "string" && url.trim()).slice(0, 1)
    : []

  return {
    _id: place._id,
    name: place.name,
    type: place.type,
    types: place.types,
    address: place.address,
    neighborhood: place.neighborhood,
    province: place.province,
    locality: place.locality,
    slug: place.slug,
    location: place.location,
    addressText: place.addressText,
    userProvidedNeighborhood: place.userProvidedNeighborhood,
    userProvidedReference: place.userProvidedReference,
    tags: place.tags,
    photos,
    photoSource: place.photoSource,
    status: place.status,
    safetyLevel: place.safetyLevel,
    featured: place.featured,
    featuredOrder: place.featuredOrder,
    googlePlaceId: place.googlePlaceId,
    openingHours: place.openingHours,
    googleSnapshot: place.googleSnapshot
      ? {
          rating: place.googleSnapshot.rating,
          userRatingCount: place.googleSnapshot.userRatingCount,
        }
      : undefined,
    createdAt: place.createdAt,
    stats,
  }
}
