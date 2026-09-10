/**
 * Campos de LISTADO público de emprendimientos.
 * El detalle GET /api/ventures/[id] sigue con contact / description.
 */
export const PUBLIC_VENTURE_LIST_SELECT = [
  "name",
  "slug",
  "category",
  "zone",
  "modalities",
  "safetyLevel",
  "photos",
  "status",
  "certifiedProducts",
  "createdAt",
].join(" ")

type VentureListSource = {
  _id: unknown
  name?: string
  slug?: string
  category?: string
  zone?: string
  modalities?: string[]
  safetyLevel?: string
  photos?: string[]
  status?: string
  certifiedProducts?: boolean
  createdAt?: Date | string
}

export function toPublicVentureListItem(
  venture: VentureListSource,
  stats: { avgRating: number; totalReviews: number }
) {
  const photos = Array.isArray(venture.photos)
    ? venture.photos.filter((url) => typeof url === "string" && url.trim()).slice(0, 1)
    : []

  return {
    _id: venture._id,
    name: venture.name,
    slug: venture.slug ?? (venture._id != null ? String(venture._id) : undefined),
    category: venture.category,
    zone: venture.zone,
    modalities: venture.modalities ?? [],
    safetyLevel: venture.safetyLevel,
    photos,
    status: venture.status,
    certifiedProducts: venture.certifiedProducts,
    createdAt: venture.createdAt,
    stats,
  }
}
