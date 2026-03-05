import React from "react"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { getCityBySlug } from "@/lib/seo/cities"
import { getTopPlaces, getTopNeighborhoods } from "@/lib/seo/places"
import { getTopRankingTitle, getTopRankingDescription } from "@/lib/seo/templates"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { PlaceCard } from "@/components/place-card"
import type { PlaceSEO } from "@/lib/seo/places"

export const dynamicParams = true
export const dynamic = "force-dynamic"
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudadSlug: string }>
}): Promise<Metadata> {
  const { ciudadSlug } = await params
  const city = getCityBySlug(ciudadSlug)
  if (!city) return { title: "No encontrado" }

  return {
    title: getTopRankingTitle(city),
    description: getTopRankingDescription(city),
  }
}

export default async function TopSinGlutenPage({
  params,
}: {
  params: Promise<{ ciudadSlug: string }>
}) {
  const { ciudadSlug } = await params
  const city = getCityBySlug(ciudadSlug)
  if (!city) notFound()

  const [topPlaces, topNeighborhoods] = await Promise.all([
    getTopPlaces(ciudadSlug, 24),
    getTopNeighborhoods(ciudadSlug),
  ])

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
    }) as unknown as React.ComponentProps<typeof PlaceCard>["place"]

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: city.name, href: `/sin-gluten/${ciudadSlug}` },
          { label: "Top lugares" },
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-2">
        Top lugares sin gluten en {city.name}
      </h1>
      <p className="text-muted-foreground mb-6">
        Los mejores lugares recomendados por la comunidad celiaca.
      </p>

      {topNeighborhoods.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Barrios con mas opciones</h2>
          <div className="flex flex-wrap gap-2">
            {topNeighborhoods.map((n) => (
              <Link
                key={n.name}
                href={`/sin-gluten/${ciudadSlug}?barrio=${encodeURIComponent(n.name)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-sm"
              >
                {n.name} ({n.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topPlaces.map((p) => (
            <PlaceCard key={p._id} place={placeForCard(p)} />
          ))}
        </div>
      </section>

      {topPlaces.length === 0 && (
        <p className="text-muted-foreground">No hay lugares registrados aun en {city.name}.</p>
      )}
    </div>
  )
}
