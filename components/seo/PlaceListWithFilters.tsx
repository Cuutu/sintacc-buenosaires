import Link from "next/link"
import { PlaceCard } from "@/components/place-card"
import type { PlaceSEO } from "@/lib/seo/places"
import { CATEGORIES } from "@/lib/seo/cities"

interface PlaceListWithFiltersProps {
  places: PlaceSEO[]
  citySlug: string
  cityName: string
  currentCategory?: string
  topNeighborhoods?: { name: string; count: number }[]
  basePath?: string
}

export function PlaceListWithFilters({
  places,
  citySlug,
  cityName,
  currentCategory,
  topNeighborhoods = [],
  basePath = "/sin-gluten",
}: PlaceListWithFiltersProps) {
  const placeForCard = (p: PlaceSEO) =>
    ({
      _id: p._id,
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
    }) as unknown as Parameters<typeof PlaceCard>[0]["place"]

  return (
    <div className="space-y-8">
      {topNeighborhoods.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Barrios con más opciones sin gluten</h2>
          <div className="flex flex-wrap gap-2">
            {topNeighborhoods.map((n) => (
              <Link
                key={n.name}
                href={`${basePath}/${citySlug}?barrio=${encodeURIComponent(n.name)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-sm"
              >
                {n.name} ({n.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      {!currentCategory && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Ver también</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.slug !== "otros").map((cat) => (
              <Link
                key={cat.slug}
                href={citySlug ? `${basePath}/${citySlug}/${cat.slug}` : `/${cat.slug}-sin-gluten`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium"
              >
                {cat.emoji} {cat.name} sin gluten
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">
          {currentCategory
            ? `${CATEGORIES.find((c) => c.slug === currentCategory)?.name ?? currentCategory} en ${cityName}`
            : `Lugares en ${cityName}`}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((p) => (
            <PlaceCard key={p._id} place={placeForCard(p)} />
          ))}
        </div>
      </section>
    </div>
  )
}
