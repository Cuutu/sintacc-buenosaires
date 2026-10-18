import type { IPlace } from "@/models/Place"
import type { PlaceSEO } from "@/lib/seo/places"

/** Lo que recibe PlaceCard. Tipa con IPlace completo pero solo lee estos campos. */
export type CardPlace = IPlace & { stats?: PlaceSEO["stats"] }

/** Payload mínimo para PlaceCard: incluye slug (mismo que sitemap). */
export function placeSeoToCardPlace(p: PlaceSEO): CardPlace {
  const card = {
    _id: p._id,
    slug: p.slug ?? null,
    name: p.name,
    type: p.type,
    types: p.types,
    neighborhood: p.neighborhood,
    address: p.address ?? "",
    location: { lat: 0, lng: 0 },
    photos: p.photos ?? [],
    tags: p.tags ?? [],
    safetyLevel: p.safetyLevel,
    stats: p.stats,
  }
  return card as unknown as CardPlace
}
