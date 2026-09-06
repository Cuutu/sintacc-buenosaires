import type { PlaceSEO } from "@/lib/seo/places"

/** Payload mínimo para PlaceCard: incluye slug (mismo que sitemap). */
export function placeSeoToCardPlace(p: PlaceSEO) {
  return {
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
}
