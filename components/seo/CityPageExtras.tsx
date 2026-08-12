import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { City } from "@/lib/seo/cities"
import type { CityPageStats, CityRecentReview } from "@/lib/seo/places"
import type { Guide } from "@/lib/seo/guides"
import { CELIMAP_SAFETY_DISCLAIMER } from "@/lib/seo/brand"
import { TrackAnalyticsClick } from "@/components/analytics/TrackAnalyticsClick"

type RelatedList = {
  id: string
  name: string
  placeCount: number
}

type CityPageExtrasProps = {
  city: City
  stats: CityPageStats
  recentReviews: CityRecentReview[]
  relatedLists: RelatedList[]
  relatedGuides: Guide[]
  nearbyCities: { slug: string; name: string }[]
}

export function CityPageExtras({
  city,
  stats,
  recentReviews,
  relatedLists,
  relatedGuides,
  nearbyCities,
}: CityPageExtrasProps) {
  const updatedLabel = stats.lastUpdated
    ? new Intl.DateTimeFormat("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(stats.lastUpdated)
    : null

  return (
    <div className="mt-12 space-y-10">
      <section aria-labelledby="city-stats">
        <h2 id="city-stats" className="mb-3 text-xl font-semibold">
          Resumen en {city.name}
        </h2>
        <ul className="grid gap-3 text-sm sm:grid-cols-3">
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="text-muted-foreground">Lugares en el mapa</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </li>
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="text-muted-foreground">100% libre de gluten</p>
            <p className="text-2xl font-semibold">{stats.dedicatedGf}</p>
          </li>
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="text-muted-foreground">Con opciones sin TACC</p>
            <p className="text-2xl font-semibold">{stats.gfOptions}</p>
          </li>
        </ul>
        {updatedLabel && (
          <p className="mt-3 text-sm text-muted-foreground">
            Datos actualizados:{" "}
            <time dateTime={stats.lastUpdated!.toISOString()}>{updatedLabel}</time>
          </p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">{CELIMAP_SAFETY_DISCLAIMER}</p>
        <p className="mt-2 text-sm">
          <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
            Cómo trabajamos la información
          </Link>
          {" · "}
          <Link href="/guias" className="text-primary hover:underline">
            Guías para celíacos
          </Link>
        </p>
      </section>

      {stats.categories.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Categorías en {city.name}</h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {stats.categories.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/sin-gluten/${city.slug}/${cat.slug}`}
                  className="text-primary hover:underline"
                >
                  {cat.name} ({cat.count})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.neighborhoods.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Barrios o zonas con lugares</h2>
          <ul className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {stats.neighborhoods.map((n) => (
              <li key={n.name}>
                <Link
                  href={`/sin-gluten/${city.slug}?barrio=${encodeURIComponent(n.name)}`}
                  className="text-primary hover:underline"
                >
                  {n.name} ({n.count})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentReviews.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Reseñas recientes</h2>
          <ul className="space-y-3">
            {recentReviews.map((r, i) => (
              <li
                key={`${r.placePath}-${i}`}
                className="rounded-xl border border-border bg-card p-4 text-sm"
              >
                <p className="font-medium">
                  <Link href={r.placePath} className="text-primary hover:underline">
                    {r.placeName}
                  </Link>{" "}
                  · {r.rating}/5
                </p>
                {r.comment ? (
                  <p className="mt-1 line-clamp-3 text-muted-foreground">{r.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {relatedLists.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Listas públicas relacionadas</h2>
          <ul className="space-y-2 text-sm">
            {relatedLists.map((list) => (
              <li key={list.id}>
                <Link href={`/listas/${list.id}`} className="text-primary hover:underline">
                  {list.name}
                </Link>{" "}
                <span className="text-muted-foreground">({list.placeCount} lugares)</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {relatedGuides.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Guías relacionadas</h2>
          <ul className="space-y-2 text-sm">
            {relatedGuides.map((g) => (
              <li key={g.slug}>
                <Link href={`/guias/${g.slug}`} className="text-primary hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nearbyCities.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Otras ciudades</h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {nearbyCities.map((c) => (
              <li key={c.slug}>
                <Link href={`/sin-gluten/${c.slug}`} className="text-primary hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 text-lg font-semibold">¿Falta un lugar en {city.name}?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Recomendá un local y ayudá a otras personas celíacas a encontrarlo en el mapa.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <TrackAnalyticsClick
              event="suggest_place_click"
              properties={{ city: city.slug }}
              href="/sugerir"
            >
              Recomendar un lugar
            </TrackAnalyticsClick>
          </Button>
          <Button asChild variant="outline">
            <TrackAnalyticsClick
              event="city_to_map_click"
              properties={{ city: city.slug }}
              href="/mapa"
            >
              Ver en el mapa
            </TrackAnalyticsClick>
          </Button>
        </div>
      </section>
    </div>
  )
}
